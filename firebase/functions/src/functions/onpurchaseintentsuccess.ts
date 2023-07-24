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
import {
  getCreateWalletXCloudAWSSecret,
  getStripeWebhookSecret,
} from "../utils/secrets";
import { confirmChargeSuccessSyncQLDB } from "../services/ledger";
import {
  FirestoreCollection,
  PostTransactionXCloudRequestBody,
  PurchaseMainfestID,
  PurchaseMainfest_Firestore,
  TransactionType,
  UserID,
  User_Firestore,
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
  { cors: ["*.stripe.com"], timeoutSeconds: 540 },
  async (request, response) => {
    console.log("----> onpurchaseintentsuccess");
    console.log(`Timestamp of invokation: ${Date.now().toString()}`);
    console.log("request.body", request.body);
    console.log("request.body", request.rawBody);
    response.status(200).send("OK");

    console.log("init stripe...");
    const sig = request.headers["stripe-signature"];
    console.log("sig", sig);
    if (!sig) {
      // Webhook signature missing
      response.status(400).end();
      return;
    }
    await initStripe();
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

    switch (event.type) {
      case "charge.succeeded": {
        const intent: any = event.data.object;
        if (!intent.metadata.affectsCookieWallet) {
          console.log("This charge does not affect cookie wallets");
          return;
        }
        console.log("Succeeded:", intent.id);
        const paymentIntentID = intent.payment_intent;
        console.log("paymentIntentID", paymentIntentID);

        console.log("intent.invoice", intent.invoice);
        // no invoice means its a one-time charge
        // also assume all top-ups are one-time charges
        if (intent.invoice === null) {
          console.log("This appears to be a charge without an invoice");
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
          // handle top offs
          if (purchaseManifest.buyerWallet === purchaseManifest.escrowWallet) {
            const _pureTopUpTx: PostTransactionXCloudRequestBody = {
              title: `Top-up ${purchaseManifest.agreedCookiePrice} cookies`,
              note: `Top-up ${purchaseManifest.agreedCookiePrice} cookies 
              charged to ${intent.payment_method_details.card?.brand} ${intent.payment_method_details.card?.last4} 
              for: ${purchaseManifest.note}`,
              purchaseManifestID: purchaseManifest.id,
              attribution: "",
              type: TransactionType.TOP_UP,
              amount: purchaseManifest.agreedCookiePrice,
              thumbnail: purchaseManifest.thumbnail,
              senderWallet: config.LEDGER.globalCookieStore.walletAliasID,
              receiverWallet: purchaseManifest.buyerWallet,
              senderUserID: config.LEDGER.globalCookieStore.userID,
              receiverUserID: purchaseManifest.buyerUserID,
              explanations: [
                {
                  walletAliasID: config.LEDGER.globalCookieStore.walletAliasID,
                  explanation: `Sold ${purchaseManifest.agreedCookiePrice} cookies to wallet ${purchaseManifest.buyerWallet} for top up`,
                  amount: -purchaseManifest.agreedCookiePrice,
                },
                {
                  walletAliasID: purchaseManifest.buyerWallet,
                  explanation: `Top up wallet with ${purchaseManifest.agreedCookiePrice} cookies`,
                  amount: purchaseManifest.agreedCookiePrice,
                },
              ],
              gotRecalled: false,
              gotCashOut: false,
              referenceID: purchaseManifest.referenceID,
              topUpMetadata: {
                internalNote: `Resulting from successful stripe charge ${intent.id} linked to ${paymentIntentID}`,
              },
              sendPushNotif: true,
            };
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
            const txs = await confirmChargeSuccessSyncQLDB({
              transactions: [_pureTopUpTx],
            });
            console.log("txs finished:", txs);
            return;
          }
          let titleTopOff = purchaseManifest.title;
          let titleAutoSpend = purchaseManifest.title;
          const amount: number = intent.amount_captured;
          const cookies = usdToCookie(amount / 100);

          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const daysUntilNextCycle = Math.ceil(
            (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          const [buyerUser, sellerUser] = await Promise.all([
            getFirestoreDoc<UserID, User_Firestore>({
              id: purchaseManifest.buyerUserID,
              collection: FirestoreCollection.USERS,
            }),
            getFirestoreDoc<UserID, User_Firestore>({
              id: purchaseManifest.sellerUserID,
              collection: FirestoreCollection.USERS,
            }),
          ]);
          if (!buyerUser || !sellerUser) {
            throw new Error(
              `Could not find buyerUser ${purchaseManifest.buyerUserID} or sellerUser ${purchaseManifest.sellerUserID} for purchase manifest ${purchaseManifest.id}`
            );
          }

          console.log(`
          amount: ${amount}
          cookies: ${cookies}
          `);
          if (
            purchaseManifest.agreedBuyFrequency === WishBuyFrequency.ONE_TIME
          ) {
            titleTopOff = `${titleTopOff} - Top-up ${cookies} cookies`;
          } else {
            titleTopOff = `${titleTopOff} - Prorated top-up ${cookies} cookies for ${daysUntilNextCycle} days`;
          }
          const _topUpTx: PostTransactionXCloudRequestBody = {
            title: titleTopOff,
            note: `Automatic top-up of ${cookies} cookies charged to ${intent.payment_method_details.card?.brand} ${intent.payment_method_details.card?.last4}
            for: ${purchaseManifest.note}. Bought by @${buyerUser.username}`,
            purchaseManifestID: purchaseManifest.id,
            attribution: "",
            type: TransactionType.TOP_UP,
            amount: cookies,
            thumbnail: purchaseManifest.thumbnail,
            senderWallet: config.LEDGER.globalCookieStore.walletAliasID,
            receiverWallet: purchaseManifest.buyerWallet,
            senderUserID: config.LEDGER.globalCookieStore.userID,
            receiverUserID: purchaseManifest.buyerUserID,
            explanations: [
              {
                walletAliasID: config.LEDGER.globalCookieStore.walletAliasID,
                explanation: `Sold ${cookies} cookies to @${
                  buyerUser.username
                } wallet ${purchaseManifest.buyerWallet} buy ${
                  purchaseManifest.agreedBuyFrequency ===
                  WishBuyFrequency.ONE_TIME
                    ? "once"
                    : `${daysUntilNextCycle} days of`
                } "${purchaseManifest.title}"`,
                amount: -cookies,
              },
              {
                walletAliasID: purchaseManifest.buyerWallet,
                explanation: `Top up ${cookies} cookies to buy ${
                  purchaseManifest.agreedBuyFrequency ===
                  WishBuyFrequency.ONE_TIME
                    ? "once"
                    : `${daysUntilNextCycle} days of`
                } "${purchaseManifest.title}"`,
                amount: cookies,
              },
            ],
            gotRecalled: false,
            gotCashOut: false,
            referenceID: purchaseManifest.referenceID,
            topUpMetadata: {
              internalNote: `Resulting from successful stripe charge ${intent.id} linked to ${paymentIntentID}`,
            },
            sendPushNotif: true,
          };
          console.log("_topUpTx", _topUpTx);
          if (
            purchaseManifest.agreedBuyFrequency === WishBuyFrequency.ONE_TIME
          ) {
            titleAutoSpend = `${titleTopOff} - Auto-spend ${cookies} cookies`;
          } else {
            titleAutoSpend = `${titleTopOff} - Prorated auto-spend ${cookies} cookies for ${daysUntilNextCycle} days`;
          }
          const _spendTx: PostTransactionXCloudRequestBody = {
            title: titleAutoSpend,
            note: `Auto-spend ${cookies} cookies for: ${purchaseManifest.note}. Bought by @${buyerUser.username} from @${sellerUser.username}`,
            purchaseManifestID: purchaseManifest.id,
            attribution: "",
            type: TransactionType.DEAL,
            amount: cookies,
            thumbnail: purchaseManifest.thumbnail,
            senderWallet: purchaseManifest.buyerWallet,
            receiverWallet: purchaseManifest.escrowWallet,
            senderUserID: purchaseManifest.buyerUserID,
            receiverUserID: purchaseManifest.sellerUserID,
            referenceID: purchaseManifest.referenceID,
            explanations: [
              {
                walletAliasID: purchaseManifest.buyerWallet,
                explanation: `Auto-spend ${cookies} cookies to buy from @${
                  sellerUser.username
                } ${
                  purchaseManifest.agreedBuyFrequency ===
                  WishBuyFrequency.ONE_TIME
                    ? "once"
                    : `${daysUntilNextCycle} days of`
                } "${purchaseManifest.title}"`,
                amount: -cookies,
              },
              {
                walletAliasID: purchaseManifest.escrowWallet,
                explanation: `Auto-receive ${cookies} cookies from @${
                  buyerUser.username
                } ${
                  purchaseManifest.agreedBuyFrequency ===
                  WishBuyFrequency.ONE_TIME
                    ? "once"
                    : `${daysUntilNextCycle} days of`
                } sale of "${purchaseManifest.title}"`,
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
            sendPushNotif: true,
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
          const txs = await confirmChargeSuccessSyncQLDB({
            transactions,
          });
          console.log("txs finished:", txs);
          return;
        }
        break;
      }
      case "charge.payment_failed": {
        const intent: any = event.data.object;
        const message =
          intent.last_payment_error && intent.last_payment_error.message;
        console.log("Failed:", intent.id, message);
        break;
      }
      case "invoice.paid": {
        console.log("This appears to be a subscription charge invoice payment");
        const invoice: any = event.data.object;

        // having an invoice means its a subscription charge
        const invoiceID = invoice.id;
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
            (subscriptionItems: Stripe.Response<Stripe.SubscriptionItem>[]) => {
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
          subItems
            .filter(
              (si) =>
                si.metadata.purchaseManifestID &&
                si.metadata.affectsCookieWallet
            )
            .map(async (item) => {
              console.log("subitem..... ", item);
              console.log("subitem.metadata", item.metadata);
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

          invoice.amount_paid: ${invoice.amount_paid}
          
          `);
        if (!invoice.amount_paid) {
          console.log(
            "An error occurred. The invoice amount captured is empty"
          );
          throw new Error(
            "An error occurred. The invoice amount captured is empty"
          );
          return;
        }
        if (calcPmTotalUSD > invoice.amount_paid) {
          console.log(
            "An error occurred. The total amount captured by stripe is less than the total amount of the purchase manifests"
          );
          throw new Error(
            "An error occurred. The total amount captured by stripe is less than the total amount of the purchase manifests"
          );
          return;
        }
        const xcloudSecret = await getCreateWalletXCloudAWSSecret();
        pms.forEach(async (pm) => {
          const [buyerUser, sellerUser] = await Promise.all([
            getFirestoreDoc<UserID, User_Firestore>({
              id: pm.buyerUserID,
              collection: FirestoreCollection.USERS,
            }),
            getFirestoreDoc<UserID, User_Firestore>({
              id: pm.sellerUserID,
              collection: FirestoreCollection.USERS,
            }),
          ]);
          if (!buyerUser || !sellerUser) {
            throw new Error(
              `Could not find buyerUser ${pm.buyerUserID} or sellerUser ${pm.sellerUserID} for purchase manifest ${pm.id}`
            );
          }
          const _topUpTx: PostTransactionXCloudRequestBody = {
            title: `Auto top-up ${pm.assumedMonthlyCookiePrice} cookies monthly to buy "${pm.title}"`,
            note: `Automatic top-up of ${pm.assumedMonthlyCookiePrice} cookies 
              from buyer @${buyerUser.username}
              on charge ${invoice.charge}
              from seller @${sellerUser.username} for "${pm.note}"`,
            purchaseManifestID: pm.id,
            attribution: "",
            type: TransactionType.TOP_UP,
            thumbnail: pm.thumbnail,
            amount: pm.assumedMonthlyCookiePrice,
            senderWallet: config.LEDGER.globalCookieStore.walletAliasID,
            receiverWallet: pm.buyerWallet,
            senderUserID: config.LEDGER.globalCookieStore.userID,
            receiverUserID: pm.buyerUserID,
            explanations: [
              {
                walletAliasID: config.LEDGER.globalCookieStore.walletAliasID,
                explanation: `Monthly auto-top up ${pm.assumedMonthlyCookiePrice} cookies. Buyer ${buyerUser.username} for "${pm.title}" from seller @${sellerUser.username}`,
                amount: -pm.assumedMonthlyCookiePrice,
              },
              {
                walletAliasID: pm.buyerWallet,
                explanation: `Monthly auto top up ${pm.assumedMonthlyCookiePrice} cookies to buy "${pm.title}" from @${sellerUser.username}`,
                amount: pm.assumedMonthlyCookiePrice,
              },
            ],
            gotRecalled: false,
            gotCashOut: false,
            referenceID: pm.referenceID,
            topUpMetadata: {
              internalNote: `Resulting from successful paid stripe invoice ${invoice.id}`,
            },
          };
          console.log(`_topUpTx subitem = ${JSON.stringify(_topUpTx.title)}`);
          const _spendTx: PostTransactionXCloudRequestBody = {
            title: `Monthly auto spend ${pm.assumedMonthlyCookiePrice} cookies by buyer @${buyerUser.username} for "${pm.title}" sold by @${sellerUser.username}`,
            note: `Monthly auto-spend of ${pm.assumedMonthlyCookiePrice} cookies for: ${pm.note}`,
            purchaseManifestID: pm.id,
            attribution: "",
            type: TransactionType.DEAL,
            amount: pm.assumedMonthlyCookiePrice,
            thumbnail: pm.thumbnail,
            senderWallet: pm.buyerWallet,
            receiverWallet: pm.escrowWallet,
            senderUserID: pm.buyerUserID,
            receiverUserID: pm.sellerUserID,
            referenceID: pm.referenceID,
            explanations: [
              {
                walletAliasID: pm.buyerWallet,
                explanation: `Monthly auto-spend ${pm.assumedMonthlyCookiePrice} cookies to buy "${pm.title}" from @${sellerUser.username}`,
                amount: -pm.assumedMonthlyCookiePrice,
              },
              {
                walletAliasID: pm.escrowWallet,
                explanation: `Monthly auto-receive ${pm.assumedMonthlyCookiePrice} cookies from @${buyerUser.username} for sale of "${pm.title}"`,
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
          console.log(`_spendTx subitem = ${JSON.stringify(_spendTx.title)}`);
          const transactions: PostTransactionXCloudRequestBody[] = [
            _topUpTx,
            _spendTx,
          ];
          console.log("savings to quantum...");
          const txs = await confirmChargeSuccessSyncQLDB(
            {
              transactions,
            },
            xcloudSecret
          );
          console.log("txs finished:", txs);
        });
        break;
      }
      default: {
        console.log(`Unhandled event type ${event.type}`);
        break;
      }
    }
  }
);
