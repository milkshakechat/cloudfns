import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import config, { SecretConfigAWS } from '../config.env';
import * as dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { decodeBody } from './utils';

dotenv.config({
    path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

async function accessSecretVersionAWS({
    SecretId,
    VersionId,
}: {
    SecretId: string;
    VersionId?: string;
}): Promise<string> {
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.WALLET_GATEWAY_BASE64_KEY || '', 'base64').toString('utf-8');

    const credentials = JSON.parse(base64KeyFile);

    // Create a AWS Secret Manager instance with the credentials
    const client = new SecretsManagerClient({
        region: config.WALLET_GATEWAY.region,
        credentials: {
            accessKeyId: credentials.accessKey,
            secretAccessKey: credentials.secretKey,
        },
    });

    const input: SecretConfigAWS = {
        SecretId: SecretId,
    };
    if (VersionId) {
        input.VersionId = VersionId;
    }

    const command = new GetSecretValueCommand(input);

    try {
        const secretValue = await client.send(command);

        if (!secretValue || !secretValue.SecretString) {
            console.log(`couldnt got secret value!`);
            throw Error('No secret value found');
        }

        return secretValue.SecretString;
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        throw error;
    }
}

async function accessSecretVersionGCP({
    projectId,
    secretId,
    versionId,
}: {
    projectId: string;
    secretId: string;
    versionId: string;
}): Promise<string> {
    // path to repo working directory

    const base64KeyFile = Buffer.from(process.env.GCP_KEYFILE_BASE64 || '', 'base64').toString('utf-8');

    const credentials = decodeBody(base64KeyFile);

    // Create a GoogleAuth instance with the credentials
    const auth = new GoogleAuth({
        credentials,
    });
    // console.log(`auth`, auth);
    const client = new SecretManagerServiceClient({
        // Option 1: path to service account keyfile
        // keyFilename: pathToKeyFile,
        // Option 2: stringified service account as .ENV variable
        auth,
        credentials,
    });

    const name = `projects/${projectId}/secrets/${secretId}/versions/${versionId}`;

    const [response] = await client.accessSecretVersion({ name });

    const secretValue = response.payload?.data?.toString();

    if (!secretValue) {
        throw Error('No secret value found');
    }
    return secretValue;
}

export const getCreateWalletXCloudAWSSecret = async () => {
    const xcloudSecret = await accessSecretVersionAWS({
        SecretId: config.SECRETS.WALLET_GATEWAY_XCLOUD_GCP.SecretId,
    });

    const { secret } = JSON.parse(xcloudSecret) as { secret: string };

    if (!secret) {
        throw Error('No secret value found');
    }
    return secret;
};

export const accessLocalAWSKeyFile = async () => {
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.WALLET_GATEWAY_BASE64_KEY || '', 'base64').toString('utf-8');

    const credentials = JSON.parse(base64KeyFile);

    return credentials as { accessKey: string; secretKey: string };
};

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
}
export const getFirebaseConfig = async () => {
    const firebaseConfig = await accessSecretVersionGCP({
        projectId: config.GCLOUD.projectId,
        secretId: config.SECRETS.FIREBASE_CONFIG.secretId,
        versionId: config.SECRETS.FIREBASE_CONFIG.versionId,
    });

    // return firebaseConfig as unknown as FirebaseConfig;
    return JSON.parse(firebaseConfig) as FirebaseConfig;
};

export const getFCMServerKey = async () => {
    const fcmServerKey = await accessSecretVersionGCP({
        projectId: config.GCLOUD.projectId,
        secretId: config.SECRETS.FCM_SERVER_KEY.secretId,
        versionId: config.SECRETS.FCM_SERVER_KEY.versionId,
    });
    return fcmServerKey;
};

export const getSendbirdSecret = async () => {
    const sendbirdSecret = await accessSecretVersionGCP({
        projectId: config.GCLOUD.projectId,
        secretId: config.SECRETS.SENDBIRD_API.secretId,
        versionId: config.SECRETS.SENDBIRD_API.versionId,
    });
    return sendbirdSecret;
};
