import {
    FirestoreCollection,
    MirrorTransactionID,
    PurchaseMainfestID,
    TimestampFirestore,
    TransactionID,
    TransactionType,
    TxRefID,
    Tx_MirrorFireLedger,
    UserID,
    WalletAliasID,
    WalletType,
    Wallet_MirrorFireLedger,
    getMirrorTransactionID,
} from '@milkshakechat/helpers';
import {
    createFirestoreDoc,
    createFirestoreTimestamp,
    getFirestoreDoc,
    listFirestoreDocs,
    updateFirestoreDoc,
} from './firestore';
import { cashOutTransaction } from '../functions/cashout-transaction/cashout-transaction';

export const CreateMirrorWallet_Fireledger = async ({
    title,
    balance,
    walletAliasID,
    userID,
    type,
}: {
    title: string;
    balance: number;
    walletAliasID: WalletAliasID; // index
    userID: UserID;
    type: WalletType;
}): Promise<Wallet_MirrorFireLedger> => {
    const mirror: Wallet_MirrorFireLedger = {
        id: walletAliasID,
        title: title,
        balance: balance,
        walletAliasID: walletAliasID,
        ownerID: userID,
        type,
    };
    const wallet = await createFirestoreDoc<WalletAliasID, Wallet_MirrorFireLedger>({
        id: walletAliasID,
        data: mirror,
        collection: FirestoreCollection.MIRROR_WALLETS,
    });
    return wallet;
};
export const UpdateMirrorWallet_Fireledger = async ({
    balance,
    walletAliasID,
}: {
    balance: number;
    walletAliasID: WalletAliasID;
}) => {
    const updatedMirror = await updateFirestoreDoc<WalletAliasID, Wallet_MirrorFireLedger>({
        id: walletAliasID,
        payload: {
            balance,
        },
        collection: FirestoreCollection.MIRROR_WALLETS,
    });
    return updatedMirror;
};

export const CreateMirrorTx_Fireledger = async (args: {
    txID: TransactionID; // mirror id QLDB
    sendingWallet: WalletAliasID;
    recievingWallet: WalletAliasID;
    walletAliasID: WalletAliasID;
    amount: number;
    note: string;
    type: TransactionType;
    senderUserID: UserID;
    recieverUserID: UserID;
    ownerID: UserID;
    recallTransactionID?: TransactionID;
    cashOutTransactionID?: TransactionID;
    referenceID?: TxRefID;
    purchaseManifestID?: PurchaseMainfestID;
    isPermaTransfer?: boolean;
}): Promise<Tx_MirrorFireLedger> => {
    const {
        txID, // mirror id QLDB
        walletAliasID, // index
        note,
        amount,
        type,
        sendingWallet,
        recievingWallet,
        senderUserID,
        recieverUserID,
        ownerID,
        recallTransactionID,
        cashOutTransactionID,
        referenceID,
        purchaseManifestID,
        isPermaTransfer,
    } = args;
    const now = createFirestoreTimestamp();

    const mirror: Tx_MirrorFireLedger = {
        id: getMirrorTransactionID({
            txID,
            walletAliasID,
        }),
        txID, // mirror id QLDB
        walletAliasID, // index
        note,
        amount,
        type,
        createdAt: now,
        sendingWallet,
        recievingWallet,
        senderUserID,
        recieverUserID,
        ownerID,
        referenceID,
        purchaseManifestID,
        recallTransactionID: recallTransactionID
            ? getMirrorTransactionID({
                  txID: recallTransactionID,
                  walletAliasID,
              })
            : undefined,
        cashOutTransactionID: cashOutTransactionID
            ? getMirrorTransactionID({
                  txID: cashOutTransactionID,
                  walletAliasID,
              })
            : undefined,
        isPermaTransfer: isPermaTransfer ? isPermaTransfer : false,
    };

    const tx = await createFirestoreDoc<MirrorTransactionID, Tx_MirrorFireLedger>({
        id: getMirrorTransactionID({
            txID,
            walletAliasID,
        }),
        data: mirror,
        collection: FirestoreCollection.MIRROR_TX,
    });
    return tx;
};
export const UpdateTxWallet_Fireledger = async (args: {
    id: MirrorTransactionID;
    recallTransactionID?: MirrorTransactionID;
    cashOutTransactionID?: MirrorTransactionID;
}) => {
    const { id, recallTransactionID, cashOutTransactionID } = args;
    const payload = {
        recallTransactionID,
        cashOutTransactionID,
    };
    const updatedMirror = await updateFirestoreDoc<MirrorTransactionID, Tx_MirrorFireLedger>({
        id,
        payload,
        collection: FirestoreCollection.MIRROR_TX,
    });
    return updatedMirror;
};

export const GetMirrorWallet_Fireledger = async ({ walletAliasID }: { walletAliasID: WalletAliasID }) => {
    const walletMirror = await getFirestoreDoc<WalletAliasID, Wallet_MirrorFireLedger>({
        id: walletAliasID,
        collection: FirestoreCollection.MIRROR_WALLETS,
    });
    return walletMirror;
};
export const ListMirrorTx_Fireledger = async ({ txID }: { txID: TransactionID }) => {
    const txs = await listFirestoreDocs<Tx_MirrorFireLedger>({
        where: {
            field: 'txID',
            operator: '==',
            value: txID,
        },
        collection: FirestoreCollection.MIRROR_TX,
    });
    return txs;
};
