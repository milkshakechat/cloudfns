import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UpdateWalletXCloudRequestBody, UserID, WalletType } from '@milkshakechat/helpers';
import { updateWallet_QuantumLedger as updateWalletQLDB, initQuantumLedger_Drivers } from '../../services/ledger';
import { UpdateMirrorWallet_Fireledger } from '../../services/mirror-fireledger';
import { initFirebase } from '../../services/firebase';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const updateWallet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('updateWallet');
    console.log('-------- event -------');
    console.log(event);
    console.log('-------- event -------');
    await initQuantumLedger_Drivers();
    console.log('cache proof 4294820');
    await initFirebase();
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'missing request body',
            }),
        };
    }
    console.log('updateWallet...');
    try {
        const body = JSON.parse(event.body) as UpdateWalletXCloudRequestBody;
        console.log('body', body);
        const { walletAliasID, title, note } = body;
        console.log('walletAliasID', walletAliasID);
        const wallet = await updateWalletQLDB({
            walletAliasID,
            title,
            note,
        });
        console.log(`wallet`, wallet);
        if (!wallet) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: `Could not update wallet ${walletAliasID}`,
                }),
            };
        }
        const mirror = await UpdateMirrorWallet_Fireledger({
            balance: wallet.balance,
            walletAliasID,
        });
        console.log(`mirror`, mirror);
        const resp = {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully updated wallet=${wallet.id} walletAliasID=${wallet.walletAliasID}`,
                wallet: wallet,
            }),
        };
        return resp;
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'An error occurred while updating the wallet',
            }),
        };
    }
};
