# AWS IAM

## Wallet Management

Wallet management should be handled by only an API Gateway function that is essentially an express HTTP service for CRUD operations on wallet & transaction. Anything involving Quantum Ledger Database (QLDB) should be handled by this API Gateway function.

Create the below AWS iam user `iam:user:wallet-api-gateway` and attach to it permissions for managing QLDB & DynamoDB. Then attach it to your API Gateway function.

`iam:user:wallet-api-gateway`
- attached policies: [
  `iam:policy:AmazonQLDBFullAccess`,
  `iam:policy:AmazonDynamoDBFullAccess`
  ]
