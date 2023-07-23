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

export let stripe: Stripe;

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
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);
  date.setHours(0, 0, 0, 0); // sets the time to 00:00:00
  const nextFirstOfMonth = date.getTime() / 1000;

  const sub = await stripe.subscriptions.create({
    customer: customer.id, // Replace with your customer id
    items: [{ price: config.STRIPE.MAIN_BILLING_CYCLE_PRODUCT_PRICE.id }],
    billing_cycle_anchor: nextFirstOfMonth,
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

export const getProratedCookiesForItemsMainBillingCycle = async (
  stripeInvoiceID: string
) => {
  const invoice = await stripe.invoices.retrieve(stripeInvoiceID);
  const lineItems = invoice.lines.data;
  lineItems.forEach((item) => {
    console.log(`Description: ${item.description}`);
    console.log(`Amount: ${item.amount}`);
  });
};
