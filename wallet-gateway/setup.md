# AWS API Gateway

Make sure you have `aws` cli v2 installed and configured.

## Authorization

To be able to use `aws` cli, we will need an access key for managing cloud resources. Create a new user in AWS IAM and attach to it the policies you need. Or use the role `Trusted-Senior-Developers`

Then create a csv file with the following format:

`aws-cli-credentials.csv`
```csv
User Name, Access key ID,Secret access key
aws-iam-username, 00001,00002
```

Use the aws configure import --csv file://path_to_your_file.csv command to import the credentials to your AWS CLI.

Every time you use aws cli you must run this import.

```sh
$ cd cloudfns/api-gateway/
$ aws configure import --csv file://./aws-cli-credentials.csv
```

Check if the credentials are in your aws config and then use it.

```sh
$ tail ~/.aws/credentials

> [local-developer-kangze]
aws_access_key_id = ____________
aws_secret_access_key = ___________
```
Check if the credentials are working:
```sh
$ aws sts get-caller-identity --profile local-developer-kangze

> {
    "UserId": "__________",
    "Account": "__________",
    "Arn": "arn:aws:iam::________:user/local-developer-kangze"
}
```

Every time you use aws cli commands, you must append `--profile local-developer-kangze` to the command. You can also set this as your default profile.

Make sure you delete the credentials from your computer when you are done.

```sh
$ rm ./aws-cli-credentials.csv
```


## Wallet Management

Setup
```sh
$ aws apigateway create-rest-api --name 'wallet-manager-dev' --region ap-northeast-1 --profile local-developer-kangze
```

## Development

AWS Gateway is managed with a helper sdk called `aws sam` for serverless application management. It is used for type gen, local development, and deployment.

Info about different AWS services you can mock & generate types for:
```sh
$ sam local generate-event apigateway http-api-proxy --help
```
For now, dont worry about these because we are just using the `http-api-proxy` event. See the helloWorld example for more info.

## Deployment

When deploying `sam deploy`, make sure you do not disable rollback!

```sh
$ sam build --profile local-developer-kangze
$ sam deploy --guided --profile local-developer-kangze
```

Note that this only deploys your resources. The actual API gateway is not yet deployed and you can do that manually in the AWS console `API Gateway`. You must pick a stage to deploy to (prod, stagin, dev, etc.)

## Invokation

After you deploy your API Gateway, you can invoke it with the below following command. Note how the format `https://${api-id}.execute-api.${region}.amazonaws.com/${stage}/${path}` is used.

```sh

```js
// example only
fetch({
  url: "https://bfdd9lusb8.execute-api.ap-northeast-1.amazonaws.com/Stage/hello",
  method: "post",
  body: {
    "message": "You said title=hello and note=everyone"
  },
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "your-api-key"
  }
})
```