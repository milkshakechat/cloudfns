import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
    CreateWalletXCloudRequestBody,
    FirestoreCollection,
    UserID,
    WalletAliasID,
    WalletType,
    Wallet_MirrorFireLedger,
} from '@milkshakechat/helpers';
import { createWallet as createWalletQLDB, initQuantumLedger_Drivers } from '../../services/ledger';
import { firestore, initFirebase } from '../../services/firebase';
import { CreateMirrorWallet_Fireledger } from '../../services/mirror-fireledger';
import { createFirestoreDoc } from '../../services/firestore';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const createWallet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('createWallet');
    console.log('going...');
    // console.log(`process.env.GCP_KEYFILE_BASE64`, process.env.GCP_KEYFILE_BASE64);
    // console.log(`process.env.WALLET_GATEWAY_BASE64_KEY`, process.env.WALLET_GATEWAY_BASE64_KEY);
    await initFirebase();
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
    await initQuantumLedger_Drivers();
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    console.log('createWallet...');
    console.log(`can it get past here...`);
    try {
        console.log(`Anything at all`);
        console.log(`event.body = `);
        console.log(JSON.stringify(event.body));
        console.log(`typeof event.body`, typeof event.body);
        const body = JSON.parse(event.body) as CreateWalletXCloudRequestBody;
        console.log('body', body);
        const { userID, title, note, type, walletAliasID } = body;
        console.log('userID', userID);
        const tradingWallet = await createWalletQLDB({
            walletAliasID,
            userID,
            title,
            note,
            type,
        });
        console.log(`tradingWallet`, tradingWallet);
        console.log('finally lets mirror');
        const mirror = await CreateMirrorWallet_Fireledger({
            title,
            balance: tradingWallet.balance,
            walletAliasID,
            userID,
        });
        console.log(`mirror`, mirror);
        if (!tradingWallet) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Could not create a trading wallet for user ${userID}`,
                }),
            };
        }
        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully created wallet=${tradingWallet.id} for user=${userID}`,
                wallet: tradingWallet,
            }),
        };
        return resp;
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'An error occurred while creating the wallet',
            }),
        };
    }
};
