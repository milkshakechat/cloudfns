import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CashOutXCloudRequestBody, checkIfTradingWallet } from '@milkshakechat/helpers';
import {
    cashOutTransaction_QuantumLedger as cashOutTransactionQLDB,
    initQuantumLedger_Drivers,
} from '../../services/ledger';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const cashOutTransaction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('cashOutTransaction');
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
    await initQuantumLedger_Drivers();
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    console.log('cashOutTransaction...');
    try {
        const body = JSON.parse(event.body) as CashOutXCloudRequestBody;
        console.log('body', body);
        if (!body || !body.transactionID) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'missing request body',
                }),
            };
        }
        const transaction = await cashOutTransactionQLDB(body);
        console.log(`transaction`, transaction);
        if (!transaction) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Could not process cash out for transaction "${body.transactionID}"`,
                }),
            };
        }
        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully cashed out transaction txID=${transaction.id}`,
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

// "senderWallet": "user1234-main-trading-wallet",
//     "receiverWallet": "user567-main-escrow-wallet",

// "senderWallet": "global-store-4e9f9879-d627-401f-abf3-cc2bcf173e26",
// "receiverWallet": "user1234-main-trading-wallet",
