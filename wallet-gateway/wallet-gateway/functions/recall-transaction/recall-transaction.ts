import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RecallTransactionXCloudRequestBody, checkIfTradingWallet } from '@milkshakechat/helpers';
import {
    recallTransaction_QuantumLedger as recallTransactionQLDB,
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
