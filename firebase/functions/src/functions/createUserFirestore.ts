import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
import {
  FirestoreCollection,
  UserID,
  User_Firestore,
  Username,
  WalletID,
  defaultThemeColorHex,
  genderEnum,
  localeEnum,
  privacyModeEnum,
} from "@milkshakechat/helpers";
import { generateAvailablePlaceholderNames } from "../utils/username";
import { createFirestoreTimestamp } from "../services/firestore";
import { sleep } from "../utils/utils";
import { createCustomerStripe } from "../services/stripe";
import { createNewUserWallet } from "../services/ledger";

export const createuserfirestore = functions.auth
  .user()
  .onCreate(async (user) => {
    try {
      logger.log("Creating firestore record for user: ", user.uid);
      const { username, displayName } =
        await generateAvailablePlaceholderNames();
      const now = createFirestoreTimestamp();

      await createNewUserWallet({ userID: user.uid as UserID });
      console.log("Got wallet");
      const newUser: User_Firestore = {
        id: user.uid as UserID,
        username: username as Username,
        displayName: displayName,
        bio: "",
        avatar: "",
        link: "",
        email: user.email || "",
        phone: user.phoneNumber || "",
        isCreator: false,
        createdAt: now,
        isPaidChat: false,
        disabled: false,
        privacyMode: privacyModeEnum.private,
        themeColor: defaultThemeColorHex,
        language: localeEnum.english,
        gender: genderEnum.other,
        interestedIn: [],
        usernameLastUpdated: now,
        mainWalletID: "walletID" as WalletID,
      };

      const db = admin.firestore();
      await db.collection(FirestoreCollection.USERS).doc(user.uid).set(newUser);
      logger.log("User document written with ID: ", user.uid);
      // logger.log("Wallet document written with ID: ", walletID);

      await sleep(5000); // sleep 5 seconds to allow firestore to write

      // create stripe customer
      await createCustomerStripe({
        milkshakeUserID: user.uid as UserID,
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  });

// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

// how to import AWS secret (use on aws api-gateway)
// import {
//   SecretsManagerClient,
//   GetSecretValueCommand,
// } from "@aws-sdk/client-secrets-manager";

// const secret_name = "xcloud-create-wallet-gcp-to-aws-api-gateway";

// const client = new SecretsManagerClient({
//   region: "ap-northeast-1",
// });

// let response;

// try {
//   response = await client.send(
//     new GetSecretValueCommand({
//       SecretId: secret_name,
//       VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
//     })
//   );
// } catch (error) {
//   // For a list of exceptions thrown, see
//   // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
//   throw error;
// }

// const secret = response.SecretString;

// // Your code goes here
