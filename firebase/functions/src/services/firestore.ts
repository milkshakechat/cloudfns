import { FirestoreCollection, User_Firestore } from "@milkshakechat/helpers";
import * as admin from "firebase-admin";
import { DocumentReference, Query, UpdateData } from "firebase-admin/firestore";

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

// update
interface TUpdateFirestoreDocProps<SchemaID extends string, SchemaType> {
  id: SchemaID;
  payload: Partial<SchemaType>;
  collection: FirestoreCollection;
}
export const updateFirestoreDoc = async <SchemaID extends string, SchemaType>({
  id,
  payload,
  collection,
}: TUpdateFirestoreDocProps<SchemaID, SchemaType>): Promise<SchemaType> => {
  if (Object.keys(payload).length === 0) {
    throw new Error("No data provided");
  }
  const firestore = admin.firestore();
  const ref = firestore
    .collection(collection)
    .doc(id) as DocumentReference<SchemaType>;
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw Error(`No document found with id ${id} in ${collection}`);
  }
  const existingObj = snapshot.data();

  if (!existingObj) {
    throw Error(
      `Nothing to update, no record found with id ${id} in ${collection}`
    );
  }

  const updatePayload: Partial<SchemaType> = {};
  // repeat
  Object.keys(payload).forEach((key) => {
    const typedKey = key as keyof SchemaType;
    if (payload[typedKey] != undefined) {
      updatePayload[typedKey] = payload[typedKey];
    }
  });
  // until done
  await ref.update(updatePayload as UpdateData<SchemaType>);
  const updatedObj = (await ref.get()).data();
  if (!updatedObj) {
    throw Error(`Could not find updated record with id ${id} in ${collection}`);
  }
  return updatedObj;
};
