import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import config, { SecretConfigAWS } from '../config.env';
import * as dotenv from 'dotenv';
import { GoogleAuth } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { decodeBody } from './utils';
dotenv.config();

async function accessSecretVersionAWS({
    SecretId,
    VersionId,
}: {
    SecretId: string;
    VersionId?: string;
}): Promise<string> {
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.WALLET_GATEWAY_BASE64_KEY || '', 'base64').toString('utf-8');
    console.log(`base64KeyFile aws`, base64KeyFile);
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
    console.log(`process.env.GCP_KEYFILE_BASE64 `, process.env.GCP_KEYFILE_BASE64);
    const base64KeyFile = Buffer.from(process.env.GCP_KEYFILE_BASE64 || '', 'base64').toString('utf-8');
    console.log(`base64KeyFile gcp`, base64KeyFile);
    console.log(`typeof base64KeyFile`, typeof base64KeyFile);
    const credentials = decodeBody(base64KeyFile);
    console.log(`credentials`, credentials);
    console.log(`typeof credentials`, typeof credentials);
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
    console.log(`client`, client);
    const name = `projects/${projectId}/secrets/${secretId}/versions/${versionId}`;
    console.log(`name`, name);

    const [response] = await client.accessSecretVersion({ name });
    console.log(`response`, response);

    const secretValue = response.payload?.data?.toString();
    console.log(`secretValue`, secretValue);
    if (!secretValue) {
        throw Error('No secret value found');
    }
    return secretValue;
}

export const getCreateWalletXCloudAWSSecret = async () => {
    console.log(`getting getCreateWalletXCloudAWSSecret...`);
    const xcloudSecret = await accessSecretVersionAWS({
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
    console.log(`accessLocalAWSKeyFile...`);
    // path to repo working directory
    const base64KeyFile = Buffer.from(process.env.WALLET_GATEWAY_BASE64_KEY || '', 'base64').toString('utf-8');
    console.log(`base64KeyFile local aws`, base64KeyFile);
    const credentials = JSON.parse(base64KeyFile);
    console.log(`credentials`, credentials);
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
    console.log(`getting getFirebaseConfig...`);
    const firebaseConfig = await accessSecretVersionGCP({
        projectId: config.GCLOUD.projectId,
        secretId: config.SECRETS.FIREBASE_CONFIG.secretId,
        versionId: config.SECRETS.FIREBASE_CONFIG.versionId,
    });
    console.log(`firebaseConfig: ${firebaseConfig}`);
    // return firebaseConfig as unknown as FirebaseConfig;
    return JSON.parse(firebaseConfig) as FirebaseConfig;
};
