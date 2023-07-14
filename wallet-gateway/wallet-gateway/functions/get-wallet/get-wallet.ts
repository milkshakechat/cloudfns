import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

interface RequestParamsType {
    walletID: string;
    userRelationshipHash: string;
}
export const getWallet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(event);

    if (
        !event.queryStringParameters ||
        (!event.queryStringParameters.walletID && !event.queryStringParameters.userRelationshipHash)
    ) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request params',
            }),
        };
    }
    try {
        const params = event.queryStringParameters as unknown as RequestParamsType;
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `You requested walletID=${params.walletID} or userRelationshipHash=${params.userRelationshipHash}`,
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
