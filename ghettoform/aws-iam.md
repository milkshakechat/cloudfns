# AWS IAM

## Wallet Management

Wallet management should be handled by only an API Gateway function that is essentially an express HTTP service for CRUD operations on wallet & transaction. Anything involving Quantum Ledger Database (QLDB) should be handled by this API Gateway function.

Create the below AWS iam user `iam:user:wallet-api-gateway` and attach to it permissions for managing QLDB & DynamoDB. Then attach it to your API Gateway function.

`iam:user:wallet-api-gateway`
- attached policies: [
  `iam:policy:AmazonQLDBFullAccess`,
  `iam:policy:AmazonDynamoDBFullAccess`
  ]


## Secret Manager
Secrets are saved to either google cloud secret manager or AWS secret manager. However, to access it we must first use the service account `wallet-api-gateway` to access the cloud secret manager.

Locally we hash the service account `wallet-api-gateway` key as json into `.env` file as `WALLET_GATEWAY_BASE64_KEY`.

```js
const wallet_api_gateway = {
  accessKey: "______",
  secretKey: "_________"
}
const base64EncodedKey_AWS = btoa(JSON.stringify(wallet_api_gateway))
```

Now save `base64EncodedKey` into your `.ENV` file like so:

```.env
WALLET_GATEWAY_BASE64_KEY=ayJ0eXBlIjoi....291bnQuY29tIn0=
```

Then `secrets.ts:accessSecretVersionAWS` will be able to read from the secret manager. Those secrets are listed here:

Also, make sure you have the following IAM policy attached to your user `rn:aws:iam::______:user/dairyfarm-backend` which is the assumed service account user that the `wallet-gateway` uses (sorry for the confusing name, its cuz dairyfarm server accesses the same token as wallet-gateway)

`iam policy for wallet-gateway (will assume dairyfarm-backend iam user)`
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue",
                "secretsmanager:DescribeSecret"
            ],
            "Resource": "arn:aws:secretsmanager:ap-northeast-1:484953066935:secret:xcloud-wallet-gateway-gcp-to-aws/dev-a2fIvk"
        }
    ]
}
```