import { SecretConfig, WalletAliasID } from '@milkshakechat/helpers';

const devConfig: ConfigEnv = {
    GCLOUD: {
        projectId: 'milkshake-dev-faf77',
    },
    WALLET_GATEWAY: {
        region: 'ap-northeast-1',
        functions: {
            createWallet: {
                arn: 'arn:aws:lambda:ap-northeast-1:484953066935:function:wallet-gateway-CreateWalletFunction-TwUYVAzQbdKz',
            },
            getWallet: {
                arn: 'arn:aws:lambda:ap-northeast-1:484953066935:function:wallet-gateway-GetWalletFunction-0ysIvPbmAIKI',
            },
        },
    },
    SECRETS: {
        WALLET_GATEWAY_XCLOUD_GCP: {
            SecretId: 'xcloud-wallet-gateway-gcp-to-aws/dev',
        },
        FIREBASE_CONFIG: {
            secretId: 'firebase-init',
            versionId: 'latest',
        },
        FCM_SERVER_KEY: {
            secretId: 'fcm-server-key',
            versionId: 'latest',
        },
        SENDBIRD_API: {
            secretId: 'sendbird-api',
            versionId: 'latest',
        },
    },
    LEDGER: {
        region: 'ap-northeast-1',
        name: 'inapp-wallet-dev',
        tables: {
            WALLET: 'wallets',
            TRANSACTION: 'transactions',
        },
        globalStoreWallet: 'global-store-4e9f9879-d627-401f-abf3-cc2bcf173e26' as WalletAliasID,
    },
    SENDBIRD: {
        SENDBIRD_APP_ID: 'D24F8D62-B601-4978-8DFB-F17DB6CD741F',
        API_URL: 'https://api-D24F8D62-B601-4978-8DFB-F17DB6CD741F.sendbird.com',
        WEBHOOK_URL: 'https://sendbirdpushnotifications-hcdyzvq35a-uc.a.run.app/',
    },
};

const stagingConfig: ConfigEnv = {
    GCLOUD: {
        projectId: 'milkshake-dev-faf77',
    },
    WALLET_GATEWAY: {
        region: 'ap-northeast-1',
        functions: {
            createWallet: {
                arn: 'arn:aws:lambda:ap-northeast-1:484953066935:function:wallet-gateway-CreateWalletFunction-TwUYVAzQbdKz',
            },
            getWallet: {
                arn: 'arn:aws:lambda:ap-northeast-1:484953066935:function:wallet-gateway-GetWalletFunction-0ysIvPbmAIKI',
            },
        },
    },
    SECRETS: {
        WALLET_GATEWAY_XCLOUD_GCP: {
            SecretId: 'xcloud-wallet-gateway-gcp-to-aws/dev',
        },
        FIREBASE_CONFIG: {
            secretId: 'firebase-init',
            versionId: 'latest',
        },
        FCM_SERVER_KEY: {
            secretId: 'fcm-server-key',
            versionId: 'latest',
        },
        SENDBIRD_API: {
            secretId: 'sendbird-api',
            versionId: 'latest',
        },
    },
    LEDGER: {
        region: 'ap-northeast-1',
        name: 'inapp-wallet-dev',
        tables: {
            WALLET: 'wallets',
            TRANSACTION: 'transactions',
        },
        globalStoreWallet: 'global-store-4e9f9879-d627-401f-abf3-cc2bcf173e26' as WalletAliasID,
    },
    SENDBIRD: {
        SENDBIRD_APP_ID: 'D24F8D62-B601-4978-8DFB-F17DB6CD741F',
        API_URL: 'https://api-D24F8D62-B601-4978-8DFB-F17DB6CD741F.sendbird.com',
        WEBHOOK_URL: 'https://sendbirdpushnotifications-hcdyzvq35a-uc.a.run.app/',
    },
};

const prodConfig: ConfigEnv = {
    GCLOUD: {
        projectId: 'milkshake-club',
    },
    WALLET_GATEWAY: {
        region: 'us-east-2',
        functions: {
            createWallet: {
                arn: 'arn:aws:lambda:ap-northeast-1:484953066935:function:wallet-gateway-CreateWalletFunction-TwUYVAzQbdKz',
            },
            getWallet: {
                arn: 'arn:aws:lambda:ap-northeast-1:484953066935:function:wallet-gateway-GetWalletFunction-0ysIvPbmAIKI',
            },
        },
    },
    SECRETS: {
        WALLET_GATEWAY_XCLOUD_GCP: {
            SecretId: 'xcloud-wallet-gateway-gcp-to-aws/dev',
        },
        FIREBASE_CONFIG: {
            secretId: 'firebase-init',
            versionId: 'latest',
        },
        FCM_SERVER_KEY: {
            secretId: 'fcm-server-key',
            versionId: 'latest',
        },
        SENDBIRD_API: {
            secretId: 'sendbird-api',
            versionId: 'latest',
        },
    },
    LEDGER: {
        region: 'us-east-2',
        name: 'inapp-wallet-prod',
        tables: {
            WALLET: 'wallets',
            TRANSACTION: 'transactions',
        },
        globalStoreWallet: 'global-store-4e9f9879-d627-401f-abf3-cc2bcf173e26' as WalletAliasID,
    },
    SENDBIRD: {
        SENDBIRD_APP_ID: 'AE88AAA6-1206-4FEF-B384-052B14A3C6B6',
        API_URL: 'https://api-AE88AAA6-1206-4FEF-B384-052B14A3C6B6.sendbird.com',
        WEBHOOK_URL: 'https://sendbirdpushnotifications-hcdyzvq35a-uc.a.run.app/',
    },
};

export interface SecretConfigAWS {
    SecretId: string; // required
    VersionId?: string;
}
interface ConfigEnv {
    WALLET_GATEWAY: {
        region: string;
        functions: {
            createWallet: {
                arn: string;
            };
            getWallet: {
                arn: string;
            };
        };
    };
    SECRETS: {
        WALLET_GATEWAY_XCLOUD_GCP: SecretConfigAWS;
        FIREBASE_CONFIG: SecretConfig;
        FCM_SERVER_KEY: SecretConfig;
        SENDBIRD_API: SecretConfig;
    };
    GCLOUD: {
        projectId: string;
    };
    LEDGER: {
        region: string;
        name: string;
        tables: {
            [key in QuantumLedgerTables]: QuantumLedgerTable;
        };
        globalStoreWallet: WalletAliasID;
    };
    SENDBIRD: {
        SENDBIRD_APP_ID: string;
        API_URL: string;
        WEBHOOK_URL: string;
    };
}

export enum QuantumLedgerTables {
    WALLET = 'WALLET',
    TRANSACTION = 'TRANSACTION',
}
export type QuantumLedgerTable = string;

export default (() => {
    // console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
    if (process.env.NODE_ENV === 'production') {
        return prodConfig;
    } else if (process.env.NODE_ENV === 'staging') {
        return stagingConfig;
    }
    return devConfig;
})();
