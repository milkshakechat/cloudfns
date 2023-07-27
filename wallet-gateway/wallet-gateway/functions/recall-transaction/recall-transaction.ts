import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
    ChatRoomID,
    ChatRoom_Firestore,
    FirestoreCollection,
    PurchaseMainfestID,
    PurchaseMainfest_Firestore,
    RecallTransactionXCloudRequestBody,
    UserID,
    User_Firestore,
    checkIfTradingWallet,
} from '@milkshakechat/helpers';
import {
    recallTransaction_QuantumLedger as recallTransactionQLDB,
    initQuantumLedger_Drivers,
} from '../../services/ledger';
import { initFirebase } from '../../services/firebase';
import { getFirestoreDoc } from '../../services/firestore';
import { ListMirrorTx_Fireledger } from '../../services/mirror-fireledger';
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

export const recallTransaction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('recallTransaction');
    await initFirebase();
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
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
    console.log('recallTransaction...');
    try {
        const body = JSON.parse(event.body) as RecallTransactionXCloudRequestBody;
        console.log('body', body);
        if (!body || !body.transactionID) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'missing request body',
                }),
            };
        }
        const transaction = await recallTransactionQLDB(body);
        console.log(`transaction`, transaction);
        if (!transaction) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Could not process recall for transaction "${body.transactionID}"`,
                }),
            };
        }

        const txs = await ListMirrorTx_Fireledger({
            txID: body.transactionID,
        });
        const _tx = txs[0];
        console.log(`_tx`, _tx);
        if (_tx && _tx.purchaseManifestID) {
            const purchaseManifest = await getFirestoreDoc<PurchaseMainfestID, PurchaseMainfest_Firestore>({
                id: _tx.purchaseManifestID,
                collection: FirestoreCollection.PURCHASE_MANIFESTS,
            });
            if (purchaseManifest && purchaseManifest.chatRoomID) {
                const [originalSenderUser, originalReceiverUser, chatRoom] = await Promise.all([
                    getFirestoreDoc<UserID, User_Firestore>({
                        id: _tx.senderUserID,
                        collection: FirestoreCollection.USERS,
                    }),
                    getFirestoreDoc<UserID, User_Firestore>({
                        id: _tx.recieverUserID,
                        collection: FirestoreCollection.USERS,
                    }),
                    getFirestoreDoc<ChatRoomID, ChatRoom_Firestore>({
                        id: purchaseManifest.chatRoomID,
                        collection: FirestoreCollection.CHAT_ROOMS,
                    }),
                ]);
                console.log(`Found a chat room! ${chatRoom.title}`);

                await sendSystemMessageToChat({
                    message:
                        body.recallerWalletID === originalSenderUser.tradingWallet
                            ? `❤️‍🩹 @${originalSenderUser.username} recalled ${_tx.amount} cookies for "${purchaseManifest.title}" from @${originalReceiverUser.username}`
                            : `❤️‍🩹 @${originalReceiverUser.username} returned ${_tx.amount} cookies to @${originalSenderUser.username} from "${purchaseManifest.title}"`,
                    chatRoom,
                });
                if (body.recallerNote) {
                    await sendPuppetUserMessageToChat({
                        message: body.recallerNote,
                        chatRoom,
                        sender:
                            body.recallerWalletID === originalSenderUser.tradingWallet
                                ? originalSenderUser
                                : originalReceiverUser,
                    });
                }
            }
        } else if (_tx && body.chatRoomID) {
            const [originalSenderUser, originalReceiverUser, chatRoom] = await Promise.all([
                getFirestoreDoc<UserID, User_Firestore>({
                    id: _tx.senderUserID,
                    collection: FirestoreCollection.USERS,
                }),
                getFirestoreDoc<UserID, User_Firestore>({
                    id: _tx.recieverUserID,
                    collection: FirestoreCollection.USERS,
                }),
                getFirestoreDoc<ChatRoomID, ChatRoom_Firestore>({
                    id: body.chatRoomID,
                    collection: FirestoreCollection.CHAT_ROOMS,
                }),
            ]);
            console.log(`Found a chat room! ${chatRoom.title}`);

            await sendSystemMessageToChat({
                message:
                    body.recallerWalletID === originalSenderUser.tradingWallet
                        ? `❤️‍🩹 @${originalSenderUser.username} recalled ${_tx.amount} cookies from @${originalReceiverUser.username}`
                        : `❤️‍🩹 @${originalReceiverUser.username} returned ${_tx.amount} cookies to @${originalSenderUser.username}`,
                chatRoom,
            });
            if (body.recallerNote) {
                await sendPuppetUserMessageToChat({
                    message: body.recallerNote,
                    chatRoom,
                    sender:
                        body.recallerWalletID === originalSenderUser.tradingWallet
                            ? originalSenderUser
                            : originalReceiverUser,
                });
            }
        }

        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully recalled transaction txID=${transaction.id}`,
                transaction: transaction,
            }),
        };
        return resp;
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: `An error occurred while attempting to recall the transaction. ${JSON.stringify(err)}`,
            }),
        };
    }
};
