import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
    PostTransactionXCloudRequestBody,
    checkIfTradingWallet,
    checkIfStoreWallet,
    ConfirmChargeXCloudRequestBody,
    PurchaseMainfest_Firestore,
    FirestoreCollection,
    WishBuyFrequency,
    convertFrequencySubscriptionToMonthly,
    cookieToUSD,
    Transaction_Quantum,
    PurchaseMainfestID,
    UserID,
    User_Firestore,
    ChatRoomID,
    ChatRoom_Firestore,
    TransactionType,
} from '@milkshakechat/helpers';
import {
    _createTransaction,
    createTransaction_QuantumLedger as createTransactionQLDB,
    initQuantumLedger_Drivers,
    qldbDriver,
} from '../../services/ledger';
import { initFirebase } from '../../services/firebase';
import { getFirestoreDoc, listFirestoreDocs } from '../../services/firestore';
import { TransactionExecutor } from 'amazon-qldb-driver-nodejs';
import { sendPuppetUserMessageToChat, sendSystemMessageToChat } from '../../services/sendbird';
import { isWithin24HoursAgo } from '../../utils/utils';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const confirmCharge = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('confirmCharge');
    await initFirebase();
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
    console.log(`cache proof 2499jsd`);
    console.log('-------- initQuantumLedger_Drivers -------');
    await initQuantumLedger_Drivers();
    console.log('-------- initFirebase -------');
    await initFirebase();
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    console.log('confirmCharge...');
    try {
        console.log('body', event.body);
        console.log('typeof body', typeof event.body);
        const body = JSON.parse(event.body) as ConfirmChargeXCloudRequestBody;
        console.log('body', body);
        console.log('typeof body', typeof body);
        const transactions = body.transactions;
        const tx0 = transactions[0];
        const tx1 = transactions[1];

        let _callback0 = async () => {
            console.log('callback0');
        };
        let _callback1 = async () => {
            console.log('callback1');
        };

        const createdTxs: Transaction_Quantum[] = [];
        console.log('-------- qldbDriver.executeLambda -------');

        await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            console.log('txn.executeLambda...');

            if (tx0) {
                const { tx, callback } = await _createTransaction(tx0, txn, {
                    receiverOwnerID: tx0.receiverUserID,
                    senderOwnerID: tx0.senderUserID,
                });
                createdTxs.push(tx);
                _callback0 = callback;
            }
        });
        await _callback0();
        await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            console.log('txn.executeLambda...');

            if (tx1) {
                const { tx, callback } = await _createTransaction(tx1, txn, {
                    receiverOwnerID: tx1.receiverUserID,
                    senderOwnerID: tx1.senderUserID,
                });
                createdTxs.push(tx);
                _callback1 = callback;
            }
        });
        await _callback1();
        await Promise.all(
            createdTxs
                .filter((tx) => tx.purchaseManifestID && tx.type === TransactionType.DEAL)
                .map(async (tx) => {
                    const pm = await getFirestoreDoc<PurchaseMainfestID, PurchaseMainfest_Firestore>({
                        id: tx.purchaseManifestID as PurchaseMainfestID,
                        collection: FirestoreCollection.PURCHASE_MANIFESTS,
                    });
                    if (pm.chatRoomID) {
                        const [buyerUser, sellerUser, chatRoom] = await Promise.all([
                            getFirestoreDoc<UserID, User_Firestore>({
                                id: pm.buyerUserID,
                                collection: FirestoreCollection.USERS,
                            }),
                            getFirestoreDoc<UserID, User_Firestore>({
                                id: pm.sellerUserID,
                                collection: FirestoreCollection.USERS,
                            }),
                            getFirestoreDoc<ChatRoomID, ChatRoom_Firestore>({
                                id: pm.chatRoomID as ChatRoomID,
                                collection: FirestoreCollection.CHAT_ROOMS,
                            }),
                        ]);
                        console.log(`Found a chat room! ${chatRoom.title}`);

                        await sendSystemMessageToChat({
                            message: `🍪 ${tx.title}`,
                            chatRoom,
                        });
                        if (pm.buyerNote && isWithin24HoursAgo(new Date((pm.createdAt as any)?.seconds * 1000))) {
                            await sendPuppetUserMessageToChat({
                                message: pm.buyerNote,
                                chatRoom,
                                sender: buyerUser,
                            });
                        }
                    }
                }),
        );
        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully posted transactions txID=${createdTxs.map((tx) => tx.id).join(',')}`,
                transactions,
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
