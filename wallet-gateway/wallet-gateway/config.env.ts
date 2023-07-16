import { WalletAliasID } from '@milkshakechat/helpers';

const devConfig: ConfigEnv = {
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
};

const stagingConfig: ConfigEnv = {
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
};

const prodConfig: ConfigEnv = {
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
    };
    LEDGER: {
        region: string;
        name: string;
        tables: {
            [key in QuantumLedgerTables]: QuantumLedgerTable;
        };
        globalStoreWallet: WalletAliasID;
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
