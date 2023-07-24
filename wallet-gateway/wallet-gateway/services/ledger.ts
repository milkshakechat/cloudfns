import { QLDBClient, DescribeLedgerCommand, CreateLedgerCommand } from '@aws-sdk/client-qldb';
import { accessLocalAWSKeyFile } from '../utils/secrets';
import config from '../config.env';
import { Agent } from 'https';
import { QLDBSessionClientConfig } from '@aws-sdk/client-qldb-session';
import { QldbDriver, RetryConfig, TransactionExecutor } from 'amazon-qldb-driver-nodejs';
import { NodeHttpHandlerOptions } from '@aws-sdk/node-http-handler';
import {
    CashOutXCloudRequestBody,
    FirestoreCollection,
    PostTransactionXCloudRequestBody,
    PurchaseMainfestID,
    RecallTransactionXCloudRequestBody,
    TransactionID,
    TransactionMetadata,
    TransactionType,
    Transaction_Quantum,
    UserID,
    UserRelationshipHash,
    WalletID,
    WalletType,
    Wallet_Quantum,
    WishBuyFrequency,
    checkIfEscrowWallet,
    getMainUserTradingWallet,
    getMirrorTransactionID,
    getUserEscrowWallet,
    placeholderWishlistGraphic,
} from '@milkshakechat/helpers';
import { v4 as uuidv4 } from 'uuid';
import { dom, load, dumpBinary, dumpText } from 'ion-js';
import { findUndefinedProperties, sleep } from '../utils/utils';
import { WalletAliasID } from '@milkshakechat/helpers';
import {
    CreateMirrorTx_Fireledger,
    GetMirrorWallet_Fireledger,
    ListMirrorTx_Fireledger,
    UpdateMirrorWallet_Fireledger,
    UpdateTxWallet_Fireledger,
} from './mirror-fireledger';
import { sendNotificationToUser } from './notifications';

/**
 * Use the qldbDriver to interact with ledgers
 * - can interact with ledgers
 * - cannot create ledgers (use the quantumLedger instead)
 */
export let qldbDriver: QldbDriver;
export const initQuantumLedger_Drivers = async () => {
    console.log('initQuantumLedger_Drivers...');
    const maxConcurrentTransactions = 10;
    const retryLimit = 5;
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
const convertIonHashToJSArray = (result: dom.Value | null) => {
    if (result === null) {
        return [];
    }
    const _x = Object.values(result);
    const _y = _x[0];

    const _z = Object.keys(_y);
    const entries = _z.map((_k) => {
        return {
            key: _k,
            value: result.get(_k),
        };
    });
    return entries;
};
export const domValueWalletToTyped = (result: dom.Value) => {
    if (!result) {
        throw Error('provided dom value is null');
    }
    const wallet: Wallet_Quantum = {
        id: (result.get('id')?.stringValue() || '') as WalletID,
        walletAliasID: (result.get('walletAliasID')?.stringValue() || '') as WalletAliasID,
        ownerID: (result.get('ownerID')?.stringValue() || '') as UserID,
        title: (result.get('title')?.stringValue() || '') as string,
        note: (result.get('note')?.stringValue() || '') as string,
        createdAt: new Date((result.get('createdAt')?.dateValue() || '0') as string),
        balance: (result.get('balance')?.numberValue() || 0) as number,
        type: (result.get('type')?.stringValue() || '') as WalletType,
        isLocked: (result.get('isLocked')?.booleanValue() || false) as boolean,
    };
    return wallet;
};
export const domValueTransactionToTyped = (result: dom.Value) => {
    if (!result) {
        throw Error('provided dom value is null');
    }
    const _expls = result.get('explanations');
    const expls = convertIonHashToJSArray(_expls) || [];

    type ExplSeg = {
        walletAliasID: WalletAliasID;
        explanation: string;
        amount: number;
    };
    type ExplSegMap = Record<WalletAliasID, ExplSeg>;
    const explanations = expls.reduce((acc, curr) => {
        const walletAliasID = curr.key;
        const explanation = curr.value?.get('explanation');
        const amount = curr.value?.get('amount');
        return {
            ...acc,
            [walletAliasID]: {
                walletAliasID,
                explanation,
                amount,
            },
        };
    }, {} as ExplSegMap);

    console.log(`explanations`, explanations);

    // const _expls = explFields.map((expl) => {
    //     const x = expl.get(expl);
    // });
    const metadata = result.get('metadata');
    console.log(`metadata`, metadata);
    console.log(`metadata.transactionID`, metadata?.get('transactionID'));

    console.log(`metadata.salesMetadata`, metadata?.get('salesMetadata'));
    console.log(`metadata.recallMetadata`, metadata?.get('recallMetadata'));
    console.log(`metadata.transferMetadata`, metadata?.get('transferMetadata'));
    console.log(`metadata.topUpMetadata`, metadata?.get('topUpMetadata'));
    console.log(`metadata.cashOutMetadata`, metadata?.get('cashOutMetadata'));

    const salesMetadata = metadata?.get('salesMetadata') || undefined;
    const recallMetadata = metadata?.get('recallMetadata') || undefined;
    const transferMetadata = metadata?.get('transferMetadata') || undefined;
    const topUpMetadata = metadata?.get('topUpMetadata') || undefined;
    const cashOutMetadata = metadata?.get('cashOutMetadata') || undefined;

    const tx: Transaction_Quantum = {
        // base info
        id: (result.get('id')?.stringValue() || '') as TransactionID,
        title: result.get('title')?.stringValue() || '',
        note: result.get('note')?.stringValue() || '',
        createdAt: new Date((result.get('createdAt')?.dateValue() || '0') as string),
        // foriegn keys
        sendingWallet: (result.get('sendingWallet')?.stringValue() || '') as WalletAliasID,
        recievingWallet: (result.get('recievingWallet')?.stringValue() || '') as WalletAliasID, // escrow wallet
        purchaseManifestID: (result.get('purchaseManifestID')?.stringValue() || undefined) as PurchaseMainfestID,
        // archive log with pov (may include future creditors such as club boss)
        explanations,
        // transaction details
        amount: (result.get('amount')?.numberValue() || 0) as number,
        type: (result.get('type')?.stringValue() || '') as TransactionType,
        attribution: (result.get('attribution')?.stringValue() || '') as UserRelationshipHash,
        gotRecalled: (result.get('gotRecalled')?.booleanValue() || false) as boolean, // recalled means the money returned to sender
        gotCashOut: (result.get('gotCashOut')?.booleanValue() || false) as boolean, // cashed out means the money was withdrawn from escrow
        recallTransactionID: (result.get('recallTransactionID')?.stringValue() || '') as TransactionID,
        cashOutTransactionID: (result.get('cashOutTransactionID')?.stringValue() || '') as TransactionID,
        metadata: {
            transactionID: (metadata?.get('transactionID') || '') as TransactionID,
            salesMetadata: salesMetadata
                ? {
                      buyerNote: salesMetadata?.get('buyerNote')?.stringValue() || '',
                      promoCode: salesMetadata?.get('promoCode')?.stringValue() || '',
                      // deal details
                      agreedCookiePrice: (salesMetadata?.get('agreedCookiePrice')?.numberValue() || 0) as number,
                      originalCookiePrice: (salesMetadata?.get('originalCookiePrice')?.numberValue() || 0) as number,
                      agreedBuyFrequency: (salesMetadata?.get('agreedBuyFrequency')?.stringValue() ||
                          WishBuyFrequency.ONE_TIME) as WishBuyFrequency,
                      originalBuyFrequency: (salesMetadata?.get('originalBuyFrequency')?.stringValue() ||
                          WishBuyFrequency.ONE_TIME) as WishBuyFrequency,
                  }
                : null,
            recallMetadata: recallMetadata
                ? {
                      originalTransactionID: (recallMetadata?.get('originalTransactionID')?.stringValue() ||
                          '') as TransactionID,
                      recallerWalletID: (recallMetadata?.get('recallerWalletID')?.stringValue() || '') as WalletAliasID,
                      recallerNote: recallMetadata?.get('recallerNote')?.stringValue() || '',
                  }
                : null,
            transferMetadata: transferMetadata
                ? {
                      senderNote: transferMetadata?.get('senderNote')?.stringValue() || '',
                  }
                : null,
            topUpMetadata: topUpMetadata
                ? {
                      internalNote: topUpMetadata?.get('internalNote')?.stringValue() || '',
                      promoCode: topUpMetadata?.get('promoCode')?.stringValue() || '',
                  }
                : null,
            cashOutMetadata: cashOutMetadata
                ? {
                      initiatorWallet: (cashOutMetadata?.get('initiatorWallet')?.stringValue() || '') as WalletAliasID,
                      cashoutCode: (cashOutMetadata?.get('cashoutCode')?.stringValue() || '') as string,
                      originalTransactionID: (cashOutMetadata?.get('originalTransactionID')?.stringValue() ||
                          '') as TransactionID,
                  }
                : null,
        },
    };
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
                    const ionDoc = load(dumpText(doc));
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

export const getWallet_QuantumLedger = async (args: {
    walletAliasID: WalletAliasID;
}): Promise<Wallet_Quantum | undefined> => {
    const p: Promise<Wallet_Quantum | undefined> = new Promise(async (res, rej) => {
        await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            const wallet = await _getWallet(args, txn);
            res(wallet);
        });
    });
    return p;
};

const _getWallet = async (
    args: {
        walletAliasID: WalletAliasID;
    },
    txn: TransactionExecutor,
): Promise<Wallet_Quantum | undefined> => {
    const { walletAliasID } = args;
    const results = (
        await txn.execute(`SELECT * FROM Wallets WHERE walletAliasID = '${walletAliasID}'`)
    ).getResultList();
    const matches = results.map((result) => {
        const wallet = domValueWalletToTyped(result);
        console.log(`Found wallet: ${JSON.stringify(wallet)}`);
        return wallet;
    });
    const wallet = matches ? matches[0] : undefined;
    return wallet;
};

export const updateWallet_QuantumLedger = async (args: {
    walletAliasID: WalletAliasID;
    title?: string;
    note?: string;
}): Promise<Wallet_Quantum | undefined> => {
    console.log('updateWallet_QuantumLedger...');
    const p: Promise<Wallet_Quantum | undefined> = new Promise((res, rej) => {
        const { walletAliasID, title, note } = args;
        if (!walletAliasID || (!title && !note)) {
            rej();
        }
        qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            const wallet = await _updateWallet(args, txn);
            if (wallet === undefined) {
                rej();
            }
            res(wallet);
        });
    });
    return p;
};

const _updateWallet = async (
    args: {
        walletAliasID: WalletAliasID;
        title?: string;
        note?: string;
    },
    txn: TransactionExecutor,
): Promise<Wallet_Quantum | undefined> => {
    const { walletAliasID, title, note } = args;
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
    return wallet;
};

export const createTransaction_QuantumLedger = async (
    args: PostTransactionXCloudRequestBody,
): Promise<Transaction_Quantum> => {
    const p: Promise<Transaction_Quantum> = new Promise(async (res, rej) => {
        console.log('createTransactionQLDB...');
        const [senderWalletMirror, receiverWalletMirror] = await Promise.all([
            GetMirrorWallet_Fireledger({
                walletAliasID: args.senderWallet,
            }),
            GetMirrorWallet_Fireledger({
                walletAliasID: args.receiverWallet,
            }),
        ]);
        try {
            const qldbRes = await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
                console.log('txn.executeLambda...');
                const { tx, callback } = await _createTransaction(args, txn, {
                    receiverOwnerID: receiverWalletMirror.ownerID,
                    senderOwnerID: senderWalletMirror.ownerID,
                });
                console.log('tx', tx);
                if (!tx) {
                    rej(`Failed to create transaction: ${args.title}`);
                    return;
                }
                return { tx, callback };
            });
            if (!qldbRes) {
                rej(`Failed to create transaction: ${args.title}`);
                return;
            } else {
                const { tx, callback } = qldbRes;
                await callback();
                res(tx);
            }
        } catch (e) {
            console.log('post transaction error', e);
            rej(e);
        }
    });
    return p;
};

export const _createTransaction = async (
    args: PostTransactionXCloudRequestBody,
    txn: TransactionExecutor,
    { receiverOwnerID, senderOwnerID }: { receiverOwnerID: UserID; senderOwnerID: UserID },
): Promise<{ tx: Transaction_Quantum; callback: () => Promise<void> }> => {
    const p: Promise<{ tx: Transaction_Quantum; callback: () => Promise<void> }> = new Promise(async (res, rej) => {
        console.log('txn.executeLambda...');

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
            return;
        }

        const [senderWalletQLDB, receiverWalletQLDB] = await Promise.all([
            getWallet_QuantumLedger({
                walletAliasID: args.senderWallet,
            }),
            getWallet_QuantumLedger({
                walletAliasID: args.receiverWallet,
            }),
        ]);
        console.log(`senderWalletQLDB`, senderWalletQLDB);
        console.log(`receiverWalletQLDB`, receiverWalletQLDB);

        if (!senderWalletQLDB) {
            console.log(`yourWallet is null`);
            rej(`yourWallet is null`);
            return;
        }
        console.log(`senderWalletQLDB.balance ${senderWalletQLDB.balance} <= amount ${amount}`);
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
        const receiverWalletUpdatedBalance = parseFloat(`${receiverWalletQLDB.balance}`) + parseFloat(`${amount}`);

        const txType = args.type;
        const id = uuidv4() as TransactionID;
        console.log(`id: ${id}`);
        const now = new Date();
        console.log(`now: `, now);
        const transactionMetadata: TransactionMetadata = {
            transactionID: id,
        };
        if (txType === TransactionType.DEAL && args.salesMetadata) {
            transactionMetadata.salesMetadata = args.salesMetadata;
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
            // archive log with pov (may include future creditors such as club boss)
            explanations,
            amount: args.amount,
            type: args.type,
            attribution: args.attribution ? args.attribution : '',
            gotRecalled: args.gotRecalled ? args.gotRecalled : false,
            gotCashOut: args.gotCashOut ? args.gotCashOut : false,
            recallTransactionID: args.recallMetadata?.originalTransactionID
                ? args.recallMetadata.originalTransactionID
                : ('' as TransactionID),
            cashOutTransactionID: args.cashOutMetadata?.originalTransactionID
                ? args.cashOutMetadata.originalTransactionID
                : ('' as TransactionID),
            metadata: transactionMetadata,
        };
        if (args.purchaseManifestID) {
            doc.purchaseManifestID = args.purchaseManifestID;
        }
        console.log(`doc: ${JSON.stringify(doc)}`);
        findUndefinedProperties(doc);
        // Create a sample Ion doc
        try {
            const bd = dumpText(doc);
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
            balance = ${senderWalletUpdatedBalance},
            mostRecentTransactionID = '${tx.id}',
            mostRecentTransactionNote = '${tx.title}'
            WHERE walletAliasID = '${args.senderWallet}'
          `,
                );
                console.log(`Successfully updated sender wallet balance to ${senderWalletUpdatedBalance}`);
                await txn.execute(
                    `
              UPDATE Wallets SET
              balance = ${receiverWalletUpdatedBalance},
              mostRecentTransactionID = '${tx.id}',
              mostRecentTransactionNote = '${tx.title}'
              WHERE walletAliasID = '${args.receiverWallet}'
          `,
                );
                console.log(`Successfully updated receiver wallet balance to ${receiverWalletUpdatedBalance}`);
                console.log(`Mirroring to firestore...`);

                const callbackSyncFireMirror = async () => {
                    const [txSender, txReceiver, wlSender, wlReceiver] = await Promise.all([
                        CreateMirrorTx_Fireledger({
                            txID: id,
                            sendingWallet: args.senderWallet,
                            recievingWallet: args.receiverWallet,
                            walletAliasID: args.senderWallet,
                            amount: args.amount * -1,
                            note: explanations[args.senderWallet]
                                ? explanations[args.senderWallet].explanation || ''
                                : '',
                            type: args.type,
                            senderUserID: senderOwnerID,
                            recieverUserID: receiverOwnerID,
                            ownerID: senderOwnerID,
                            recallTransactionID: args.recallMetadata?.originalTransactionID,
                            cashOutTransactionID: args.cashOutMetadata?.originalTransactionID,
                            referenceID: args.referenceID,
                            purchaseManifestID: args.purchaseManifestID,
                        }),
                        CreateMirrorTx_Fireledger({
                            txID: id,
                            sendingWallet: args.senderWallet,
                            recievingWallet: args.receiverWallet,
                            walletAliasID: args.receiverWallet,
                            amount: args.amount,
                            note: explanations[args.receiverWallet]
                                ? explanations[args.receiverWallet].explanation || ''
                                : '',
                            type: args.type,
                            senderUserID: senderOwnerID,
                            recieverUserID: receiverOwnerID,
                            ownerID: receiverOwnerID,
                            recallTransactionID: args.recallMetadata?.originalTransactionID,
                            cashOutTransactionID: args.cashOutMetadata?.originalTransactionID,
                            referenceID: args.referenceID,
                            purchaseManifestID: args.purchaseManifestID,
                        }),
                        UpdateMirrorWallet_Fireledger({
                            balance: senderWalletUpdatedBalance,
                            walletAliasID: args.senderWallet,
                        }),
                        UpdateMirrorWallet_Fireledger({
                            balance: receiverWalletUpdatedBalance,
                            walletAliasID: args.receiverWallet,
                        }),
                    ]);
                    console.log(`txSender`, txSender);
                    console.log(`txReceiver`, txReceiver);
                    console.log(`wlSender`, wlSender);
                    console.log(`wlReceiver`, wlReceiver);
                    if (args.sendPushNotif) {
                        const [notifSender, notifReceiver] = await Promise.all([
                            sendNotificationToUser({
                                recipientUserID: senderOwnerID,
                                notification: {
                                    data: {
                                        body: `Tx Success! ${args.title}`,
                                        image: args.thumbnail || placeholderWishlistGraphic,
                                        title: explanations[args.senderWallet]
                                            ? `Tx Success! ${explanations[args.senderWallet].explanation}` || ''
                                            : `Tx Success! ${args.title}`,
                                        route: args.purchaseManifestID
                                            ? `/app/wallet/purchase/${args.purchaseManifestID}`
                                            : `/app/wallet`,
                                    },
                                },
                                shouldPush: true,
                            }),
                            sendNotificationToUser({
                                recipientUserID: receiverOwnerID,
                                notification: {
                                    data: {
                                        body: `Tx Success! ${args.title}`,
                                        image: args.thumbnail || placeholderWishlistGraphic,
                                        title: explanations[args.receiverWallet]
                                            ? `Tx Success! ${explanations[args.receiverWallet].explanation}` || ''
                                            : `Tx Success! ${args.title}`,
                                        route: args.purchaseManifestID
                                            ? `/app/wallet/purchase/${args.purchaseManifestID}`
                                            : `/app/wallet`,
                                    },
                                },
                                shouldPush: true,
                            }),
                        ]);
                        console.log(`notifSender`, notifSender);
                        console.log(`notifReceiver`, notifReceiver);
                    }
                };

                res({
                    tx,
                    callback: callbackSyncFireMirror,
                });
            } else {
                rej('ionDoc is null');
                throw Error('ionDoc is null');
            }
        } catch (e) {
            console.log(e);
            console.error((e as any).stack);
            console.log(`--- big error`);
            rej(e);
        }
    });
    return p;
};

export const getTransaction_QuantumLedger = async (args: {
    transactionID: TransactionID;
}): Promise<Transaction_Quantum | undefined> => {
    const p: Promise<Transaction_Quantum | undefined> = new Promise(async (res, rej) => {
        await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
            const tx = await _getTransaction(args, txn);
            res(tx);
        });
    });
    return p;
};

export const _getTransaction = async (
    args: {
        transactionID: TransactionID;
    },
    txn: TransactionExecutor,
) => {
    const results = (
        await txn.execute(`SELECT * FROM Transactions WHERE id = '${args.transactionID}'`)
    ).getResultList();
    const matches = results.map((result) => {
        const tx = domValueTransactionToTyped(result);
        console.log(`typeof tx = ${typeof tx}`);
        return tx;
    });
    const tx = matches ? matches[0] : undefined;
    console.log(`typeof tx >> ${typeof tx}`);
    console.log(`tx >> ${tx}`);
    return tx;
};

// this will not check for recall expiry date, as that logic assumed to be handled by the caller
export const recallTransaction_QuantumLedger = async (args: RecallTransactionXCloudRequestBody) => {
    const p: Promise<Transaction_Quantum> = new Promise(async (res, rej) => {
        console.log('recallTransactionQLDB...');

        // assume recallable
        try {
            let tx: Transaction_Quantum | undefined;
            let recallTxData: PostTransactionXCloudRequestBody | undefined;
            let recallTxID: TransactionID | undefined;
            let originalSenderWalletUpdatedBalance: number | undefined;
            let originalReceiverWalletUpdatedBalance: number | undefined;
            let _originalSenderWalletQLDB: Wallet_Quantum | undefined;
            let _originalReceiverWalletQLDB: Wallet_Quantum | undefined;
            const txs = await ListMirrorTx_Fireledger({
                txID: args.transactionID,
            });
            const _tx = txs[0];
            console.log(`_tx`, _tx);
            if (!_tx) {
                console.log(`Not Found mirror tx=${args.transactionID}`);
                rej(`Not Found tx=${args.transactionID}`);
                return;
            }

            const originalSenderUserID = _tx.senderUserID;
            const originalReceiverUserID = _tx.recieverUserID;
            let _callback = async () => {
                console.log(`_callback`);
            };
            const rtx = await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
                tx = await _getTransaction(
                    {
                        transactionID: args.transactionID,
                    },
                    txn,
                );
                console.log(`looking at tx`, tx);
                console.log(`typeof tx`, typeof tx);
                if (!tx) {
                    console.log(`Not Found tx=${args.transactionID}`);
                    rej(`Not Found tx=${args.transactionID}`);
                    return;
                }
                console.log(`tx.recievingWallet`, tx.recievingWallet);
                if (!checkIfEscrowWallet(tx.recievingWallet)) {
                    console.log(`Cannot use recall a non-escrow wallet. tx=${args.transactionID}`);
                    rej(`Cannot use recall a non-escrow wallet. tx=${args.transactionID}`);
                    return;
                }
                if (tx.gotRecalled) {
                    console.log(`Already reverted tx=${args.transactionID}`);
                    rej(`Already reverted tx=${args.transactionID}`);
                    return;
                }
                if (tx.gotCashOut) {
                    console.log(`Already redeemed tx=${args.transactionID}`);
                    rej(`Already redeemed tx=${args.transactionID}`);
                    return;
                }
                console.log(`
              
              tx.sendingWallet !== args.recallerWalletID = ${tx.sendingWallet !== args.recallerWalletID}
              ||
              tx.recievingWallet !== args.recallerWalletID = ${tx.recievingWallet !== args.recallerWalletID}
              
              `);
                console.log(`
              
              tx.sendingWallet = ${tx.sendingWallet}
              args.recallerWalletID = ${args.recallerWalletID}
              tx.recievingWallet = ${tx.recievingWallet}
              args.recallerWalletID = ${args.recallerWalletID}
              
              `);
                if (tx.sendingWallet !== args.recallerWalletID && tx.recievingWallet !== args.recallerWalletID) {
                    console.log(`Only the sender or receiver can recall a transaction. tx=${args.transactionID}`);
                    rej(`Only the sender or receiver can recall a transaction. tx=${args.transactionID}`);
                    return;
                }
                const [originalSenderWalletQLDB, originalReceiverWalletQLDB] = await Promise.all([
                    getWallet_QuantumLedger({
                        walletAliasID: tx.sendingWallet,
                    }),
                    getWallet_QuantumLedger({
                        walletAliasID: tx.recievingWallet,
                    }),
                ]);
                _originalSenderWalletQLDB = originalSenderWalletQLDB;
                _originalReceiverWalletQLDB = originalReceiverWalletQLDB;

                if (!originalSenderWalletQLDB || !originalReceiverWalletQLDB) {
                    console.log(`a wallet was null`);
                    rej(`a wallet was null`);
                    return;
                }
                if (originalReceiverWalletQLDB.balance < tx.amount) {
                    rej('They do not have enough money to recall');
                    return;
                }

                originalSenderWalletUpdatedBalance =
                    parseFloat(`${originalSenderWalletQLDB.balance}`) + parseFloat(`${tx.amount}`);
                originalReceiverWalletUpdatedBalance =
                    parseFloat(`${originalReceiverWalletQLDB.balance}`) - parseFloat(`${tx.amount}`);

                recallTxData = {
                    title: `Recall: "${tx.title}"`,
                    note: `Recall: "${tx.note}"`,
                    purchaseManifestID: tx.purchaseManifestID,
                    attribution: tx.attribution,
                    type: TransactionType.RECALL,
                    amount: tx.amount,
                    senderWallet: tx.recievingWallet,
                    receiverWallet: tx.sendingWallet,
                    senderUserID: originalReceiverUserID,
                    receiverUserID: originalSenderUserID,
                    explanations: Object.values(tx.explanations).map((ex) => {
                        const e = ex as unknown as {
                            walletAliasID: WalletAliasID;
                            explanation: string;
                            amount: number;
                        };
                        return {
                            ...e,
                            explanation: `Recalled: ${e.explanation}`,
                            amount: e.amount * -1,
                        };
                    }),
                    recallMetadata: {
                        originalTransactionID: tx.id,
                        recallerWalletID: args.recallerWalletID,
                        recallerNote: args.recallerNote,
                    },
                    referenceID: args.referenceID,
                    recallTransactionID: tx.id,
                    gotRecalled: true,
                };
                console.log(`recallTxData`, recallTxData);
                if (!recallTxData) {
                    rej(`Failed to create recall for transaction tx=${args.transactionID}`);
                    return;
                }
                const { tx: recall_Tx, callback } = await _createTransaction(recallTxData, txn, {
                    receiverOwnerID: originalSenderUserID,
                    senderOwnerID: originalReceiverUserID,
                });
                _callback = callback;
                recallTxID = recall_Tx.id;
                console.log(`recall_Tx`, recall_Tx);
                if (!recall_Tx) {
                    rej(`Failed to create recall for transaction tx=${args.transactionID}`);
                    return;
                }
                const updatedTx = await txn.execute(
                    `
                      UPDATE Transactions SET
                      gotRecalled = true,
                      recallTransactionID = '${recall_Tx.id}'
                      WHERE id = '${tx.id}'
                    `,
                );
                console.log('updatedTx', updatedTx);
                console.log('Executed update query');

                const resultSet = await txn.execute(`SELECT * FROM Transactions WHERE id = ?`, recall_Tx.id);
                console.log('Executed select query');
                const recallDoc = resultSet.getResultList()[0];
                console.log(`Successfully updated document into table: ${JSON.stringify(recallDoc)}`);
                const rtx = domValueTransactionToTyped(recallDoc);
                console.log('rtx', rtx);
                return rtx;
            });
            if (
                !rtx ||
                !tx ||
                !recallTxData ||
                !recallTxID ||
                originalSenderWalletUpdatedBalance === undefined ||
                originalReceiverWalletUpdatedBalance === undefined ||
                !_originalSenderWalletQLDB ||
                !_originalReceiverWalletQLDB
            ) {
                console.log(`
              rtx = ${JSON.stringify(rtx)}
              tx = ${JSON.stringify(tx)}
              recallTxData = ${JSON.stringify(recallTxData)}
              recallTxID = ${recallTxID}
              originalSenderWalletUpdatedBalance = ${originalSenderWalletUpdatedBalance}
              originalReceiverWalletUpdatedBalance = ${originalReceiverWalletUpdatedBalance}
              _originalSenderWalletQLDB = ${JSON.stringify(_originalSenderWalletQLDB)}
              _originalReceiverWalletQLDB = ${JSON.stringify(_originalReceiverWalletQLDB)}
              `);
                rej('something was null after QLDB');
                return;
            }
            await _callback();
            const [txUpdateSender, txUpdateReceiver] = await Promise.all([
                UpdateTxWallet_Fireledger({
                    id: getMirrorTransactionID({
                        txID: tx.id,
                        walletAliasID: tx.sendingWallet,
                    }),
                    recallTransactionID: getMirrorTransactionID({
                        txID: recallTxID,
                        walletAliasID: tx.sendingWallet,
                    }),
                }),
                UpdateTxWallet_Fireledger({
                    id: getMirrorTransactionID({
                        txID: tx.id,
                        walletAliasID: tx.recievingWallet,
                    }),
                    recallTransactionID: getMirrorTransactionID({
                        txID: recallTxID,
                        walletAliasID: tx.recievingWallet,
                    }),
                }),
            ]);
            console.log(`txUpdateSender`, txUpdateSender);
            console.log(`txUpdateReceiver`, txUpdateReceiver);
            res(rtx);
            return rtx;
        } catch (e) {
            console.log('recall transaction error', e);
            rej(e);
        }
    });
    return p;
};

// this will not check for recall expiry date, as that logic assumed to be handled by the caller
export const cashOutTransaction_QuantumLedger = async (args: CashOutXCloudRequestBody) => {
    const p: Promise<Transaction_Quantum> = new Promise(async (res, rej) => {
        console.log('cashOutTransaction...');

        // assume recallable
        try {
            let tx: Transaction_Quantum | undefined;
            let recallTxData: PostTransactionXCloudRequestBody | undefined;
            let recallTxID: TransactionID | undefined;
            let originalSenderWalletUpdatedBalance: number | undefined;
            let originalReceiverWalletUpdatedBalance: number | undefined;
            let _originalSenderWalletQLDB: Wallet_Quantum | undefined;
            let _originalReceiverWalletQLDB: Wallet_Quantum | undefined;

            const txs = await ListMirrorTx_Fireledger({
                txID: args.transactionID,
            });
            const _tx = txs[0];
            console.log(`_tx`, _tx);
            if (!_tx) {
                console.log(`Not Found mirror tx=${args.transactionID}`);
                rej(`Not Found tx=${args.transactionID}`);
                return;
            }

            const originalSenderUserID = _tx.senderUserID;
            const originalReceiverUserID = _tx.recieverUserID;

            let _callback = async () => {
                console.log(`_callback`);
            };

            const rtx = await qldbDriver.executeLambda(async (txn: TransactionExecutor) => {
                tx = await _getTransaction(
                    {
                        transactionID: args.transactionID,
                    },
                    txn,
                );
                console.log(`looking at tx`, tx);
                if (!tx) {
                    console.log(`Not Found tx=${args.transactionID}`);
                    rej(`Not Found tx=${args.transactionID}`);
                    return;
                }
                if (!checkIfEscrowWallet(tx.recievingWallet)) {
                    console.log(`Cannot use cash out a non-escrow wallet. tx=${args.transactionID}`);
                    rej(`Cannot use cash out a non-escrow wallet. tx=${args.transactionID}`);
                    return;
                }
                if (tx.gotRecalled) {
                    console.log(`Already reverted tx=${args.transactionID}`);
                    rej(`Already reverted tx=${args.transactionID}`);
                    return;
                }
                if (tx.gotCashOut) {
                    console.log(`Already redeemed tx=${args.transactionID}`);
                    rej(`Already redeemed tx=${args.transactionID}`);
                    return;
                }
                const [originalSenderWalletQLDB, originalReceiverWalletQLDB] = await Promise.all([
                    getWallet_QuantumLedger({
                        walletAliasID: tx.sendingWallet,
                    }),
                    getWallet_QuantumLedger({
                        walletAliasID: tx.recievingWallet,
                    }),
                ]);
                _originalSenderWalletQLDB = originalSenderWalletQLDB;
                _originalReceiverWalletQLDB = originalReceiverWalletQLDB;
                if (!originalSenderWalletQLDB || !originalReceiverWalletQLDB) {
                    console.log(`a wallet was null`);
                    rej(`a wallet was null`);
                    return;
                }
                if (originalReceiverWalletQLDB.balance < tx.amount) {
                    rej('They do not have enough money to recall');
                    return;
                }

                originalSenderWalletUpdatedBalance =
                    parseFloat(`${originalSenderWalletQLDB.balance}`) + parseFloat(`${tx.amount}`);
                originalReceiverWalletUpdatedBalance =
                    parseFloat(`${originalReceiverWalletQLDB.balance}`) - parseFloat(`${tx.amount}`);

                recallTxData = {
                    title: `Cash Out: "${tx.title}"`,
                    note: `Cash Out: "${tx.note}"`,
                    purchaseManifestID: tx.purchaseManifestID,
                    attribution: tx.attribution,
                    type: TransactionType.CASH_OUT,
                    amount: tx.amount,
                    senderWallet: tx.recievingWallet,
                    receiverWallet: tx.sendingWallet,
                    senderUserID: originalReceiverUserID,
                    receiverUserID: originalSenderUserID,
                    explanations: Object.values(tx.explanations).map((ex) => {
                        const e = ex as unknown as {
                            walletAliasID: WalletAliasID;
                            explanation: string;
                            amount: number;
                        };
                        return {
                            ...e,
                            explanation: `Cash Out: ${e.explanation}`,
                            amount: e.amount * -1,
                        };
                    }),
                    cashOutMetadata: {
                        initiatorWallet: args.initiatorWallet,
                        originalTransactionID: tx.id,
                        cashoutCode: args.cashoutCode,
                    },
                    referenceID: args.referenceID,
                    cashOutTransactionID: tx.id,
                    gotCashOut: true,
                };
                console.log(`recallTxData`, recallTxData);
                if (!recallTxData) {
                    rej(`Failed to create recall for transaction tx=${args.transactionID}`);
                    return;
                }
                const { tx: recall_Tx, callback } = await _createTransaction(recallTxData, txn, {
                    receiverOwnerID: originalSenderUserID,
                    senderOwnerID: originalReceiverUserID,
                });
                console.log(`recall_Tx`, recall_Tx);
                recallTxID = recall_Tx.id;
                _callback = callback;
                if (!recall_Tx) {
                    rej(`Failed to create recall for transaction tx=${args.transactionID}`);
                    return;
                }
                const updatedTx = await txn.execute(
                    `
                    UPDATE Transactions SET
                    gotRecalled = true,
                    cashOutTransactionID = '${recall_Tx.id}'
                    WHERE id = '${tx.id}'
                  `,
                );

                console.log('updatedTx', updatedTx);

                console.log('Executed update query');
                const resultSet = await txn.execute(`SELECT * FROM Transactions WHERE id = ?`, recall_Tx.id);
                console.log('Executed select query');
                const recallDoc = resultSet.getResultList()[0];
                console.log(`Successfully updated document into table: ${JSON.stringify(recallDoc)}`);
                const rtx = domValueTransactionToTyped(recallDoc);
                console.log('rtx', rtx);
                return rtx;
            });
            if (
                !rtx ||
                !tx ||
                !recallTxData ||
                !recallTxID ||
                originalSenderWalletUpdatedBalance === undefined ||
                originalReceiverWalletUpdatedBalance === undefined ||
                !_originalSenderWalletQLDB ||
                !_originalReceiverWalletQLDB
            ) {
                console.log(`
            rtx = ${JSON.stringify(rtx)}
            tx = ${JSON.stringify(tx)}
            recallTxData = ${JSON.stringify(recallTxData)}
            recallTxID = ${recallTxID}
            originalSenderWalletUpdatedBalance = ${originalSenderWalletUpdatedBalance}
            originalReceiverWalletUpdatedBalance = ${originalReceiverWalletUpdatedBalance}
            _originalSenderWalletQLDB = ${JSON.stringify(_originalSenderWalletQLDB)}
            _originalReceiverWalletQLDB = ${JSON.stringify(_originalReceiverWalletQLDB)}
            `);
                rej('something was null after QLDB');
                return;
            }
            await _callback();
            const [txUpdateSender, txUpdateReceiver] = await Promise.all([
                UpdateTxWallet_Fireledger({
                    id: getMirrorTransactionID({
                        txID: tx.id,
                        walletAliasID: tx.sendingWallet,
                    }),
                    cashOutTransactionID: getMirrorTransactionID({
                        txID: recallTxID,
                        walletAliasID: tx.sendingWallet,
                    }),
                }),
                UpdateTxWallet_Fireledger({
                    id: getMirrorTransactionID({
                        txID: tx.id,
                        walletAliasID: tx.recievingWallet,
                    }),
                    cashOutTransactionID: getMirrorTransactionID({
                        txID: recallTxID,
                        walletAliasID: tx.recievingWallet,
                    }),
                }),
            ]);
            console.log(`txUpdateSender`, txUpdateSender);
            console.log(`txUpdateReceiver`, txUpdateReceiver);
            res(rtx);
            return rtx;
        } catch (e) {
            console.log('recall transaction error', e);
            rej(e);
        }
    });
    return p;
};
