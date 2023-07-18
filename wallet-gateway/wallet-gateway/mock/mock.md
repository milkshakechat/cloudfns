
# Mock Events Locally
Using `aws sam` for serverless development

## Create Event
```sh
$ cd cloudfns/wallet-gateway/wallet-gateway/
$ sam local generate-event apigateway aws-proxy > mock/template.event.json
```

The event must be JSON stringified. Use https://jsonformatter.org/json-stringify-online

`before`
```
{
        title: 'The Wallet',
        note: 'dope ass',
        userID: '2340429494',
        type: WalletType.TRADING,
        walletAliasID: 'simp5_main-trading-wallet',
    }
```

`after`
```
"{\n    \"title\": \"The Wallet\",\n    \"note\": \"dope ass\",\n    \"userID\": \"2340429494\",\n    \"type\": \"TRADING\",\n    \"walletAliasID\": \"simp5_main-trading-wallet\"\n}"
```

## Test Function

```sh
# reference
$ cd cloudfns/wallet-gateway/
$ sam local invoke "YourLambdaFunctionLogicalId" -e mock/template.event.json -n wallet-gateway/.env.json

# force re-build docker container
$ sam local invoke "YourLambdaFunctionLogicalId" -e mock/template.event.json -n wallet-gateway/.env.json --force-image-build

# you might need to explicitly pass in path to docker host
$ DOCKER_HOST=unix://$HOME/.docker/run/docker.sock sam local invoke "CreateWalletFunction" -e wallet-gateway/functions/create-wallet/create-wallet.event.json --env-vars wallet-gateway/.env.json --force-image-build --container-env-vars wallet-gateway/.env.json

# rebuild the docker image if you have changed the code
$ sam build --profile local-developer-kangze

# all together
$ sam build --profile local-developer-kangze && DOCKER_HOST=unix://$HOME/.docker/run/docker.sock sam local invoke "CreateWalletFunction" -e wallet-gateway/functions/create-wallet/create-wallet.event.json --env-vars wallet-gateway/.env.json --force-image-build --container-env-vars wallet-gateway/.env.json
```


