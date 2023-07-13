import { BucketDef } from "@milkshakechat/helpers";

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
      secretId: "xcloud-create-wallet-gcp-to-aws-api-gateway",
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
  CREATE_WALLET: {
    url: "https://xcloud-api-gateway.execute-api.ap-northeast-1.amazonaws.com/dev/create-wallet",
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
      secretId: "xcloud-create-wallet-gcp-to-aws-api-gateway",
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
  CREATE_WALLET: {
    url: "https://xcloud-api-gateway.execute-api.ap-northeast-1.amazonaws.com/dev/create-wallet",
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
      secretId: "xcloud-create-wallet-gcp-to-aws-api-gateway",
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
  CREATE_WALLET: {
    url: "https://xcloud-api-gateway.execute-api.ap-northeast-1.amazonaws.com/dev/create-wallet",
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
  CREATE_WALLET: {
    url: string;
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
