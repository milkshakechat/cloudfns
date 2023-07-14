import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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

interface RequestBodyParamsType {
    title: string;
    note: string;
}
export const createWallet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    try {
        const body = JSON.parse(event.body) as RequestBodyParamsType;
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Creating wallet with title=${body.title} and note=${body.note}`,
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
