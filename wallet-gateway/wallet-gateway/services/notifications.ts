import {
    DEFAULT_PUSH_NOTIFICATION_IMAGE,
    FirestoreCollection,
    NotificationID,
    Notification_Firestore,
    PushMessageRecieptID,
    PushNotificationPackage,
    PushNotificationShape,
    PushTokenID,
    PushToken_Firestore,
    UserID,
} from '@milkshakechat/helpers';
import { createFirestoreDoc, createFirestoreTimestamp, updateFirestoreDoc } from './firestore';
import { v4 as uuidv4 } from 'uuid';
import { firestore } from './firebase';
import { QueryDocumentSnapshot, Query } from 'firebase-admin/firestore';
import axios from 'axios';
import { getFCMServerKey } from '../utils/secrets';

interface SendNotificationToUserProps {
    recipientUserID: UserID;
    shouldPush: boolean;
    notification: PushNotificationShape;
    metadataNote?: string;
}
export const sendNotificationToUser = async ({
    recipientUserID,
    shouldPush,
    notification,
    metadataNote = '',
}: SendNotificationToUserProps) => {
    let pushReciepts: PushMessageRecieptID[] = [];
    // handle fcm push first
    if (shouldPush) {
        pushReciepts = await sendPushNotificationToUserDevices({
            userID: recipientUserID,
            notification,
        });
    }
    const notifID = uuidv4() as NotificationID;
    const notif: Notification_Firestore = {
        id: notifID,
        recipientID: recipientUserID,
        title: notification.data.title,
        body: notification.data.body,
        image: notification.data.image || DEFAULT_PUSH_NOTIFICATION_IMAGE,
        route: notification.data.route,
        metadataNote,
        createdAt: createFirestoreTimestamp(),
        markedRead: false,
    };
    if (pushReciepts && pushReciepts.length > 0) {
        notif.pushMessageRecieptIDs = pushReciepts;
    }
    // save notification to firestore
    console.log(`Saving notification to firestore...`);
    await createFirestoreDoc<NotificationID, Notification_Firestore>({
        id: notifID,
        data: notif,
        collection: FirestoreCollection.NOTIFICATIONS,
    });
    // publish to websocket subscription for clients
    console.log(`TODO: Publishing notification to websocket subscription...`);
};

interface SendPushNotificationToUserDevicesProps {
    userID: UserID;
    notification: PushNotificationShape;
}
export const sendPushNotificationToUserDevices = async ({
    userID,
    notification,
}: SendPushNotificationToUserDevicesProps) => {
    const targets = await listActivePushTargets(userID);
    console.log(`Got ${targets.length} push targets for user ${userID}`);
    const reciepts = await Promise.all(
        targets.map((target) => {
            const fullPackage = {
                to: target.id,
                ...notification,
                data: {
                    ...notification.data,
                    icon: notification.data.icon || DEFAULT_PUSH_NOTIFICATION_IMAGE,
                    tag: notification.data.route,
                },
            };
            if (notification.data.image) {
                fullPackage.data.image = notification.data.image;
            }
            return sendPushNotification(fullPackage);
        }),
    );
    const pushReciepts = reciepts.flat();
    return pushReciepts;
};

const listActivePushTargets = async (userID: UserID): Promise<PushToken_Firestore[]> => {
    const ref = firestore
        .collection(FirestoreCollection.PUSH_TOKENS)
        .where('userID', '==', userID)
        .where('active', '==', true) as Query<PushToken_Firestore>;
    const collectionItems = await ref.get();
    if (collectionItems.empty) {
        return [];
    } else {
        return collectionItems.docs.map((doc: QueryDocumentSnapshot<PushToken_Firestore>) => {
            const data = doc.data();
            return data;
        });
    }
};

export const sendPushNotification = async (notification: PushNotificationPackage) => {
    console.log(`Sending push...`);
    try {
        const key = await getFCMServerKey();
        const res = await axios.post('https://fcm.googleapis.com/fcm/send', notification, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `key=${key}`,
            },
        });
        if (res.data.failure) {
            console.log(`Got a failed push notification response`);
            const shouldDeactivateToken =
                res.data.results.some((result: any) => result.error === 'NotRegistered') &&
                res.data.failure === 1 &&
                res.data.success === 0;
            if (shouldDeactivateToken) {
                console.log(`Deactivating token ${notification.to}`);
                await deactivatePushToken({
                    token: notification.to,
                });
                return [];
            }
        }
        if (res.data.success) {
            console.log(`Successful push notification response`);
            const message_ids: PushMessageRecieptID[] = res.data.results
                .map((result: any) => result.message_id)
                .filter((mid: string | undefined) => mid) as PushMessageRecieptID[];
            return message_ids;
        }
        return [];
    } catch (e) {
        console.log(e);
        return [];
    }
};

interface DeactivatePushTokenProps {
    token: PushTokenID;
    userID?: UserID;
}
export const deactivatePushToken = async ({ token, userID }: DeactivatePushTokenProps) => {
    await updateFirestoreDoc({
        id: token,
        payload: {
            active: false,
        },
        collection: FirestoreCollection.PUSH_TOKENS,
    });
    return `Successfully deactivated push token ${token} for user ${userID}`;
};
