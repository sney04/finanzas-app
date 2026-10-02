// This file exports TypeScript types and interfaces used throughout the application.

export interface User {
    uid: string;
    email: string;
    nombre: string;
    displayName?: string;
}

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: string; // Format: YYYY-MM-DD
    createdAt: string; // Format: YYYY-MM-DD
}

export interface Category {
    id: string;
    name: string;
}