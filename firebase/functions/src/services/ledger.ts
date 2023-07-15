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

  const xcloudSecret = await getCreateWalletXCloudAWSSecret();
  // console.log("xcloudSecret", xcloudSecret);
  // console.log(
  //   "config.WALLET_GATEWAY.createWallet.url",
  //   config.WALLET_GATEWAY.createWallet.url
  // );
  const newWallet: CreateWalletXCloudRequestBody = {
    title: `Main Wallet for User ${userID}`,
    userRelationshipHash: getMainUserTradingWallet(userID),
    note: "Created automatically upon user creation",
    userID,
    type: WalletType.TRADING,
  };
  console.log("newWallet", newWallet);
  const xcloudResponse = await axios.post(
    config.WALLET_GATEWAY.createWallet.url,
    newWallet,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: xcloudSecret,
      },
    }
  );
  console.log("----- xcloudResponse ------");
  // console.log(xcloudResponse);
  return xcloudResponse;
};
