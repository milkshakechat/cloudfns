import {
  CreateWalletXCloudRequestBody,
  UserID,
  WalletType,
  getMainUserTradingWallet,
} from "@milkshakechat/helpers";
import { getCreateWalletXCloudAWSSecret } from "../utils/secrets";
import axios from "axios";
import config from "../config.env";

export const createNewUserWallet = async ({ userID }: { userID: UserID }) => {
  console.log("createNewUserWallet...");
  const newWallet: CreateWalletXCloudRequestBody = {
    title: `Main Wallet for User ${userID}`,
    userRelationshipHash: getMainUserTradingWallet(userID),
    note: "Created automatically upon user creation",
    userID,
    type: WalletType.TRADING,
  };
  console.log("newWallet", newWallet);
  const xcloudSecret = await getCreateWalletXCloudAWSSecret();
  console.log("xcloudSecret", xcloudSecret);
  console.log(
    "config.WALLET_GATEWAY.createWallet.url",
    config.WALLET_GATEWAY.createWallet.url
  );
  const xcloudResponse = await axios(config.WALLET_GATEWAY.createWallet.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: xcloudSecret,
    },
    data: newWallet,
  });
  console.log("----- xcloudResponse ------");
  console.log(xcloudResponse);
  console.log("----- xcloudResponse ------");
  return xcloudResponse;
};
