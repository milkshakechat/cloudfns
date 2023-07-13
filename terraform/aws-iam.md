# AWS IAM

## Create new wallet in QLDB

Create the below AWS iam policy `iam:policy:allowInsertNewWallet` and attach it to the user `createNewWallet_API_GatewayInfo` that will be used to create the new wallet in QLDB.

`iam:user:createNewWallet_API_GatewayInfo`
- attached policies: [`iam:policy:allowInsertNewWallet`]

`iam:policy:allowInsertNewWallet`
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "qldb:PartiQLInsert"
            ],
            "Resource": "*"
        }
    ]
}
```
