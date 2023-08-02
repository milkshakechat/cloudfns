/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import { onRequest } from "firebase-functions/v2/https";
import {
  SubscribedEventGroupChannelMessageSend,
  handleSendBirdToFCM,
} from "../services/push";
import * as crypto from "crypto";
import { getSendbirdSecret } from "../utils/secrets";

// request.body = https://sendbird.com/docs/chat/v3/platform-api/webhook/events/group-channel#2-group-channel-message-send
export const sendbirdpushnotifications = onRequest(
  { cors: ["sendbird.com"], timeoutSeconds: 300 },
  async (request, response) => {
    console.log("----> sendbirdPushNotifications");
    const rawBody = request.rawBody;
    const signature = request.get("x-sendbird-signature");
    const sendBirdToken = await getSendbirdSecret();
    const hash = crypto
      .createHmac("sha256", sendBirdToken)
      .update(rawBody)
      .digest("hex");
    if (signature !== hash) {
      throw new Error("Invalid sendbird signature");
    }
    response.status(200).send("OK");
    console.log(`Timestamp of invokation: ${Date.now().toString()}`);
    const sendBirdEvent: SubscribedEventGroupChannelMessageSend = request.body;
    console.log(sendBirdEvent.payload.message);
    await handleSendBirdToFCM({
      channelUrl: sendBirdEvent.channel.channel_url,
      payload: sendBirdEvent,
    });
  }
);
