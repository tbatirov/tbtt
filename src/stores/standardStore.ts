import { create } from 'zustand';

export enum AccountType {
  Asset = 'asset',
  Liability = 'liability',
  Equity = 'equity',
  Revenue = 'revenue',
  Expense = 'expense'
}

export enum AccountSubtype {
  Cash = 'cash',
  BankAccount = 'bank_account',
  AccountsReceivable = 'accounts_receivable',
  AccountsPayable = 'accounts_payable',
  Inventory = 'inventory',
  FixedAsset = 'fixed_asset',
  LongTermLiability = 'long_term_liability',
  ShortTermLiability = 'short_term_liability',
  CommonStock = 'common_stock',
  RetainedEarnings = 'retained_earnings',
  SalesRevenue = 'sales_revenue',
  ServiceRevenue = 'service_revenue',
  OperatingExpense = 'operating_expense',
  NonOperatingExpense = 'non_operating_expense'
}

export type NormalBalance = 'debit' | 'credit';

export interface SignConvention {
  normalBalance: NormalBalance;
  increaseBy: NormalBalance;
}

export interface AccountingStandard {
  id: string;
  name: string;
  description: string;
  signConventions: Record<AccountType, SignConvention>;
}

export interface StandardStore {
  standards: AccountingStandard[];
  activeStandard: AccountingStandard | null;
  getActiveStandard: () => AccountingStandard | null;
  getStandards: () => AccountingStandard[];
  setActiveStandard: (standard: AccountingStandard) => void;
  addStandard: (standard: AccountingStandard) => void;
  updateStandard: (standard: AccountingStandard) => void;
  deleteStandard: (id: string) => void;
}

// Default US GAAP standard
const defaultStandard: AccountingStandard = {
  id: 'us-gaap',
  name: 'US GAAP',
  description: 'United States Generally Accepted Accounting Principles',
  signConventions: {
    [AccountType.Asset]: { normalBalance: 'debit', increaseBy: 'debit' },
    [AccountType.Liability]: { normalBalance: 'credit', increaseBy: 'credit' },
    [AccountType.Equity]: { normalBalance: 'credit', increaseBy: 'credit' },
    [AccountType.Revenue]: { normalBalance: 'credit', increaseBy: 'credit' },
    [AccountType.Expense]: { normalBalance: 'debit', increaseBy: 'debit' }
  }
};

export const useStandardStore = create<StandardStore>((set, get) => ({
  standards: [defaultStandard],
  activeStandard: defaultStandard,
  getActiveStandard: () => get().activeStandard,
  getStandards: () => get().standards,
  setActiveStandard: (standard) => set({ activeStandard: standard }),
  addStandard: (standard) => set(state => ({ standards: [...state.standards, standard] })),
  updateStandard: (standard) => set(state => ({
    standards: state.standards.map(s => s.id === standard.id ? standard : s)
  })),
  deleteStandard: (id) => set(state => ({
    standards: state.standards.filter(s => s.id !== id)
  }))
}));
