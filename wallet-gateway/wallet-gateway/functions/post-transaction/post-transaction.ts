import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PostTransactionXCloudRequestBody, checkIfTradingWallet, checkIfStoreWallet } from '@milkshakechat/helpers';
import {
    createTransaction_QuantumLedger as createTransactionQLDB,
    initQuantumLedger_Drivers,
} from '../../services/ledger';
import { initFirebase } from '../../services/firebase';

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
        const body = JSON.parse(event.body) as PostTransactionXCloudRequestBody;
        if (!body.amount || !body.senderWallet || !body.receiverWallet) {
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

// "senderWallet": "user1234-main-trading-wallet",
//     "receiverWallet": "user567-main-escrow-wallet",

// "senderWallet": "global-store-4e9f9879-d627-401f-abf3-cc2bcf173e26",
// "receiverWallet": "user1234-main-trading-wallet",
