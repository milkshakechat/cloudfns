import { QLDBClient, DescribeLedgerCommand, CreateLedgerCommand } from '@aws-sdk/client-qldb';
import { accessLocalAWSKeyFile } from '../utils/secrets';
import config from '../config.env';
import { Agent } from 'https';
import { QLDBSessionClientConfig } from '@aws-sdk/client-qldb-session';
import { QldbDriver, RetryConfig, TransactionExecutor } from 'amazon-qldb-driver-nodejs';
import { NodeHttpHandlerOptions } from '@aws-sdk/node-http-handler';
import { UserID, UserRelationshipHash, WalletID, WalletType, Wallet_Quantum } from '@milkshakechat/helpers';
import { v4 as uuidv4 } from 'uuid';
import { dom, load, dumpBinary } from 'ion-js';
import { sleep } from '../utils/utils';

/**
 * Use the qldbDriver to interact with ledgers
 * - can interact with ledgers
 * - cannot create ledgers (use the quantumLedger instead)
 */
export let qldbDriver: QldbDriver;
export const initQuantumLedger_Drivers = async () => {
    const maxConcurrentTransactions = 10;
    const retryLimit = 4;
    //Reuse connections with keepAlive
    const lowLevelClientHttpOptions: NodeHttpHandlerOptions = {
        httpAgent: new Agent({
            maxSockets: maxConcurrentTransactions,
        }),
    };
    const credentials = await accessLocalAWSKeyFile();
    const serviceConfigurationOptions: QLDBSessionClientConfig = {
        region: config.LEDGER.region,
        credentials: {
            accessKeyId: credentials.accessKey,
            secretAccessKey: credentials.secretKey,
        },
    };
    const retryConfig: RetryConfig = new RetryConfig(retryLimit);

    // init the ledger
    qldbDriver = new QldbDriver(
        config.LEDGER.name,
        serviceConfigurationOptions,
        lowLevelClientHttpOptions,
        maxConcurrentTransactions,
        retryConfig,
    );
    qldbDriver.getTableNames().then(function (tableNames: string[]) {
        console.log(tableNames);
    });
    return qldbDriver;
};

export const createWallet = async ({
    userRelationshipHash,
    userID,
    title,
    note = '',
    type,
}: {
    userRelationshipHash: UserRelationshipHash;
    userID: UserID;
    title: string;
    note?: string;
    type: WalletType;
}) => {
    console.log('createWalletQLDB...');
    return await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
        // Check if doc with match condition exists
        // This is critical to make this transaction idempotent
        const results = (
            await txn.execute('SELECT * FROM Wallets WHERE userRelationshipHash = ?', userRelationshipHash)
        ).getResultList();
        // Insert the document after ensuring it doesn't already exist
        if (results.length == 0) {
            const id = uuidv4();
            const now = new Date().toISOString();
            const doc: Record<string, any> = {
                id: id,
                userRelationshipHash: userRelationshipHash,
                ownerID: userID,
                title,
                note,
                type,
                balance: 0,
                isLocked: false,
                createdAt: now,
            };
            // Create a sample Ion doc
            const ionDoc = load(dumpBinary(doc));
            if (ionDoc !== null) {
                const result = await txn.execute('INSERT INTO Wallets ?', ionDoc);
                const insertedDocument = result.getResultList()[0];
                const wallet = domValueWalletToTyped(insertedDocument);
                console.log(`Successfully inserted document into table: ${JSON.stringify(wallet)}`);
                return wallet;
            }
        }
    });
};

export const getWallet_QuantumLedger = async ({
    userRelationshipHash,
}: {
    userRelationshipHash: UserRelationshipHash;
}) => {
    const p = new Promise(async (res, rej) => {
        await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            const results = (
                await txn.execute(`SELECT * FROM Wallets WHERE userRelationshipHash = '${userRelationshipHash}'`)
            ).getResultList();
            const matches = results.map((result) => {
                const wallet = domValueWalletToTyped(result);
                console.log(`Found wallet: ${JSON.stringify(wallet)}`);
                return wallet;
            });
            res(matches);
        });
    });
    return p;
};

export const domValueWalletToTyped = (result: dom.Value) => {
    const wallet: Wallet_Quantum = {
        id: (result.get('id') || '') as WalletID,
        userRelationshipHash: (result.get('userRelationshipHash') || '') as UserRelationshipHash,
        ownerID: (result.get('ownerID') || '') as UserID,
        title: (result.get('title') || '') as string,
        note: (result.get('note') || '') as string,
        createdAt: new Date((result.get('createdAt') || '0') as string),
        balance: (result.get('balance') || 0) as number,
        type: (result.get('type') || '') as WalletType,
        isLocked: (result.get('isLocked') || false) as boolean,
    };
    return wallet;
};

export const updateWallet_QuantumLedger = async ({
    userRelationshipHash,
    title,
    note,
}: {
    userRelationshipHash: UserRelationshipHash;
    title?: string;
    note?: string;
}) => {
    await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
        const _title = title ? load(title) : null;
        const _note = note ? load(note) : null;
        const result = await txn.execute(
            `
        UPDATE Wallets
        ${_title ? `SET title = '${title}'` : ''}
        ${_note ? `SET note = '${note}'` : ''}
        WHERE userRelationshipHash = '${userRelationshipHash}'
      `,
        );
        const updatedDocument = result.getResultList()[0];
        console.log(`Successfully updated document into table: ${JSON.stringify(updatedDocument)}`);
        return updatedDocument;
    });
};
