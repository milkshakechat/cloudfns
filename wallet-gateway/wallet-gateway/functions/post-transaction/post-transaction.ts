import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
    PostTransactionXCloudRequestBody,
    checkIfTradingWallet,
    checkIfStoreWallet,
    ChatRoom_Firestore,
    ChatRoomID,
    FirestoreCollection,
    User_Firestore,
    UserID,
} from '@milkshakechat/helpers';
import {
    createTransaction_QuantumLedger as createTransactionQLDB,
    initQuantumLedger_Drivers,
} from '../../services/ledger';
import { initFirebase } from '../../services/firebase';
import { getFirestoreDoc } from '../../services/firestore';
import { sendPuppetUserMessageToChat, sendSystemMessageToChat } from '../../services/sendbird';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const postTransaction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('postTransaction');
    await initFirebase();
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
    console.log(`cache proof 2499jsd`);
    await initQuantumLedger_Drivers();
    await initFirebase();
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    console.log('postTransaction...');
    try {
        console.log('body', event.body);
        console.log('typeof body', typeof event.body);
        const body = JSON.parse(event.body) as PostTransactionXCloudRequestBody;
        console.log('body', body);
        console.log('typeof body', typeof body);
        if (!body.senderWallet || !body.receiverWallet) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'missing request body',
                }),
            };
        }
        if (!checkIfTradingWallet(body.senderWallet) && !checkIfStoreWallet(body.senderWallet)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Only trading wallets or stores can post transactions',
                }),
            };
        }
        console.log('body', body);
        const transaction = await createTransactionQLDB(body);
        console.log(`transaction`, transaction);
        if (!transaction) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Could not process transaction "${body.title}"`,
                }),
            };
        }
        console.log(`---> body.chatRoomID`, body.chatRoomID);
        if (body.chatRoomID) {
            const [senderUser, receiverUser, chatRoom] = await Promise.all([
                getFirestoreDoc<UserID, User_Firestore>({
                    id: body.senderUserID as UserID,
                    collection: FirestoreCollection.USERS,
                }),
                getFirestoreDoc<UserID, User_Firestore>({
                    id: body.receiverUserID as UserID,
                    collection: FirestoreCollection.USERS,
                }),
                getFirestoreDoc<ChatRoomID, ChatRoom_Firestore>({
                    id: body.chatRoomID as ChatRoomID,
                    collection: FirestoreCollection.CHAT_ROOMS,
                }),
            ]);
            console.log(`Found a chat room! ${chatRoom.title}`);
            const message = body.transferMetadata?.senderNote || body.salesMetadata?.buyerNote || body.note;
            await sendSystemMessageToChat({
                message: `🍪 ${body.title}`,
                chatRoom,
            });
            if (body.note) {
                await sendPuppetUserMessageToChat({
                    message,
                    chatRoom,
                    sender: senderUser,
                });
            }
        }

        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully posted transaction txID=${transaction.id} title="${body.title}"`,
                transaction: transaction,
            }),
        };
        return resp;
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `An error occurred while attempting to post the transaction. ${JSON.stringify(err)}`,
            }),
        };
    }
};
