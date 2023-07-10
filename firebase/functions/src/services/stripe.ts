import { getStripeSecret } from "../utils/secrets";
import Stripe from "stripe";
import {
  FirestoreCollection,
  StripeCustomerID,
  UserID,
  WalletID,
  Wallet_Firestore,
} from "@milkshakechat/helpers";
import { updateFirestoreDoc } from "./firestore";

let stripe: Stripe;

export const initStripe = async () => {
  const privateKey = await getStripeSecret();
  stripe = new Stripe(privateKey, {
    apiVersion: "2022-11-15",
  });
};

export const createCustomerStripe = async ({
  milkshakeUserID,
  walletID,
}: {
  milkshakeUserID: UserID;
  walletID: WalletID;
}) => {
  console.log("createCustomerStripe...");
  const customer = await stripe.customers.create({
    metadata: {
      milkshakeUserID,
    },
  });
  console.log("customer", customer);
  const updatedWallet = await updateFirestoreDoc<WalletID, Wallet_Firestore>({
    id: walletID,
    payload: {
      stripeCustomerID: customer.id as StripeCustomerID,
    },
    collection: FirestoreCollection.WALLETS,
  });
  return updatedWallet;
};
