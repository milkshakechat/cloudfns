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
}

export default (() => {
    // console.log(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
    if (process.env.NODE_ENV === 'production') {
        return prodConfig;
    } else if (process.env.NODE_ENV === 'staging') {
        return stagingConfig;
    }
    return devConfig;
})();
