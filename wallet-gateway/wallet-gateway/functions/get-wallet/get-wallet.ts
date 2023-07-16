import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getWallet_QuantumLedger, initQuantumLedger_Drivers } from '../../services/ledger';
import { GetWalletXCloudRequestBody } from '@milkshakechat/helpers';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const getWallet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event);
    if (!event.queryStringParameters || !event.queryStringParameters.walletAliasID) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request params',
            }),
        };
    }
    await initQuantumLedger_Drivers();
    const queryParams = event.queryStringParameters as unknown as GetWalletXCloudRequestBody;
    try {
        const wallet = await getWallet_QuantumLedger({
            walletAliasID: queryParams.walletAliasID,
        });
        if (!wallet) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `No wallet found for walletAliasID=${queryParams.walletAliasID}`,
                }),
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully found wallet for your request walletAliasID=${queryParams.walletAliasID}`,
                wallet: wallet,
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
