import { APIGatewayRequestAuthorizerEventV2, APIGatewaySimpleAuthorizerWithContextResult } from 'aws-lambda';
import { getCreateWalletXCloudAWSSecret } from '../../utils/secrets';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const walletAuthValidator = async (
    event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewaySimpleAuthorizerWithContextResult<any>> => {
    console.log('------ event ------');
    console.log(event);
    console.log('------ event ------');
    const response = {
        isAuthorized: false,
        context: {},
    };
    if (!event.headers || !event.headers['Authorization']) {
        return response;
    }

    const senderToken = event.headers['Authorization'] || '';
    const xcloudSecret = await getCreateWalletXCloudAWSSecret();

    if (senderToken === xcloudSecret) {
        return {
            isAuthorized: true,
            context: {},
        };
    } else {
        return response;
    }
};
