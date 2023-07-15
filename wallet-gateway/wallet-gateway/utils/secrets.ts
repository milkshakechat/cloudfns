import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import config, { SecretConfigAWS } from '../config.env';
import * as dotenv from 'dotenv';
dotenv.config();

async function accessSecretVersion({ SecretId, VersionId }: { SecretId: string; VersionId?: string }): Promise<string> {
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.WALLET_GATEWAY_BASE64_KEY || '', 'base64').toString('utf-8');
    console.log(`base64KeyFile`, base64KeyFile);
    const credentials = JSON.parse(base64KeyFile);
    console.log(`credentials`, credentials);
    console.log(`init client...`);
    // Create a AWS Secret Manager instance with the credentials
    const client = new SecretsManagerClient({
        region: config.WALLET_GATEWAY.region,
        credentials: {
            accessKeyId: credentials.accessKey,
            secretAccessKey: credentials.secretKey,
        },
    });
    console.log(`init client!`);
    const input: SecretConfigAWS = {
        SecretId: SecretId,
    };
    if (VersionId) {
        input.VersionId = VersionId;
    }
    console.log(`Getting secret value...`);
    const command = new GetSecretValueCommand(input);
    console.log(`send secret command...`);
    try {
        const secretValue = await client.send(command);
        console.log(`secretValue`, secretValue);
        if (!secretValue || !secretValue.SecretString) {
            console.log(`couldnt got secret value!`);
            throw Error('No secret value found');
        }
        console.log(`successfully got secret value!`);
        return secretValue.SecretString;
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        throw error;
    }
}

export const getCreateWalletXCloudAWSSecret = async () => {
    console.log(`getting getCreateWalletXCloudAWSSecret...`);
    const xcloudSecret = await accessSecretVersion({
        SecretId: config.SECRETS.WALLET_GATEWAY_XCLOUD_GCP.SecretId,
    });
    console.log(`xcloudSecret: ${xcloudSecret}`);
    console.log(`typeof xcloudSecret = ${typeof xcloudSecret}`);
    const { secret } = JSON.parse(xcloudSecret) as { secret: string };
    console.log(`secret: ${secret}`);
    if (!secret) {
        throw Error('No secret value found');
    }
    return secret;
};

export const accessLocalAWSKeyFile = async () => {
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.AWS_KEYFILE_BASE64 || '', 'base64').toString('utf-8');
    const credentials = JSON.parse(base64KeyFile);
    return credentials as { accessKey: string; secretKey: string };
};
