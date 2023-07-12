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
  Wallet_Firestore,
  defaultThemeColorHex,
  genderEnum,
  localeEnum,
  privacyModeEnum,
} from "@milkshakechat/helpers";
import { generateAvailablePlaceholderNames } from "../utils/username";
import { createFirestoreTimestamp } from "../services/firestore";
import { v4 as uuidv4 } from "uuid";
import { sleep } from "../utils/utils";
// import { createCustomerStripe } from "../services/stripe";

export const createuserfirestore = functions.auth
  .user()
  .onCreate(async (user) => {
    try {
      logger.log("Creating firestore record for user: ", user.uid);
      const { username, displayName } =
        await generateAvailablePlaceholderNames();
      const now = createFirestoreTimestamp();
      const walletID = uuidv4();
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
        mainWalletID: walletID as WalletID,
      };
      const newWallet: Wallet_Firestore = {
        id: walletID as WalletID,
        ownerID: user.uid as UserID,
        hasMerchantPrivilege: false,
        title: `Main Wallet for User ${user.uid}`,
        createdAt: now,
        note: "Created automatically upon user creation.",
        cookieBalanceSnapshot: 0,
        lastSnapshotTime: now,
      };
      const db = admin.firestore();
      await Promise.all([
        db.collection(FirestoreCollection.USERS).doc(user.uid).set(newUser),
        db.collection(FirestoreCollection.WALLETS).doc(user.uid).set(newWallet),
      ]);
      logger.log("User document written with ID: ", user.uid);
      logger.log("Wallet document written with ID: ", walletID);

      await sleep(5000); // sleep 5 seconds to allow firestore to write

      // create stripe customer
      // await createCustomerStripe({
      //   milkshakeUserID: user.uid as UserID,
      //   walletID: walletID as WalletID,
      // });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  });
