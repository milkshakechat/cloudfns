import {
  ChatRoomID,
  ChatRoom_Firestore,
  DEFAULT_PUSH_NOTIFICATION_IMAGE,
  FirestoreCollection,
  PushMessageRecieptID,
  PushNotificationPackage,
  PushTokenID,
  PushToken_Firestore,
  SendBirdChannelURL,
  TimestampFirestore,
  UserID,
} from "@milkshakechat/helpers";

import * as admin from "firebase-admin";
import { Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { createFirestoreTimestamp, updateFirestoreDoc } from "./firestore";
import { getFCMServerKey } from "../utils/secrets";
import axios from "axios";
import { SubscribedEventGroupChannelMessageSend } from "../functions/sendbirdPushNotifications.webhook";
import { Message } from "firebase-admin/lib/messaging/messaging-api";

export const handleSendBirdToFCM = async ({
  channelUrl,
  payload,
}: {
  channelUrl: SendBirdChannelURL;
  payload: SubscribedEventGroupChannelMessageSend;
}) => {
  console.log("----> handleSendBirdToFCM");
  console.log(`sendBirdChannelURL == ${channelUrl}`);
  const firestore = admin.firestore();
  const ref = firestore
    .collection(FirestoreCollection.CHAT_ROOMS)
    .where("sendBirdChannelURL", "==", channelUrl) as Query<ChatRoom_Firestore>;

  const collectionItems = await ref.get();
  console.log(
    `Got ${collectionItems.size} chat rooms.
    collectionItems.empty = ${collectionItems.empty}`
  );
  let chatRooms: ChatRoom_Firestore[] = [];
  if (collectionItems.empty) {
    chatRooms = [];
  } else {
    collectionItems.docs.map(
      (doc: QueryDocumentSnapshot<ChatRoom_Firestore>) => {
        const data = doc.data();
        chatRooms.push(data);
      }
    );
  }
  const chatRoom = chatRooms[0];
  console.log(`chatRoom == ${chatRoom.sendBirdChannelURL}`);
  // console.log("sendBirdPushNotifConfig", chatRoom.sendBirdPushNotifConfig);
  if (!chatRoom) {
    throw new Error(`No chat rooms found for channelUrl: ${channelUrl}`);
  }
  if (!chatRoom.sendBirdPushNotifConfig) {
    return;
  }
  // Check which users want push notifications
  const pushStatusOfUsers = await Promise.all(
    Object.keys(chatRoom.sendBirdPushNotifConfig)
      .filter((userID) => {
        // exclude self user
        return userID !== payload.sender.user_id;
      })
      .map(async (userID) => {
        if (
          chatRoom.sendBirdPushNotifConfig &&
          chatRoom.sendBirdPushNotifConfig[userID as UserID]
        ) {
          const config = chatRoom.sendBirdPushNotifConfig[userID as UserID];
          console.log("config.allowPush", config.allowPush);
          if (config.allowPush) {
            // proceed to handle the push notif
            return {
              userID,
              proceedPush: true,
            };
          }
          console.log(
            `isPastSnoozeTime(config.snoozeUntil) = ${isPastSnoozeTime(
              config.snoozeUntil
            )}`
          );
          if (isPastSnoozeTime(config.snoozeUntil)) {
            // remove the snooze & proceed to handle the push notif
            await updateFirestoreDoc<ChatRoomID, ChatRoom_Firestore>({
              id: chatRoom.id,
              payload: {
                ...chatRoom,
                sendBirdPushNotifConfig: {
                  ...chatRoom.sendBirdPushNotifConfig,
                  [userID as UserID]: {
                    ...chatRoom.sendBirdPushNotifConfig[userID as UserID],
                    snoozeUntil: createFirestoreTimestamp(new Date(0)),
                    allowPush: true,
                  },
                },
              },
              collection: FirestoreCollection.CHAT_ROOMS,
            });
            return {
              userID,
              proceedPush: true,
            };
          }
        }
        return {
          userID,
          proceedPush: false,
        };
      })
  );
  console.log(`${pushStatusOfUsers.length} pushStatusOfUsers`);
  const authorizedPushUsers = pushStatusOfUsers
    .filter((user) => user.proceedPush)
    .map((u) => u.userID as UserID);
  console.log(`${authorizedPushUsers.length} authorizedPushUsers`);
  // Query FirestoreCollection.PUSH_TOKENS to set the push notification destination
  const pushTokensNest = await Promise.all(
    authorizedPushUsers.map(async (userID) => {
      console.log(`Grabbing push tokens for user ${userID}`);
      const pushTokensRef = firestore
        .collection(FirestoreCollection.PUSH_TOKENS)
        .where("userID", "==", userID)
        .where("active", "==", true) as Query<PushToken_Firestore>;
      const pushTokens = await pushTokensRef.get();
      if (pushTokens.empty) {
        return [];
      }
      return pushTokens.docs.map((doc) => {
        const data = doc.data();
        return data;
      });
    })
  );
  const pushTokens = pushTokensNest.flatMap((x) => x);
  console.log(`Firing the push notifications to ${pushTokens.length} targets`);
  const clickToRoute = `/app/chat?chat=${chatRoom.id}`;
  const packages: Message[] = pushTokens.map((pushToken) => {
    const fullPackage = {
      token: pushToken.token,
      data: {
        icon: payload.sender.profile_url || DEFAULT_PUSH_NOTIFICATION_IMAGE,
        tag: clickToRoute,
        title: `${payload.sender.nickname} sent a message`,
        body: payload.payload.message,
        // image: payload.sender.profile_url,
        route: clickToRoute,
      },
    };
    return fullPackage;
  });
  const bulkSendReciepts = await admin.messaging().sendEach(packages);
  console.log(
    `bulkSendReciepts.successCount = ${bulkSendReciepts.successCount}, bulkSendReciepts.failureCount = ${bulkSendReciepts.failureCount}`
  );
  // const bulkSendReciepts = await getMessaging(firebaseApp).sendAll(messages);
  // await Promise.all(
  //   pushTokens.map(async (pushToken) => {
  //     const fullPackage = {
  //       to: pushToken.token,
  //       data: {
  //         icon: payload.sender.profile_url || DEFAULT_PUSH_NOTIFICATION_IMAGE,
  //         tag: clickToRoute,
  //         title: `${payload.sender.nickname} sent a message`,
  //         body: payload.payload.message,
  //         // image: payload.sender.profile_url,
  //         route: clickToRoute,
  //       },
  //     };
  //     return sendPushNotification(fullPackage);
  //   })
  // );
  return;
};

export const sendPushNotification = async (
  notification: PushNotificationPackage
) => {
  console.log("Sending push...");
  try {
    const key = await getFCMServerKey();
    const res = await axios.post(
      "https://fcm.googleapis.com/fcm/send",
      notification,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${key}`,
        },
      }
    );
    if (res.data.failure) {
      console.log("Got a failed push notification response");
      const shouldDeactivateToken =
        res.data.results.some(
          (result: any) => result.error === "NotRegistered"
        ) &&
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
      console.log("Successful push notification response");
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

function isPastSnoozeTime(snoozeUntil: TimestampFirestore): boolean {
  const snoozeUntilDate = (snoozeUntil as any).toDate();
  const now = new Date();

  return snoozeUntilDate <= now;
}

interface DeactivatePushTokenProps {
  token: PushTokenID;
  userID?: UserID;
}
export const deactivatePushToken = async ({
  token,
  userID,
}: DeactivatePushTokenProps) => {
  await updateFirestoreDoc({
    id: token,
    payload: {
      active: false,
    },
    collection: FirestoreCollection.PUSH_TOKENS,
  });
  return `Successfully deactivated push token ${token} for user ${userID}`;
};
