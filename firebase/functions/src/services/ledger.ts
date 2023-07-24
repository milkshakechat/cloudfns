import {
  ConfirmChargeXCloudRequestBody,
  CreateWalletXCloudRequestBody,
  UserID,
  WalletType,
  Wallet_Quantum,
  getMainUserTradingWallet,
  getUserEscrowWallet,
} from "@milkshakechat/helpers";
import { getCreateWalletXCloudAWSSecret } from "../utils/secrets";
import axios from "axios";
import config from "../config.env";

export const createNewUserWallets = async ({ userID }: { userID: UserID }) => {
  console.log("createNewUserWallets...");

  const xcloudSecret = await getCreateWalletXCloudAWSSecret();
  // console.log("xcloudSecret", xcloudSecret);
  // console.log(
  //   "config.WALLET_GATEWAY.createWallet.url",
  //   config.WALLET_GATEWAY.createWallet.url
  // );
  const newTradingWallet: CreateWalletXCloudRequestBody = {
    title: `Main Trading Wallet for User ${userID}`,
    walletAliasID: getMainUserTradingWallet(userID),
    note: "Created automatically upon user creation",
    userID,
    type: WalletType.TRADING,
  };
  const newEscrowWallet: CreateWalletXCloudRequestBody = {
    title: `Main Escrow Wallet for User ${userID}`,
    walletAliasID: getUserEscrowWallet(userID),
    note: "Created automatically upon user creation",
    userID,
    type: WalletType.ESCROW,
  };
  console.log("newTradingWallet", newTradingWallet);
  console.log("newEscrowWallet", newEscrowWallet);
  const [tradingWalletResp, escrowWalletResp] = await Promise.all([
    axios.post(config.WALLET_GATEWAY.createWallet.url, newTradingWallet, {
      headers: {
        "Content-Type": "application/json",
        Authorization: xcloudSecret,
      },
    }),
    axios.post(config.WALLET_GATEWAY.createWallet.url, newEscrowWallet, {
      headers: {
        "Content-Type": "application/json",
        Authorization: xcloudSecret,
      },
    }),
  ]);
  console.log("----- xcloudResponse ------");
  // console.log(xcloudResponse);
  return {
    tradingWallet: tradingWalletResp.data.wallet as Wallet_Quantum,
    escrowWallet: escrowWalletResp.data.wallet as Wallet_Quantum,
  };
};

export const confirmChargeSuccessSyncQLDB = async (
  { transactions }: ConfirmChargeXCloudRequestBody,
  providedXCloudSecret?: string
) => {
  console.log("confirmChargeSuccessSyncQLDB...");

  const xcloudSecret = providedXCloudSecret
    ? providedXCloudSecret
    : await getCreateWalletXCloudAWSSecret();
  // console.log("xcloudSecret", xcloudSecret);
  // console.log(
  //   "config.WALLET_GATEWAY.createWallet.url",
  //   config.WALLET_GATEWAY.createWallet.url
  // );
  const body: ConfirmChargeXCloudRequestBody = {
    transactions,
  };
  console.log(`POST to ${config.WALLET_GATEWAY.confirmCharge.url}`);
  const res = await axios.post(config.WALLET_GATEWAY.confirmCharge.url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: xcloudSecret,
    },
  });
  console.log("res", res);
  console.log("----- xcloudResponse ------");
  // console.log(xcloudResponse);
  return;
};
