import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getCreateWalletXCloudAWSSecret } from '../../utils/secrets';
import { CreateWalletXCloudRequestBody, UserID, WalletType } from '@milkshakechat/helpers';
import { createWallet as createWalletQLDB } from '../../services/ledger';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const createWallet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('createWallet');
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    console.log('createWallet...');
    try {
        const body = JSON.parse(event.body) as CreateWalletXCloudRequestBody;
        console.log('body', body);
        const { userID, userRelationshipHash, title, note, type } = body;
        console.log('userID', userID);
        const tradingWallet = await createWalletQLDB({
            userRelationshipHash,
            userID,
            title,
            note,
            type,
        });
        if (!tradingWallet) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Could not create a trading wallet for user ${userID}`,
                }),
            };
        }
        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully created wallet=${tradingWallet} for user=${userID}`,
                wallet: tradingWallet,
            }),
        };
        return resp;
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'An error occurred while creating the wallet',
            }),
        };
    }
};
