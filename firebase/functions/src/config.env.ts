const devConfig: ConfigEnv = {
  GCLOUD: {
    projectId: "milkshake-dev-faf77",
  },
  SECRETS: {
    FIREBASE_CONFIG: {
      secretId: "firebase-init",
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
