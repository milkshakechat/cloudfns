import { getStripeSecret } from "../utils/secrets";
import Stripe from "stripe";
import {
  FirestoreCollection,
  StripeCustomerID,
  StripeSubscriptionID,
  UserID,
  User_Firestore,
} from "@milkshakechat/helpers";
import { updateFirestoreDoc } from "./firestore";
import config from "../config.env";

let stripe: Stripe;

export const initStripe = async () => {
  const privateKey = await getStripeSecret();
  stripe = new Stripe(privateKey, {
    apiVersion: "2022-11-15",
  });
};

export const createCustomerStripe = async ({
  milkshakeUserID,
}: {
  milkshakeUserID: UserID;
}) => {
  console.log("createCustomerStripe...");
  const customer = await stripe.customers.create({
    name: `User ${milkshakeUserID}`,
    metadata: {
      milkshakeUserID,
    },
  });
  console.log("customer", customer);
  console.log("Subscribe to the zero dollar plan...");
  const sub = await stripe.subscriptions.create({
    customer: customer.id, // Replace with your customer id
    items: [{ price: config.STRIPE.MAIN_BILLING_CYCLE_PRODUCT_PRICE.id }],
  });
  console.log("sub", sub);
  const updatedUser = await updateFirestoreDoc<UserID, User_Firestore>({
    id: milkshakeUserID,
    payload: {
      stripeMetadata: {
        stripeCustomerID: customer.id as StripeCustomerID,
        stripeCustomerSubscriptionID: sub.id as StripeSubscriptionID,
        hasMerchantPrivilege: false,
        defaultPaymentMethodID: undefined,
      },
    },
    collection: FirestoreCollection.USERS,
  });
  return updatedUser;
};
