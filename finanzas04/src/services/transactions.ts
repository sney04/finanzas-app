import { db } from '../firebase'; // Import your Firebase configuration
import { Transaction } from '../types'; // Import your Transaction type

// Function to create a new transaction
export const createUserTransaction = async (transaction: Transaction) => {
    try {
        const transactionRef = db.collection('transactions').doc();
        await transactionRef.set({
            ...transaction,
            createdAt: new Date().toISOString(),
        });
        return transactionRef.id; // Return the ID of the created transaction
    } catch (error) {
        console.error("Error creating transaction: ", error);
        throw new Error('Failed to create transaction');
    }
};

// Function to update an existing transaction
export const updateUserTransaction = async (id: string, updatedTransaction: Partial<Transaction>) => {
    try {
        const transactionRef = db.collection('transactions').doc(id);
        await transactionRef.update(updatedTransaction);
    } catch (error) {
        console.error("Error updating transaction: ", error);
        throw new Error('Failed to update transaction');
    }
};

// Function to delete a transaction
export const deleteUserTransaction = async (id: string) => {
    try {
        const transactionRef = db.collection('transactions').doc(id);
        await transactionRef.delete();
    } catch (error) {
        console.error("Error deleting transaction: ", error);
        throw new Error('Failed to delete transaction');
    }
};

// Function to fetch all transactions for a user
export const fetchUserTransactions = async (userId: string) => {
    try {
        const snapshot = await db.collection('transactions').where('userId', '==', userId).get();
        const transactions: Transaction[] = [];
        snapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        return transactions;
    } catch (error) {
        console.error("Error fetching transactions: ", error);
        throw new Error('Failed to fetch transactions');
    }
};