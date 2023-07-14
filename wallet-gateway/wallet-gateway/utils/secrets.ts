import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import config from '../config.env';
import * as dotenv from 'dotenv';
import { APIGatewayProxyEvent } from 'aws-lambda';
dotenv.config();

async function accessSecretVersion({ SecretId, VersionId }: { SecretId: string; VersionId: string }): Promise<string> {
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.WALLET_GATEWAY_BASE64_KEY || '', 'base64').toString('utf-8');
    const credentials = JSON.parse(base64KeyFile);
    // Create a GoogleAuth instance with the credentials

    const client = new SecretsManagerClient({
        region: config.WALLET_GATEWAY.region,
        credentials: {
            accessKeyId: credentials.accessKey,
            secretAccessKey: credentials.secretKey,
        },
    });
    const input = {
        SecretId: SecretId,
        VersionId: VersionId,
    };
    const command = new GetSecretValueCommand(input);
    const secretValue = await client.send(command);

    if (!secretValue || !secretValue.SecretString) {
        throw Error('No secret value found');
    }
    return secretValue.SecretString;
}

export const getCreateWalletXCloudAWSSecret = async () => {
    const xcloudSecret = await accessSecretVersion({
        SecretId: config.SECRETS.WALLET_GATEWAY_XCLOUD_GCP.SecretId,
        VersionId: config.SECRETS.WALLET_GATEWAY_XCLOUD_GCP.VersionId,
    });
    console.log(`xcloudSecret: ${xcloudSecret}`);
    return xcloudSecret;
};
