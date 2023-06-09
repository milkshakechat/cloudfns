import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();
import {
  UserID,
  User_Firestore,
  createFirestoreTimestamp,
} from "@milkshakechat/helpers";
import { generateUsername } from "../utils/username";

export const createUserFirestore = functions.auth
  .user()
  .onCreate(async (user) => {
    try {
      logger.log("Creating firestore record for user: ", user.uid);
      const username = generateUsername();
      const newUser: User_Firestore = {
        id: user.uid as UserID,
        username: username,
        displayName: username,
        bio: "",
        email: user.email || "",
        phone: user.phoneNumber || "",
        isCreator: false,
        createdAt: createFirestoreTimestamp(),
        isPaidChat: false,
        disabled: false,
      };
      const db = admin.firestore();
      await db.collection("users").doc(user.uid).set(newUser);
      logger.log("User document written with ID: ", user.uid);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  });
