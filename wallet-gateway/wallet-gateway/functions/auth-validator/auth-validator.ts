import { AuthResponse, CustomAuthorizerEvent, CustomAuthorizerResult, PolicyDocument, Statement } from 'aws-lambda';
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

export const walletAuthValidator = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {
    console.log('walletAuthValidator');

    console.log('-------- event -------');
    console.log(event);
    if (!event.authorizationToken) {
        console.log('no authorizationToken');
        return generateAuthResponse('user', 'Deny', event.methodArn);
    }

    const senderToken = event.authorizationToken || '';
    const xcloudSecret = await getCreateWalletXCloudAWSSecret();

    if (senderToken === xcloudSecret) {
        const iamPolicy = generateAuthResponse('user', 'Allow', event.methodArn);
        console.log(`typeof iamPolicy = ${typeof iamPolicy}`);
        console.log('iamPolicy', iamPolicy);
        console.log(`iamPolicy: ${JSON.stringify(iamPolicy)}`);
        return iamPolicy;
    } else {
        console.log('invalid token');
        return generateAuthResponse('user', 'Deny', event.methodArn);
    }
};

function generatePolicyDocument(effect: string, resource: string): PolicyDocument {
    const statement: Statement = {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
    };
    console.log(`statement: ${JSON.stringify(statement)}`);
    const policyDocument: PolicyDocument = {
        Version: '2012-10-17',
        Statement: [statement],
    };
    console.log(`policyDocument: ${JSON.stringify(policyDocument)}`);
    return policyDocument;
}

function generateAuthResponse(principalId: string, effect: string, resource: string): AuthResponse {
    console.log('generateAuthResponse');
    const policyDocument = generatePolicyDocument(effect, resource);
    console.log(`policyDocument: ${JSON.stringify(policyDocument)}`);
    const response: AuthResponse = {
        principalId: principalId,
        policyDocument: policyDocument,
    };
    console.log(`response: ${JSON.stringify(response)}`);
    return response;
}
