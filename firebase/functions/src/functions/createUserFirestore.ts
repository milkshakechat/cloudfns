import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
import {
  UserID,
  User_Firestore,
  Username,
  defaultThemeColorHex,
  genderEnum,
  localeEnum,
  privacyModeEnum,
} from "@milkshakechat/helpers";
import { generateAvailablePlaceholderNames } from "../utils/username";
import { createFirestoreTimestamp } from "../services/firestore";

export const createUserFirestore = functions.auth
  .user()
  .onCreate(async (user) => {
    try {
      logger.log("Creating firestore record for user: ", user.uid);
      const { username, displayName } =
        await generateAvailablePlaceholderNames();
      const now = createFirestoreTimestamp();
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
      };
      const db = admin.firestore();
      await db.collection("users").doc(user.uid).set(newUser);
      logger.log("User document written with ID: ", user.uid);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  });
