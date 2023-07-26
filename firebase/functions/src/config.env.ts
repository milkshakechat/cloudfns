import { BucketDef, UserID, WalletAliasID } from "@milkshakechat/helpers";

const devConfig: ConfigEnv = {
  GCLOUD: {
    projectId: "milkshake-dev-faf77",
  },
  SECRETS: {
    FIREBASE_CONFIG: {
      secretId: "firebase-init",
      versionId: "latest",
    },
    FCM_SERVER_KEY: {
      secretId: "fcm-server-key",
      versionId: "latest",
    },
    STRIPE_SERVER_KEY: {
      secretId: "stripe-private-key",
      versionId: "latest",
    },
    CREATE_WALLET_XCLOUD_AWS: {
      secretId: "xcloud-wallet-gateway-gcp-to-aws",
      versionId: "latest",
    },
    STRIPE_WEBHOOK: {
      secretId: "stripe-webhook-payment-intent-secret",
      versionId: "latest",
    },
  },
  FIREBASE: {
    apiKey: "AIzaSyAqVL1P4PsE40Bd-Mu8CnqwczpC-hSTaz0",
    authDomain: "milkshake-dev-faf77.firebaseapp.com",
    projectId: "milkshake-dev-faf77",
    storageBucket: "milkshake-dev-faf77.appspot.com",
    messagingSenderId: "642004369083",
    appId: "1:642004369083:web:74b7c685be091ce6b4f39e",
    measurementId: "G-N0YXCSQJ89",
  },
  VIDEO_TRANSCODER: {
    bucket: {
      name: "user-stories-social",
      location: "asia-northeast1",
    },
  },
  WALLET_GATEWAY: {
    createWallet: {
      url: "https://ukywzxz9dc.execute-api.ap-northeast-1.amazonaws.com/Staging/wallet",
    },
    confirmCharge: {
      url: "https://ukywzxz9dc.execute-api.ap-northeast-1.amazonaws.com/Staging/transaction/confirm-charge",
    },
  },
  LEDGER: {
    globalCookieStore: {
      userID: "global-cookie-store-owner" as UserID,
      walletAliasID:
        "milkshake-v0.1_global-cookie-store-wallet" as WalletAliasID,
    },
  },
  STRIPE: {
    MAIN_BILLING_CYCLE_PRODUCT_PRICE: {
      id: "price_1NTvKSBbKljWimkInc1hgIdw",
    },
  },
};
const stagingConfig: ConfigEnv = {
  GCLOUD: {
    projectId: "milkshake-dev-faf77",
  },
  SECRETS: {
    FIREBASE_CONFIG: {
      secretId: "firebase-init",
      versionId: "latest",
    },
    FCM_SERVER_KEY: {
      secretId: "fcm-server-key",
      versionId: "latest",
    },
    STRIPE_SERVER_KEY: {
      secretId: "stripe-private-key",
      versionId: "latest",
    },
    CREATE_WALLET_XCLOUD_AWS: {
      secretId: "xcloud-wallet-gateway-gcp-to-aws",
      versionId: "latest",
    },
    STRIPE_WEBHOOK: {
      secretId: "stripe-webhook-payment-intent-secret",
      versionId: "latest",
    },
  },
  FIREBASE: {
    apiKey: "AIzaSyAqVL1P4PsE40Bd-Mu8CnqwczpC-hSTaz0",
    authDomain: "milkshake-dev-faf77.firebaseapp.com",
    projectId: "milkshake-dev-faf77",
    storageBucket: "milkshake-dev-faf77.appspot.com",
    messagingSenderId: "642004369083",
    appId: "1:642004369083:web:74b7c685be091ce6b4f39e",
    measurementId: "G-N0YXCSQJ89",
  },
  VIDEO_TRANSCODER: {
    bucket: {
      name: "user-stories-social",
      location: "asia-northeast1",
    },
  },
  WALLET_GATEWAY: {
    createWallet: {
      url: "https://ukywzxz9dc.execute-api.ap-northeast-1.amazonaws.com/Staging/wallet",
    },
    confirmCharge: {
      url: "https://ukywzxz9dc.execute-api.ap-northeast-1.amazonaws.com/Staging/transaction/confirm-charge",
    },
  },
  LEDGER: {
    globalCookieStore: {
      userID: "global-cookie-store-owner" as UserID,
      walletAliasID:
        "milkshake-v0.1_global-cookie-store-wallet" as WalletAliasID,
    },
  },
  STRIPE: {
    MAIN_BILLING_CYCLE_PRODUCT_PRICE: {
      id: "price_1NTvKSBbKljWimkInc1hgIdw",
    },
  },
};
const prodConfig: ConfigEnv = {
  GCLOUD: {
    projectId: "milkshake-dev-faf77",
  },
  SECRETS: {
    FIREBASE_CONFIG: {
      secretId: "firebase-init",
      versionId: "latest",
    },
    FCM_SERVER_KEY: {
      secretId: "fcm-server-key",
      versionId: "latest",
    },
    STRIPE_SERVER_KEY: {
      secretId: "stripe-private-key",
      versionId: "latest",
    },
    CREATE_WALLET_XCLOUD_AWS: {
      secretId: "xcloud-wallet-gateway-gcp-to-aws",
      versionId: "latest",
    },
    STRIPE_WEBHOOK: {
      secretId: "stripe-webhook-payment-intent-secret",
      versionId: "latest",
    },
  },
  FIREBASE: {
    apiKey: "AIzaSyAqVL1P4PsE40Bd-Mu8CnqwczpC-hSTaz0",
    authDomain: "milkshake-dev-faf77.firebaseapp.com",
    projectId: "milkshake-dev-faf77",
    storageBucket: "milkshake-dev-faf77.appspot.com",
    messagingSenderId: "642004369083",
    appId: "1:642004369083:web:74b7c685be091ce6b4f39e",
    measurementId: "G-N0YXCSQJ89",
  },
  VIDEO_TRANSCODER: {
    bucket: {
      name: "user-stories-social",
      location: "asia-northeast1",
    },
  },
  WALLET_GATEWAY: {
    createWallet: {
      url: "https://ukywzxz9dc.execute-api.ap-northeast-1.amazonaws.com/Staging/wallet",
    },
    confirmCharge: {
      url: "https://ukywzxz9dc.execute-api.ap-northeast-1.amazonaws.com/Staging/transaction/confirm-charge",
    },
  },
  LEDGER: {
    globalCookieStore: {
      userID: "global-cookie-store-owner" as UserID,
      walletAliasID:
        "milkshake-v0.1_global-cookie-store-wallet" as WalletAliasID,
    },
  },
  STRIPE: {
    MAIN_BILLING_CYCLE_PRODUCT_PRICE: {
      id: "price_1NTvKSBbKljWimkInc1hgIdw",
    },
  },
};

interface SecretConfig {
  secretId: string;
  versionId: string;
}
interface ConfigEnv {
  GCLOUD: {
    projectId: string;
  };
  SECRETS: {
    FIREBASE_CONFIG: SecretConfig;
    FCM_SERVER_KEY: SecretConfig;
    STRIPE_SERVER_KEY: SecretConfig;
    CREATE_WALLET_XCLOUD_AWS: SecretConfig;
    STRIPE_WEBHOOK: SecretConfig;
  };
  FIREBASE: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  VIDEO_TRANSCODER: {
    bucket: BucketDef;
  };
  WALLET_GATEWAY: {
    createWallet: {
      url: string;
    };
    confirmCharge: {
      url: string;
    };
  };
  LEDGER: {
    globalCookieStore: {
      userID: UserID;
      walletAliasID: WalletAliasID;
    };
  };
  STRIPE: {
    MAIN_BILLING_CYCLE_PRODUCT_PRICE: {
      id: string;
    };
  };
}

export default (() => {
  // console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV === "production") {
    return prodConfig;
  } else if (process.env.NODE_ENV === "staging") {
    return stagingConfig;
  }
  return devConfig;
})();
