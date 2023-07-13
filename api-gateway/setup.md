# AWS API Gateway

Make sure you have `aws` cli v2 installed and configured.

## Authorization

To be able to use `aws` cli, we will need an access key for managing cloud resources:

```txt
AWS CLI v2 introduced a new feature to simplify the process of configuring your AWS CLI by facilitating sign-in through the AWS Management Console. It's called aws configure import. Here is how you can use it:

Navigate to the AWS Management Console using your web browser.

Click on your username at the top right of the console homepage.

Click on "My Security Credentials."

Scroll down to "Access keys for CLI, SDK, & API access."

Click "Create Access Key."

Click "Show" to reveal your new access key. Copy the Access key ID and Secret access key to a CSV file. The CSV should be formatted like this:

csv
Copy code
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
Use the aws configure import --csv file://path_to_your_file.csv command to import the credentials to your AWS CLI.
```

## Wallet Management

Setup
```sh
$ aws apigateway create-rest-api --name 'wallet-manager' --region us-west-2
```