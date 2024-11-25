import { create } from 'zustand';
import { Transaction } from '../types/ledger';
import { useStandardStore } from './standardStore';

interface TransactionStore {
  transactions: Transaction[];
  addTransactions: (transactions: Transaction[]) => void;
  updateTransactionMapping: (transactionId: string, debitAccountId: string, creditAccountId: string) => void;
  approveTransactions: (companyId: string) => void;
  getTransactionsByCompany: (companyId: string) => Transaction[];
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  transactions: [],

  addTransactions: (newTransactions) => {
    set((state) => ({
      transactions: [...state.transactions, ...newTransactions]
    }));
  },

  updateTransactionMapping: (transactionId, debitAccountId, creditAccountId) => {
    set((state) => ({
      transactions: state.transactions.map(t => {
        if (t.id === transactionId) {
          const updatedEntries = t.entries.map(entry => ({
            ...entry,
            accountId: entry.type === 'debit' ? debitAccountId : creditAccountId,
            status: 'mapped'
          }));

          return {
            ...t,
            entries: updatedEntries,
            status: 'mapped',
            updatedAt: new Date()
          };
        }
        return t;
      })
    }));
  },

  approveTransactions: (companyId) => {
    set((state) => ({
      transactions: state.transactions.map(t =>
        t.companyId === companyId && t.status === 'mapped'
          ? {
              ...t,
              status: 'approved',
              updatedAt: new Date()
            }
          : t
      )
    }));
  },

  getTransactionsByCompany: (companyId) => {
    return get().transactions.filter(t => t.companyId === companyId);
  }
}));