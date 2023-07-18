// $ cd cloudfns/wallet-gateway/wallet-gateway/
// $ npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register ./scripts/template-script.ts

import { initFirebase } from '../services/firebase';

const run = async () => {
    console.log(`Running script templateScript...`);
    await initFirebase();
};
run();
