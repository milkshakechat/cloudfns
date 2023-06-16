import { FirestoreCollection, User_Firestore } from "@milkshakechat/helpers";
import * as admin from "firebase-admin";
import { Query } from "firebase-admin/firestore";

export const checkIfUsernameAvailable = async (
  username: string
): Promise<boolean> => {
  const firestore = admin.firestore();
  const ref = firestore
    .collection(FirestoreCollection.USERS)
    .where("username", "==", username) as Query<User_Firestore>;

  const collectionItems = await ref.get();

  if (collectionItems.empty) {
    return true;
  }
  const existingUsers = collectionItems.docs.map((doc) => {
    const data = doc.data();
    return data;
  });
  if (existingUsers && existingUsers.length > 0) {
    return false;
  }
  return false;
};

export const createFirestoreTimestamp = (date?: Date) => {
  const targetDate = date || new Date();
  const timestamp = admin.firestore.Timestamp.fromDate(targetDate);
  return timestamp;
};
