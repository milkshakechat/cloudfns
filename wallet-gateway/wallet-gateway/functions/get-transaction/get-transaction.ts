import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
    getTransaction_QuantumLedger,
    getWallet_QuantumLedger,
    initQuantumLedger_Drivers,
} from '../../services/ledger';
import { GetTransactionXCloudRequestBody } from '@milkshakechat/helpers';
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

export const getTransaction = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event);
    if (!event.queryStringParameters || !event.queryStringParameters.transactionID) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request params',
            }),
        };
    }
    await initQuantumLedger_Drivers();
    await initFirebase();
    const queryParams = event.queryStringParameters as unknown as GetTransactionXCloudRequestBody;
    try {
        const tx = await getTransaction_QuantumLedger({
            transactionID: queryParams.transactionID,
        });
        if (!tx) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `No transaction found for tx=${queryParams.transactionID}`,
                }),
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully found transaction for your request tx=${queryParams.transactionID}`,
                transaction: tx,
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
