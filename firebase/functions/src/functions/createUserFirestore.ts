import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
import {
  FirestoreCollection,
  UserID,
  User_Firestore,
  defaultThemeColorHex,
  genderEnum,
  localeEnum,
  privacyModeEnum,
} from "@milkshakechat/helpers";
import { generateAvailablePlaceholderNames } from "../utils/username";
import { createFirestoreTimestamp } from "../services/firestore";
import { createCustomerStripe, initStripe } from "../services/stripe";
import { createNewUserWallets } from "../services/ledger";

export const createuserfirestore = functions
  .runWith({
    timeoutSeconds: 300,
  })
  .auth.user()
  .onCreate(async (user) => {
    console.log("EXCUSE ME WHY ARENT YOU LOGGING");
    try {
      logger.log("Creating firestore record for user: ", user.uid);
      const { username, displayName } =
        await generateAvailablePlaceholderNames();
      const now = createFirestoreTimestamp();

      const { tradingWallet, escrowWallet } = await createNewUserWallets({
        userID: user.uid as UserID,
      });
      console.log("Got wallets");
      console.log("tradingWallet", tradingWallet);
      console.log("escrowWallet", escrowWallet);
      const newUser: User_Firestore = {
        id: user.uid as UserID,
        username,
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
        tradingWallet: tradingWallet.walletAliasID,
        escrowWallet: escrowWallet.walletAliasID,
      };
      const newUserMirror = {
        id: user.uid as UserID,
        username,
        avatar: "",
      };
      const db = admin.firestore();
      await Promise.all([
        db.collection(FirestoreCollection.USERS).doc(user.uid).set(newUser),
        db
          .collection(FirestoreCollection.MIRROR_USER)
          .doc(user.uid)
          .set(newUserMirror),
      ]);
      logger.log("User document written with ID: ", user.uid);
      // logger.log("Wallet document written with ID: ", walletID);
      await initStripe();
      console.log("Creating stripe customer...");
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
