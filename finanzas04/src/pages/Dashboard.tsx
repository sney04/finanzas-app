import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { getUserTransactions } from '../services/transactions';
import TransactionList from '../components/transactions/TransactionList';
import { formatCurrency } from '../utils/currency';

const Dashboard: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (user) {
                try {
                    const userTransactions = await getUserTransactions(user.uid);
                    setTransactions(userTransactions);
                } catch (err) {
                    setError('Error fetching transactions');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchTransactions();
    }, [user]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    const totalIncome = transactions
        .filter(transaction => transaction.type === 'income')
        .reduce((acc, transaction) => acc + transaction.amount, 0);

    const totalExpenses = transactions
        .filter(transaction => transaction.type === 'expense')
        .reduce((acc, transaction) => acc + transaction.amount, 0);

    const balance = totalIncome - totalExpenses;

    return (
        <div className="dashboard">
            <h1>Welcome, {user?.displayName || 'User'}</h1>
            <div className="balance">
                <h2>Balance: {formatCurrency(balance)}</h2>
            </div>
            <TransactionList transactions={transactions} />
        </div>
    );
};

export default Dashboard;