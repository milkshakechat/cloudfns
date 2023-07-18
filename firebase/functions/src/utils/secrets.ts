import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { GoogleAuth } from "google-auth-library";
import config from "../config.env";
import * as dotenv from "dotenv";
dotenv.config();

async function accessSecretVersionAWS({
  projectId,
  secretId,
  versionId,
}: {
  projectId: string;
  secretId: string;
  versionId: string;
}): Promise<string> {
  // path to repo working directory
  const base64KeyFile = Buffer.from(
    process.env.CLOUDFNS_BASE64_KEY || "",
    "base64"
  ).toString("utf-8");
  const credentials = JSON.parse(base64KeyFile);
  // Create a GoogleAuth instance with the credentials
  const auth = new GoogleAuth({
    credentials,
  });
  const client = new SecretManagerServiceClient({
    // Option 1: path to service account keyfile
    // keyFilename: pathToKeyFile,
    // Option 2: stringified service account as .ENV variable
    auth,
  });
  const name = `projects/${projectId}/secrets/${secretId}/versions/${versionId}`;

  const [response] = await client.accessSecretVersion({ name });

  const secretValue = response.payload?.data?.toString();
  if (!secretValue) {
    throw Error("No secret value found");
  }
  return secretValue;
}

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
  const firebaseConfig = await accessSecretVersionAWS({
    projectId: config.GCLOUD.projectId,
    secretId: config.SECRETS.FIREBASE_CONFIG.secretId,
    versionId: config.SECRETS.FIREBASE_CONFIG.versionId,
  });
  return JSON.parse(firebaseConfig) as FirebaseConfig;
};

export const getFCMServerKey = async () => {
  const fcmServerKey = await accessSecretVersionAWS({
    projectId: config.GCLOUD.projectId,
    secretId: config.SECRETS.FCM_SERVER_KEY.secretId,
    versionId: config.SECRETS.FCM_SERVER_KEY.versionId,
  });
  return fcmServerKey;
};

export const accessLocalGCPKeyFile = async () => {
  // path to repo working directory
  const base64KeyFile = Buffer.from(
    process.env.CLOUDFNS_BASE64_KEY || "",
    "base64"
  ).toString("utf-8");
  const credentials = JSON.parse(base64KeyFile);
  return credentials;
};

export const getStripeSecret = async () => {
  const stripeSecret = await accessSecretVersionAWS({
    projectId: config.GCLOUD.projectId,
    secretId: config.SECRETS.STRIPE_SERVER_KEY.secretId,
    versionId: config.SECRETS.STRIPE_SERVER_KEY.versionId,
  });
  return stripeSecret;
};

export const getCreateWalletXCloudAWSSecret = async () => {
  const xcloudSecret = await accessSecretVersionAWS({
    projectId: config.GCLOUD.projectId,
    secretId: config.SECRETS.CREATE_WALLET_XCLOUD_AWS.secretId,
    versionId: config.SECRETS.CREATE_WALLET_XCLOUD_AWS.versionId,
  });
  return xcloudSecret;
};
