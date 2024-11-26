import { create } from 'zustand';
import { 
  AccountingStandard, 
  Account, 
  StatementRule,
  AccountType,
  SignConvention
} from '../types/accounting';

interface StandardStore {
  standards: AccountingStandard[];
  accounts: Account[];
  rules: StatementRule[];
  activeStandardId: string | null;
  
  // Standard operations
  addStandard: (standard: Omit<AccountingStandard, 'id' | 'createdAt' | 'updatedAt'>) => AccountingStandard;
  updateStandard: (id: string, standard: Partial<AccountingStandard>) => void;
  deleteStandard: (id: string) => void;
  getActiveStandard: () => AccountingStandard | undefined;
  setActiveStandard: (id: string) => void;
  
  // Account operations
  addAccounts: (accounts: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[]) => Account[];
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getAccounts: (standardId?: string) => Account[];
  
  // Rule operations
  addRule: (rule: Omit<StatementRule, 'id' | 'createdAt' | 'updatedAt'>) => StatementRule;
  updateRule: (id: string, rule: Partial<StatementRule>) => void;
  deleteRule: (id: string) => void;
  getRules: (standardId: string) => StatementRule[];
  
  // Validation and processing
  validateTransaction: (
    standardId: string,
    accountCode: string,
    amount: number,
    type: 'debit' | 'credit'
  ) => boolean;
  
  getSignConvention: (
    standardId: string,
    accountType: AccountType
  ) => SignConvention | undefined;
  reset: () => void;
}

// Default standard with sign conventions only
const defaultStandard: AccountingStandard = {
  id: 'default',
  name: 'Default Standard',
  description: 'Default accounting standard with basic sign conventions',
  version: '1.0.0',
  effectiveDate: new Date(),
  isActive: true,
  accountCodeFormat: {
    pattern: '[0-9]+',
    description: 'Numeric code',
    example: '1000'
  },
  signConventions: {
    'asset': { normalBalance: 'debit', increaseBy: 'debit' },
    'liability': { normalBalance: 'credit', increaseBy: 'credit' },
    'equity': { normalBalance: 'credit', increaseBy: 'credit' },
    'revenue': { normalBalance: 'credit', increaseBy: 'credit' },
    'expense': { normalBalance: 'debit', increaseBy: 'debit' },
    'production': { normalBalance: 'debit', increaseBy: 'debit' },
    'memo': { normalBalance: 'debit', increaseBy: 'debit' },
    'off': { normalBalance: 'debit', increaseBy: 'debit' }
  },
  rules: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

export const useStandardStore = create<StandardStore>((set, get) => ({
  standards: [defaultStandard],
  accounts: [], // No default accounts - must be imported from chart of accounts
  rules: [],
  activeStandardId: null,

  reset: () => set({ standards: [], accounts: [], rules: [], activeStandardId: null }),

  addStandard: (newStandard) => {
    const standard: AccountingStandard = {
      ...newStandard,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false // Default to false, use setActiveStandard to activate
    };

    set((state) => ({
      standards: [...state.standards, standard]
    }));

    return standard;
  },

  updateStandard: (id, updatedStandard) => {
    set((state) => ({
      standards: state.standards.map((standard) =>
        standard.id === id
          ? { ...standard, ...updatedStandard, updatedAt: new Date() }
          : standard
      ),
    }));
  },

  deleteStandard: (id) => {
    set((state) => ({
      standards: state.standards.filter((standard) => standard.id !== id),
      accounts: state.accounts.filter((account) => account.standardId !== id),
      rules: state.rules.filter((rule) => rule.standardId !== id),
    }));
  },

  setActiveStandard: (id) => {
    set((state) => ({
      activeStandardId: id,
      standards: state.standards.map(s => ({
        ...s,
        isActive: s.id === id
      }))
    }));
  },

  getActiveStandard: () => {
    const state = get();
    return state.standards.find(s => s.id === state.activeStandardId);
  },

  addAccounts: (newAccounts) => {
    const accounts = newAccounts.map((account) => ({
      ...account,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    set((state) => ({
      accounts: [...state.accounts, ...accounts],
    }));

    return accounts;
  },

  updateAccount: (id, updatedAccount) => {
    set((state) => ({
      accounts: state.accounts.map((account) =>
        account.id === id
          ? { ...account, ...updatedAccount, updatedAt: new Date() }
          : account
      ),
    }));
  },

  deleteAccount: (id) => {
    set((state) => ({
      accounts: state.accounts.filter((account) => account.id !== id),
    }));
  },

  getAccounts: (standardId?: string) => {
    const state = get();
    const targetStandardId = standardId || state.activeStandardId;
    if (!targetStandardId) return [];
    return state.accounts.filter((account) => account.standardId === targetStandardId);
  },

  addRule: (newRule) => {
    const rule: StatementRule = {
      ...newRule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      rules: [...state.rules, rule],
    }));

    return rule;
  },

  updateRule: (id, updatedRule) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === id
          ? { ...rule, ...updatedRule, updatedAt: new Date() }
          : rule
      ),
    }));
  },

  deleteRule: (id) => {
    set((state) => ({
      rules: state.rules.filter((rule) => rule.id !== id),
    }));
  },

  getRules: (standardId: string) => {
    return get().rules.filter((rule) => rule.standardId === standardId);
  },

  validateTransaction: (standardId, accountCode, amount, type) => {
    const account = get().accounts.find(
      (a) => a.standardId === standardId && a.code === accountCode
    );

    if (!account) return false;

    const standard = get().standards.find((s) => s.id === standardId);
    if (!standard) return false;

    const convention = standard.signConventions[account.type];
    if (!convention) return false;

    // Validate based on sign convention
    if (amount > 0) {
      return type === convention.increaseBy;
    } else {
      return type !== convention.increaseBy;
    }
  },

  getSignConvention: (standardId, accountType) => {
    const standard = get().standards.find((s) => s.id === standardId);
    return standard?.signConventions[accountType];
  },
}));