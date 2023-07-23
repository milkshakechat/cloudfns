/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import { onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { initStripe, stripe } from "../services/stripe";
import { getStripeWebhookSecret } from "../utils/secrets";
import { confirmChargeSuccessSyncQLDB } from "../services/ledger";
import {
  FirestoreCollection,
  PostTransactionXCloudRequestBody,
  PurchaseMainfestID,
  PurchaseMainfest_Firestore,
  TransactionType,
  WishBuyFrequency,
  usdToCookie,
} from "@milkshakechat/helpers";
import {
  getFirestoreDoc,
  listFirestoreDocs,
  updateFirestoreDoc,
} from "../services/firestore";
import config from "../config.env";

export const onpurchaseintentsuccess = onRequest(
  { cors: ["*.stripe.com"] },
  async (request, response) => {
    console.log("----> onpurchaseintentsuccess");
    console.log(`Timestamp of invokation: ${Date.now().toString()}`);
    console.log("request.body", request.body);
    console.log("request.body", request.rawBody);
    response.status(200).send("OK");

    console.log("init stripe...");
    await initStripe();
    const sig = request.headers["stripe-signature"];
    console.log("sig", sig);
    if (!sig) {
      // Webhook signature missing
      response.status(400).end();
      return;
    }
    console.log("get stripe webhook secret...");
    const stripeWebhookSecret = await getStripeWebhookSecret();
    console.log("stripeWebhookSecret", stripeWebhookSecret);

    let event: Stripe.Event | null = null;

    try {
      console.log("constructing event...");
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        stripeWebhookSecret
      );
    } catch (err) {
      // invalid signature
      console.log("err", err);
      response.status(400).end();
      return;
    }
    console.log("event is =", event);
    if (event === null) {
      // event is null
      response.status(400).end();
      return;
    }

    console.log("event.data", event.data);
    console.log("event.type", event.type);

    let intent: any;
    switch (event.type) {
      case "charge.succeeded": {
        intent = event.data.object;
        console.log("Succeeded:", intent.id);
        const paymentIntentID = intent.payment_intent;
        console.log("paymentIntentID", paymentIntentID);

        console.log("intent.invoice", intent.invoice);
        // no invoice means its a one-time charge
        if (intent.invoice === null) {
          console.log("This appears to be a one-time charge");
          console.log("querying... listFirestoreDocs(purchaseManifests)");
          const purchaseManifests =
            await listFirestoreDocs<PurchaseMainfest_Firestore>({
              where: {
                field: "stripePaymentIntentID",
                operator: "==",
                value: paymentIntentID,
              },
              collection: FirestoreCollection.PURCHASE_MANIFESTS,
            });
          console.log("purchaseManifests.length", purchaseManifests.length);
          const purchaseManifest = purchaseManifests[0];
          console.log("purchaseManifest", purchaseManifest);
          if (!purchaseManifest) {
            console.log(
              `Could not find purchase manifest for payment intent "${paymentIntentID}"`
            );
          }
          let titleTopOff = purchaseManifest.title;
          let titleAutoSpend = purchaseManifest.title;
          const amount: number = intent.amount_captured;
          const cookies = usdToCookie(amount / 100);

          console.log(`
          amount: ${amount}
          cookies: ${cookies}
          `);
          // its a one-time charge
          if (
            purchaseManifest.agreedBuyFrequency === WishBuyFrequency.ONE_TIME
          ) {
            titleTopOff = `Top-up ${cookies} cookies: ${titleTopOff}`;
          } else {
            titleTopOff = `Prorated top-up ${cookies} cookies: ${titleTopOff}`;
          }
          const _topUpTx: PostTransactionXCloudRequestBody = {
            title: titleTopOff,
            note: `Automatic top-up of ${cookies} cookies charged to ${intent.payment_method_details.card?.brand} ${intent.payment_method_details.card?.last4} for: ${purchaseManifest.note}`,
            purchaseManifestID: purchaseManifest.id,
            attribution: "",
            type: TransactionType.TOP_UP,
            amount: cookies,
            senderWallet: config.LEDGER.globalCookieStore.walletAliasID,
            receiverWallet: purchaseManifest.buyerWallet,
            senderUserID: config.LEDGER.globalCookieStore.userID,
            receiverUserID: purchaseManifest.buyerUserID,
            explanations: [
              {
                walletAliasID: config.LEDGER.globalCookieStore.walletAliasID,
                explanation: `Top up ${cookies} cookies to buy: ${purchaseManifest.title}`,
                amount: -cookies,
              },
              {
                walletAliasID: purchaseManifest.buyerWallet,
                explanation: `Top up ${cookies} cookies to buy: ${purchaseManifest.title}`,
                amount: cookies,
              },
            ],
            gotRecalled: false,
            gotCashOut: false,
            referenceID: purchaseManifest.referenceID,
            topUpMetadata: {
              internalNote: `Resulting from successful stripe charge ${intent.id} linked to ${paymentIntentID}`,
            },
          };
          console.log("_topUpTx", _topUpTx);
          if (
            purchaseManifest.agreedBuyFrequency === WishBuyFrequency.ONE_TIME
          ) {
            titleAutoSpend = `Auto-spend ${cookies} cookies: ${titleTopOff}`;
          } else {
            titleAutoSpend = `Prorated auto-spend ${cookies} cookies: ${titleTopOff}`;
          }
          const _spendTx: PostTransactionXCloudRequestBody = {
            title: titleAutoSpend,
            note: `Automatic auto-spend of ${cookies} cookies for: ${purchaseManifest.note}`,
            purchaseManifestID: purchaseManifest.id,
            attribution: "",
            type: TransactionType.DEAL,
            amount: cookies,
            senderWallet: purchaseManifest.buyerWallet,
            receiverWallet: purchaseManifest.escrowWallet,
            senderUserID: purchaseManifest.buyerUserID,
            receiverUserID: purchaseManifest.sellerUserID,
            referenceID: purchaseManifest.referenceID,
            explanations: [
              {
                walletAliasID: purchaseManifest.buyerWallet,
                explanation: `Auto-spend ${cookies} cookies to buy: ${purchaseManifest.title}`,
                amount: -cookies,
              },
              {
                walletAliasID: purchaseManifest.escrowWallet,
                explanation: `Auto-receive ${cookies} cookies from sale: ${purchaseManifest.title}`,
                amount: cookies,
              },
            ],
            salesMetadata: {
              buyerNote: purchaseManifest.buyerNote || "",
              // deal details
              agreedCookiePrice: purchaseManifest.agreedCookiePrice,
              originalCookiePrice: purchaseManifest.originalCookiePrice,
              agreedBuyFrequency: purchaseManifest.agreedBuyFrequency,
              originalBuyFrequency: purchaseManifest.originalBuyFrequency,
            },
          };
          console.log("_spendTx", _spendTx);
          const transactions: PostTransactionXCloudRequestBody[] = [
            _topUpTx,
            _spendTx,
          ];
          console.log("updating firestore purchaseManifest...");
          await updateFirestoreDoc<
            PurchaseMainfestID,
            PurchaseMainfest_Firestore
          >({
            id: purchaseManifest.id,
            payload: {
              paymentComplete: true,
            },
            collection: FirestoreCollection.PURCHASE_MANIFESTS,
          });
          console.log(
            `confirmChargeSuccessSyncQLDB... with ${transactions.length} tx`
          );
          const txs = confirmChargeSuccessSyncQLDB({
            transactions,
          });
          console.log("txs finished:", txs);
          return;
        } else {
          console.log("This appears to be a subscription charge");
          // having an invoice means its a subscription charge
          const invoiceID = intent.invoice;
          console.log("invoiceID", invoiceID);
          console.log("querying for subitems...");
          const subItems = await stripe.invoices
            .retrieve(invoiceID)
            .then((invoice: Stripe.Response<Stripe.Invoice>) => {
              const subscriptionId = invoice.subscription;
              console.log("subscriptionId -->", subscriptionId);
              return stripe.subscriptions.retrieve(subscriptionId as string);
            })
            .then((subscription: Stripe.Response<Stripe.Subscription>) => {
              const subscriptionItems = subscription.items.data;
              console.log(`Got sub items ${subscriptionItems.length}`);
              return Promise.all(
                subscriptionItems.map((item) =>
                  stripe.subscriptionItems.retrieve(item.id)
                )
              );
            })
            .then(
              (
                subscriptionItems: Stripe.Response<Stripe.SubscriptionItem>[]
              ) => {
                return subscriptionItems;
              }
            )
            .catch(console.error);
          console.log("subItems.length", subItems?.length);
          if (!subItems) {
            throw new Error(
              `An error occured looking for subscription items in invoice ${invoiceID}`
            );
          }
          console.log("grabing the purchases manifests...");
          const pms = await Promise.all(
            subItems.map(async (item) => {
              const purchaseManifestID = item.metadata.purchaseManifestID;
              const purchaseManifest = await getFirestoreDoc<
                PurchaseMainfestID,
                PurchaseMainfest_Firestore
              >({
                id: purchaseManifestID as PurchaseMainfestID,
                collection: FirestoreCollection.PURCHASE_MANIFESTS,
              });
              return purchaseManifest;
            })
          );
          const calcPmTotalCookies = pms.reduce((acc, pm) => {
            return acc + pm.assumedMonthlyCookiePrice;
          }, 0);
          const calcPmTotalUSD = pms.reduce((acc, pm) => {
            return acc + pm.assumedMonthlyUSDPrice;
          }, 0);
          console.log(`
          
          calcPmTotalCookies: ${calcPmTotalCookies}
          calcPmTotalUSD: ${calcPmTotalUSD}

          intent.amount_captured: ${intent.amount_captured}
          
          `);
          pms.forEach((pm) => {
            const _topUpTx: PostTransactionXCloudRequestBody = {
              title: `Auto top-up ${pm.assumedMonthlyCookiePrice} cookies monthly: ${pm.title}`,
              note: `Automatic top-up of ${pm.assumedMonthlyCookiePrice} cookies 
              charged to ${intent.payment_method_details.card?.brand} ${intent.payment_method_details.card?.last4} on charge ${intent.id}
              for: ${pm.note}`,
              purchaseManifestID: pm.id,
              attribution: "",
              type: TransactionType.TOP_UP,
              amount: pm.assumedMonthlyCookiePrice,
              senderWallet: config.LEDGER.globalCookieStore.walletAliasID,
              receiverWallet: pm.buyerWallet,
              senderUserID: config.LEDGER.globalCookieStore.userID,
              receiverUserID: pm.buyerUserID,
              explanations: [
                {
                  walletAliasID: config.LEDGER.globalCookieStore.walletAliasID,
                  explanation: `Auto-top up ${pm.assumedMonthlyCookiePrice} cookies monthly to buy: ${pm.title}`,
                  amount: -pm.assumedMonthlyCookiePrice,
                },
                {
                  walletAliasID: pm.buyerWallet,
                  explanation: `Top up ${pm.assumedMonthlyUSDPrice} cookies monthly to buy: ${pm.title}`,
                  amount: pm.assumedMonthlyCookiePrice,
                },
              ],
              gotRecalled: false,
              gotCashOut: false,
              referenceID: pm.referenceID,
              topUpMetadata: {
                internalNote: `Resulting from successful stripe charge ${intent.id} linked to ${paymentIntentID}`,
              },
            };
            console.log("_topUpTx subitem", _topUpTx.title);
            const _spendTx: PostTransactionXCloudRequestBody = {
              title: `Auto spend ${pm.assumedMonthlyCookiePrice} cookies monthly: ${pm.title}`,
              note: `Automatic auto-spend of ${pm.assumedMonthlyCookiePrice} cookies monthly for: ${pm.note}`,
              purchaseManifestID: pm.id,
              attribution: "",
              type: TransactionType.DEAL,
              amount: pm.assumedMonthlyCookiePrice,
              senderWallet: pm.buyerWallet,
              receiverWallet: pm.escrowWallet,
              senderUserID: pm.buyerUserID,
              receiverUserID: pm.sellerUserID,
              referenceID: pm.referenceID,
              explanations: [
                {
                  walletAliasID: pm.buyerWallet,
                  explanation: `Auto-spend ${pm.assumedMonthlyCookiePrice} cookies monthly to buy: ${pm.title}`,
                  amount: -pm.assumedMonthlyCookiePrice,
                },
                {
                  walletAliasID: pm.escrowWallet,
                  explanation: `Auto-receive ${pm.assumedMonthlyCookiePrice} cookies monthly from sale: ${pm.title}`,
                  amount: pm.assumedMonthlyCookiePrice,
                },
              ],
              salesMetadata: {
                buyerNote: pm.buyerNote || "",
                // deal details
                agreedCookiePrice: pm.agreedCookiePrice,
                originalCookiePrice: pm.originalCookiePrice,
                agreedBuyFrequency: pm.agreedBuyFrequency,
                originalBuyFrequency: pm.originalBuyFrequency,
              },
            };
            console.log("_spendTx subitem", _spendTx.title);
            const transactions: PostTransactionXCloudRequestBody[] = [
              _topUpTx,
              _spendTx,
            ];
            console.log("savings to quantum...");
            const txs = confirmChargeSuccessSyncQLDB({
              transactions,
            });
            console.log("txs finished:", txs);
          });
          return;
        }
        break;
      }
      case "charge.payment_failed": {
        intent = event.data.object;
        const message =
          intent.last_payment_error && intent.last_payment_error.message;
        console.log("Failed:", intent.id, message);
        break;
      }
      default: {
        console.log(`Unhandled event type ${event.type}`);
        break;
      }
    }
  }
);
