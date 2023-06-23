/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import { onRequest } from "firebase-functions/v2/https";
import { handleSendBirdToFCM } from "../services/push";

// request.body = https://sendbird.com/docs/chat/v3/platform-api/webhook/events/group-channel#2-group-channel-message-send
export const sendbirdPushNotifications = onRequest(
  { cors: ["sendbird.com"] },
  async (request, response) => {
    console.log("----> sendbirdPushNotifications");
    response.status(200).send("OK");
    console.log(`Timestamp of invokation: ${Date.now().toString()}`);
    const sendBirdEvent: SubscribedEventGroupChannelMessageSend = request.body;
    console.log(sendBirdEvent.payload.message);
    handleSendBirdToFCM({
      channelUrl: sendBirdEvent.channel.channel_url,
      payload: sendBirdEvent,
    });
  }
);

export interface SubscribedEventGroupChannelMessageSend {
  category: string;
  sender: {
    user_id: string;
    nickname: string;
    profile_url: string;
    metadata: Record<string, unknown>;
  };
  silent: boolean;
  sender_ip_addr: string;
  custom_type: string;
  mention_type: string;
  mentioned_users: any[]; // You may want to specify a type for the elements if possible
  parent_message_id?: number;
  members: {
    user_id: string;
    nickname: string;
    profile_url: string;
    is_active: boolean;
    is_online: boolean;
    is_hidden: number;
    state: string;
    is_blocking_sender: boolean;
    is_blocked_by_sender: boolean;
    unread_message_count: number;
    total_unread_message_count: number;
    channel_unread_message_count: number;
    channel_mention_count: number;
    push_enabled: boolean;
    push_trigger_option: string;
    do_not_disturb: boolean;
    metadata: Record<string, unknown>;
  }[];
  type: string;
  payload: {
    message_id: number;
    custom_type: string;
    message: string;
    translations: Record<string, string>;
    created_at: number;
    data: string;
  };
  message_events: {
    update_last_message: boolean;
    update_unread_count: boolean;
    update_mention_count: boolean;
    send_push_notification: string;
  };
  channel: {
    name: string;
    channel_url: string;
    custom_type: string;
    is_distinct: boolean;
    is_public: boolean;
    is_super: boolean;
    is_ephemeral: boolean;
    is_discoverable: boolean;
    data: string;
  };
  sdk: string;
  app_id: string;
}
