import {
    ChatLogID,
    ChatRoom_Firestore,
    FirestoreCollection,
    PartialSendbirdChannel,
    SYSTEM_MESSAGE_USER_ID,
    SendBirdChannelURL,
    UserID,
    User_Firestore,
    milkshakeLogoCookie,
} from '@milkshakechat/helpers';
import { getSendbirdSecret } from '../utils/secrets';
import axios from 'axios';
import config from '../config.env';
import { v4 as uuidv4 } from 'uuid';
import { createFirestoreDoc, createFirestoreTimestamp } from './firestore';

class SendBirdService {
    private static secretKey: string;

    private constructor() {
        // Constructor should be empty for singleton classes
    }

    // const secret = await SendBirdService.getSendbirdSecret();
    public static async getSendbirdSecret() {
        if (!this.secretKey) {
            const secretKey = await getSendbirdSecret();
            this.secretKey = secretKey;
            return secretKey;
        }
        return this.secretKey;
    }
}

export default SendBirdService;

export const sendBirdSystemMessage = async ({
    message,
    channelURL,
}: {
    channelURL: SendBirdChannelURL;
    message: string;
}) => {
    const secretKey = await SendBirdService.getSendbirdSecret();
    try {
        const response = await axios.post<PartialSendbirdChannel>(
            `${config.SENDBIRD.API_URL}/v3/group_channels/${channelURL}/messages`,
            {
                message,
                message_type: 'ADMM',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Token': secretKey,
                },
            },
        );
        console.log(response.data);
        return response.data;
    } catch (e) {
        console.log(e);
    }
};

export const sendBirdUserMessage = async ({
    message,
    userID,
    channelURL,
}: {
    channelURL: SendBirdChannelURL;
    userID: UserID;
    message: string;
}) => {
    const secretKey = await SendBirdService.getSendbirdSecret();
    try {
        const response = await axios.post<PartialSendbirdChannel>(
            `${config.SENDBIRD.API_URL}/v3/group_channels/${channelURL}/messages`,
            {
                message,
                user_id: userID,
                message_type: 'MESG',
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Token': secretKey,
                },
            },
        );
        console.log(response.data);
        return response.data;
    } catch (e) {
        console.log(e);
    }
};

export const sendSystemMessageToChat = async ({
    message,
    chatRoom,
}: {
    message: string;
    chatRoom: ChatRoom_Firestore;
}) => {
    console.log(`Sending system message to chat..`);
    const chatLogID = uuidv4() as ChatLogID;
    const updates: Promise<any>[] = [
        createFirestoreDoc({
            id: chatLogID,
            data: {
                id: chatLogID,
                message,
                userID: SYSTEM_MESSAGE_USER_ID,
                avatar: milkshakeLogoCookie,
                username: SYSTEM_MESSAGE_USER_ID,
                chatRoomID: chatRoom.id,
                readers: chatRoom.members,
                createdAt: createFirestoreTimestamp(),
            },
            collection: FirestoreCollection.CHAT_LOGS,
        }),
    ];
    if (chatRoom.sendBirdChannelURL && chatRoom.sendBirdChannelURL !== undefined) {
        updates.push(
            sendBirdSystemMessage({
                channelURL: chatRoom.sendBirdChannelURL,
                message,
            }),
        );
    }
    await Promise.all(updates);
};

export const sendPuppetUserMessageToChat = async ({
    message,
    chatRoom,
    sender,
}: {
    message: string;
    chatRoom: ChatRoom_Firestore;
    sender: User_Firestore;
}) => {
    console.log(`Sending puppet user message to chat..`);
    const chatLogID = uuidv4() as ChatLogID;
    const updates: Promise<any>[] = [
        createFirestoreDoc({
            id: chatLogID,
            data: {
                id: chatLogID,
                message,
                userID: sender.id,
                avatar: sender.avatar,
                username: sender.username,
                chatRoomID: chatRoom.id,
                readers: chatRoom.members,
                createdAt: createFirestoreTimestamp(),
            },
            collection: FirestoreCollection.CHAT_LOGS,
        }),
    ];
    if (chatRoom.sendBirdChannelURL && chatRoom.sendBirdChannelURL !== undefined) {
        updates.push(
            sendBirdUserMessage({
                channelURL: chatRoom.sendBirdChannelURL,
                message,
                userID: sender.id,
            }),
        );
    }
    await Promise.all(updates);
};
