import * as admin from 'firebase-admin';
import { getFirebaseConfig } from '../utils/secrets';
import { decodeBody } from '../utils/utils';

export let app: admin.app.App;
export let firestore: admin.firestore.Firestore;
export let storage: admin.storage.Storage;
export let auth: admin.auth.Auth;
export let messaging: admin.messaging.Messaging;
export const initFirebase = async () => {
    console.log(`Init Firebase...`);
    // path to repo working directory
    // console.log(`process.env.GCP_KEYFILE_BASE64 `, process.env.GCP_KEYFILE_BASE64);
    const base64KeyFile = Buffer.from(process.env.GCP_KEYFILE_BASE64 || '', 'base64').toString('utf-8');
    console.log(`base64KeyFile gcp`, base64KeyFile);
    console.log(`typeof base64KeyFile`, typeof base64KeyFile);
    const credential = admin.credential.cert(decodeBody(base64KeyFile));
    console.log(`credentials`, credential);
    console.log(`typeof credentials`, typeof credential);
    if (admin.apps.length === 0) {
        console.log(`Init for 1st time`);
        const firebaseConfig = await getFirebaseConfig();
        console.log(`firebaseConfig`, JSON.stringify(firebaseConfig));
        console.log(`========= firebase config ========`);
        // load firebase app credentials using secretmanager
        // https://firebase.google.com/docs/admin/setup#initialize_the_sdk_in_non-google_environments
        app = admin.initializeApp({ ...firebaseConfig, credential });
        firestore = admin.firestore(app);
        firestore.settings({ ignoreUndefinedProperties: true });
        storage = admin.storage(app);
        auth = admin.auth(app);
        messaging = admin.messaging(app);
        console.log(`Firebase initialized...`);
        console.log(`Project ID: ${app.options.projectId}`);
    } else {
        console.log(`Firebase already initialized...`);
    }
};
