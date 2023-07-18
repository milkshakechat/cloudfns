// $ cd cloudfns/wallet-gateway/wallet-gateway/
// $ npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register ./scripts/test-create-wallet.ts

import { WalletType } from '@milkshakechat/helpers';
import { createWallet } from '../app';
import { initFirebase } from '../services/firebase';
import { decodeBody, encodeBody } from '../utils/utils';

const run = async () => {
    console.log(`Running script templateScript...`);
    // await initFirebase();
    // await createWallet();
    // const decodedBody = decodeBody('eyJ0aXRsZSI6IlRoZSBXYWxsZXQiLCJub3RlIjoiZG9wZSBhc3MiLCJ1c2VySUQiOiIyMzQwNDI5NDk0IiwidHlwZSI6IlRSQURJTkciLCJ3YWxsZXRBbGlhc0lEIjoic2ltcDVfbWFpbi10cmFkaW5nLXdhbGxldCJ9');
    // console.log(decodedBody);

    const encodedBody = encodeBody({
        title: 'The Wallet',
        note: 'dope ass',
        userID: '2340429494',
        type: WalletType.TRADING,
        walletAliasID: 'simp5_main-trading-wallet',
    }); // "eyJ0aXRsZSI6IlRoZSBXYWxsZXQiLCJub3RlIjoiZG9wZSBhc3MiLCJ1c2VySUQiOiIyMzQwNDI5NDk0IiwidHlwZSI6IlRSQURJTkciLCJ3YWxsZXRBbGlhc0lEIjoic2ltcDVfbWFpbi10cmFkaW5nLXdhbGxldCJ9"
    console.log(encodedBody);
};
run();
