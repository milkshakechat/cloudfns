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
    if (!event.authorizationToken) {
        return generateAuthResponse('user', 'Deny', event.methodArn);
    }

    const senderToken = event.authorizationToken || '';
    const xcloudSecret = await getCreateWalletXCloudAWSSecret();
    if (senderToken === xcloudSecret) {
        const iamPolicy = generateAuthResponse('user', 'Allow', event.methodArn);

        return iamPolicy;
    } else {
        return generateAuthResponse('user', 'Deny', event.methodArn);
    }
};

async function generatePolicyDocument(effect: string, resource: string): Promise<PolicyDocument> {
    const statement: Statement = {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
    };
    const policyDocument: PolicyDocument = {
        Version: '2012-10-17',
        Statement: [statement],
    };
    return policyDocument;
}

async function generateAuthResponse(principalId: string, effect: string, resource: string): Promise<AuthResponse> {
    const policyDocument = await generatePolicyDocument(effect, resource);
    const response: AuthResponse = {
        principalId: principalId,
        policyDocument: policyDocument,
    };
    return response;
}
