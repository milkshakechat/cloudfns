import { QLDBClient, DescribeLedgerCommand, CreateLedgerCommand } from '@aws-sdk/client-qldb';
import { accessLocalAWSKeyFile } from '../utils/secrets';
import config from '../config.env';
import { Agent } from 'https';
import { QLDBSessionClientConfig } from '@aws-sdk/client-qldb-session';
import { QldbDriver, RetryConfig, TransactionExecutor } from 'amazon-qldb-driver-nodejs';
import { NodeHttpHandlerOptions } from '@aws-sdk/node-http-handler';
import {
    PostTransactionXCloudRequestBody,
    TransactionID,
    TransactionMetadata,
    TransactionType,
    Transaction_Quantum,
    UserID,
    UserRelationshipHash,
    WalletAliasID,
    WalletID,
    WalletType,
    Wallet_Quantum,
    getMainUserTradingWallet,
    getUserEscrowWallet,
} from '@milkshakechat/helpers';
import { v4 as uuidv4 } from 'uuid';
import { dom, load, dumpBinary, dumpText } from 'ion-js';
import { sleep } from '../utils/utils';

/**
 * Use the qldbDriver to interact with ledgers
 * - can interact with ledgers
 * - cannot create ledgers (use the quantumLedger instead)
 */
export let qldbDriver: QldbDriver;
export const initQuantumLedger_Drivers = async () => {
    console.log('initQuantumLedger_Drivers...');
    const maxConcurrentTransactions = 10;
    const retryLimit = 4;
    //Reuse connections with keepAlive
    const lowLevelClientHttpOptions: NodeHttpHandlerOptions = {
        httpAgent: new Agent({
            maxSockets: maxConcurrentTransactions,
        }),
    };
    console.log('accessLocalAWSKeyFile...');
    const credentials = await accessLocalAWSKeyFile();
    console.log('credentials', credentials);
    const serviceConfigurationOptions: QLDBSessionClientConfig = {
        region: config.LEDGER.region,
        credentials: {
            accessKeyId: credentials.accessKey,
            secretAccessKey: credentials.secretKey,
        },
    };
    console.log('serviceConfigurationOptions', serviceConfigurationOptions);
    const retryConfig: RetryConfig = new RetryConfig(retryLimit);
    console.log('retryConfig', retryConfig);
    console.log('new QldbDriver...');
    // init the ledger
    qldbDriver = new QldbDriver(
        config.LEDGER.name,
        serviceConfigurationOptions,
        lowLevelClientHttpOptions,
        maxConcurrentTransactions,
        retryConfig,
    );
    console.log('qldbDriver', qldbDriver);
    qldbDriver.getTableNames().then(function (tableNames: string[]) {
        console.log(tableNames);
    });
    return qldbDriver;
};
export const domValueWalletToTyped = (result: dom.Value) => {
    const wallet: Wallet_Quantum = {
        id: (result.get('id') || '') as WalletID,
        walletAliasID: (result.get('walletAliasID') || '') as WalletAliasID,
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
export const domValueTransactionToTyped = (result: dom.Value) => {
    console.log(`domValueTransactionToTyped`, result);
    const text = dumpText(result);
    console.log(`text`, text);
    console.log(`typeof text`, typeof text);
    const _tx = JSON.stringify(text);
    console.log(`transaction _tx`, _tx);
    const tx = JSON.parse(_tx) as Transaction_Quantum;
    console.log(`transaction tx`, tx);
    return tx;
};

export const createWallet = async ({
    userID,
    title,
    note = '',
    type,
    walletAliasID,
}: {
    userID: UserID;
    title: string;
    note?: string;
    type: WalletType;
    walletAliasID: WalletAliasID;
}): Promise<Wallet_Quantum> => {
    const p: Promise<Wallet_Quantum> = new Promise(async (res, rej) => {
        console.log('createWalletQLDB...');
        try {
            const wallet = await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
                console.log('txn.executeLambda...');
                // Check if doc with match condition exists
                // This is critical to make this transaction idempotent
                const results = (
                    await txn.execute('SELECT * FROM Wallets WHERE walletAliasID = ?', walletAliasID)
                ).getResultList();
                console.log(`results: ${JSON.stringify(results)}`);
                console.log(`results.length: ${results.length}`);
                // Insert the document after ensuring it doesn't already exist
                if (results.length == 0) {
                    const id = uuidv4() as WalletID;
                    console.log(`id: ${id}`);
                    const now = new Date();
                    const doc: Partial<Wallet_Quantum> = {
                        id: id,
                        walletAliasID,
                        ownerID: userID,
                        title,
                        note,
                        type,
                        balance: 0,
                        isLocked: false,
                        createdAt: now,
                    };
                    console.log(`doc: ${JSON.stringify(doc)}`);
                    // Create a sample Ion doc
                    const ionDoc = load(dumpBinary(doc));
                    console.log(`ionDoc: ${JSON.stringify(ionDoc)}`);
                    if (ionDoc !== null) {
                        const result = await txn.execute('INSERT INTO Wallets ?', ionDoc);
                        const documentId = result.getResultList()[0].get('documentId');
                        console.log(`documentId: ${documentId}`);
                        const resultSet = await txn.execute(
                            `SELECT * FROM Wallets AS w BY docId WHERE docId = ?`,
                            documentId,
                        );
                        const insertedDocument = resultSet.getResultList()[0];
                        console.log(`insertedDocument: ${JSON.stringify(insertedDocument)}`);
                        const wallet = domValueWalletToTyped(insertedDocument);
                        console.log(`Successfully inserted document<Wallet> into table: ${JSON.stringify(wallet)}`);
                        return wallet;
                    } else {
                        throw Error('ionDoc is null');
                    }
                } else {
                    console.log(`Wallet already exists for userID=${userID} or walletAliasID=${walletAliasID}`);
                    const preexistingWallet = domValueWalletToTyped(results[0]);
                    console.log(`preexistingWallet: ${JSON.stringify(preexistingWallet)}`);
                    return preexistingWallet;
                }
            });
            if (wallet) {
                res(wallet);
            } else {
                console.log('wallet', wallet);
                rej('wallet is null');
            }
        } catch (e) {
            console.log('createWalletQLDB error', e);
            rej(e);
        }
    });
    return p;
};

export const getWallet_QuantumLedger = async ({
    walletAliasID,
}: {
    walletAliasID: WalletAliasID;
}): Promise<Wallet_Quantum | undefined> => {
    const p: Promise<Wallet_Quantum | undefined> = new Promise(async (res, rej) => {
        await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            const results = (
                await txn.execute(`SELECT * FROM Wallets WHERE walletAliasID = '${walletAliasID}'`)
            ).getResultList();
            const matches = results.map((result) => {
                const wallet = domValueWalletToTyped(result);
                console.log(`Found wallet: ${JSON.stringify(wallet)}`);
                return wallet;
            });
            const wallet = matches ? matches[0] : undefined;
            res(wallet);
        });
    });
    return p;
};

export const updateWallet_QuantumLedger = async ({
    walletAliasID,
    title,
    note,
}: {
    walletAliasID: WalletAliasID;
    title?: string;
    note?: string;
}): Promise<Wallet_Quantum> => {
    console.log('updateWallet_QuantumLedger...');
    const p: Promise<Wallet_Quantum> = new Promise((res, rej) => {
        if (!title && !note) {
            rej();
        }
        qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            const _title = title ? load(title) : null;
            const _note = note ? load(note) : null;
            console.log(`_title = ${_title} & _note = ${_note}`);
            await txn.execute(
                `
                UPDATE Wallets SET
                ${_title ? `title = '${title}',` : ''}
                ${_note ? `note = '${note}'` : ''}
                WHERE walletAliasID = '${walletAliasID}'
              `,
            );
            console.log('Executed update query');
            const resultSet = await txn.execute(`SELECT * FROM Wallets WHERE walletAliasID = ?`, walletAliasID);
            console.log('Executed select query');
            const updatedDocument = resultSet.getResultList()[0];
            console.log(`Successfully updated document into table: ${JSON.stringify(updatedDocument)}`);
            const wallet = domValueWalletToTyped(updatedDocument);
            console.log('wallet', wallet);
            res(wallet);
        });
    });
    return p;
};

export const createTransaction_QuantumLedger = async (
    args: PostTransactionXCloudRequestBody,
): Promise<Transaction_Quantum> => {
    const p: Promise<Transaction_Quantum> = new Promise(async (res, rej) => {
        console.log('createTransactionQLDB...');
        const amount = args.amount;
        const explainedAmount = args.explanations
            .filter((e) => e.amount > 0)
            .reduce((acc, curr) => acc + curr.amount, 0);
        const deductedAmount =
            args.explanations.filter((e) => e.amount < 0).reduce((acc, curr) => acc + curr.amount, 0) * -1;
        const netZeroAmount = args.explanations.reduce((acc, curr) => acc + curr.amount, 0);
        if (amount !== deductedAmount || amount !== explainedAmount || netZeroAmount !== 0) {
            console.log(`amount ${amount} !== explainedAmount ${explainedAmount}`);
            rej(
                `amount ${amount} !== explainedAmount ${explainedAmount} !== deductedAmount ${deductedAmount}, vs netZeroAmount ${netZeroAmount}`,
            );
        }

        try {
            const transaction = await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
                console.log('txn.executeLambda...');

                const [senderWalletQLDB, receiverWalletQLDB] = await Promise.all([
                    getWallet_QuantumLedger({
                        walletAliasID: args.senderWallet,
                    }),
                    getWallet_QuantumLedger({
                        walletAliasID: args.receiverWallet,
                    }),
                ]);

                if (!senderWalletQLDB) {
                    console.log(`yourWallet is null`);
                    rej(`yourWallet is null`);
                    return;
                }
                if (senderWalletQLDB.balance < amount) {
                    rej('You do not have enough money');
                    return;
                }
                if (!receiverWalletQLDB) {
                    console.log(`receiverWalletQLDB is null`);
                    rej(`receiverWalletQLDB is null`);
                    return;
                }

                const senderWalletUpdatedBalance = parseFloat(`${senderWalletQLDB.balance}`) - parseFloat(`${amount}`);
                const receiverWalletUpdatedBalance =
                    parseFloat(`${receiverWalletQLDB.balance}`) + parseFloat(`${amount}`);

                const txType = args.type;
                const id = uuidv4() as TransactionID;
                console.log(`id: ${id}`);
                const now = new Date();
                const transactionMetadata: TransactionMetadata = {
                    transactionID: id,
                };
                if (txType === TransactionType.DEAL && args.dealMetadata) {
                    transactionMetadata.dealMetadata = args.dealMetadata;
                }
                if (txType === TransactionType.TOP_UP && args.topUpMetadata) {
                    transactionMetadata.topUpMetadata = args.topUpMetadata;
                }
                if (txType === TransactionType.TRANSFER && args.transferMetadata) {
                    transactionMetadata.transferMetadata = args.transferMetadata;
                }
                const explanations = args.explanations.reduce(
                    (acc, curr) => {
                        return {
                            ...acc,
                            [curr.walletAliasID]: curr,
                        };
                    },
                    {} as Record<
                        WalletAliasID,
                        {
                            walletAliasID: WalletAliasID;
                            explanation: string;
                            amount: number;
                        }
                    >,
                );
                const doc: Partial<Transaction_Quantum> = {
                    // base info
                    id,
                    title: args.title,
                    note: args.note,
                    createdAt: now,
                    // foriegn keys
                    sendingWallet: args.senderWallet,
                    recievingWallet: args.receiverWallet, // escrow wallet
                    purchaseManifestID: args.purchaseManifestID,
                    // archive log with pov (may include future creditors such as club boss)
                    explanations,
                    amount: args.amount,
                    type: args.type,
                    attribution: args.attribution,
                    gotReverted: false,
                    metadata: transactionMetadata,
                };
                console.log(`doc: ${JSON.stringify(doc)}`);
                // Create a sample Ion doc
                try {
                    const bd = dumpBinary(doc);
                    console.log(`bd: ${bd}`);
                    const ionDoc = load(bd);
                    console.log(`ionDoc: ${JSON.stringify(ionDoc)}`);
                    if (ionDoc !== null) {
                        const result = await txn.execute('INSERT INTO Transactions ?', ionDoc);
                        console.log('result', result);
                        const documentId = result.getResultList()[0].get('documentId');
                        console.log(`documentId: ${documentId}`);
                        const resultSet = await txn.execute(
                            `SELECT * FROM Transactions AS w BY docId WHERE docId = ?`,
                            documentId,
                        );
                        const insertedDocument = resultSet.getResultList()[0];
                        console.log(`insertedDocument: ${JSON.stringify(insertedDocument)}`);
                        const tx = domValueTransactionToTyped(insertedDocument);
                        console.log(`Successfully inserted document<Transaction> into table: ${JSON.stringify(tx)}`);
                        await txn.execute(
                            `
                          UPDATE Wallets SET
                          balance = '${senderWalletUpdatedBalance}'
                          WHERE walletAliasID = '${args.senderWallet}'
                        `,
                        );
                        console.log(`Successfully updated sender wallet balance to ${senderWalletUpdatedBalance}`);
                        await txn.execute(
                            `
                            UPDATE Wallets SET
                            balance = '${receiverWalletUpdatedBalance}'
                            WHERE walletAliasID = '${args.receiverWallet}'
                        `,
                        );
                        console.log(`Successfully updated receiver wallet balance to ${receiverWalletUpdatedBalance}`);
                        return tx;
                    } else {
                        throw Error('ionDoc is null');
                    }
                } catch (e) {
                    console.log(e);
                    console.log(`--- big error`);
                }
            });
            if (transaction) {
                res(transaction);
            } else {
                console.log('transaction', transaction);
                rej('transaction is null');
            }
        } catch (e) {
            console.log('post transaction error', e);
            rej(e);
        }
    });
    return p;
};
