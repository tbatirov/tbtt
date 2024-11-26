import { useStandardStore } from '../store/standardStore';
import { Account, AccountingStandard } from '../types/accounting';

// Test accounts covering different sections
export const testAccounts: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Cash and receivables (11xx)
    {
        code: '1100',
        name: 'Cash and Receivables',
        type: 'asset',
        subtype: 'current-asset',
        level: 'header',
        isActive: true,
        description: 'Cash and receivables section'
    },
    {
        code: '1101',
        name: 'Cash',
        type: 'asset',
        subtype: 'current-asset',
        level: 'detail',
        isActive: true,
        description: 'Cash in bank'
    },
    {
        code: '1102',
        name: 'Accounts Receivable',
        type: 'asset',
        subtype: 'current-asset',
        level: 'detail',
        isActive: true,
        description: 'Customer receivables'
    },
    
    // Revenue accounts (91xx)
    {
        code: '9100',
        name: 'Revenue',
        type: 'revenue',
        subtype: 'operating-revenue',
        level: 'header',
        isActive: true,
        description: 'Revenue section'
    },
    {
        code: '9101',
        name: 'Service Revenue',
        type: 'revenue',
        subtype: 'operating-revenue',
        level: 'detail',
        isActive: true,
        description: 'Revenue from services'
    },
    
    // Operating expenses (94xx)
    {
        code: '9400',
        name: 'Operating Expenses',
        type: 'expense',
        subtype: 'operating-expense',
        level: 'header',
        isActive: true,
        description: 'Operating expenses section'
    },
    {
        code: '9401',
        name: 'General Expenses',
        type: 'expense',
        subtype: 'operating-expense',
        level: 'detail',
        isActive: true,
        description: 'General operating expenses'
    },
    {
        code: '9402',
        name: 'Purchase Expenses',
        type: 'expense',
        subtype: 'operating-expense',
        level: 'detail',
        isActive: true,
        description: 'Expenses for purchases'
    }
];

// Test accounting standard
export const testStandard: Omit<AccountingStandard, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test Standard',
    description: 'Test accounting standard',
    version: '1.0.0',
    effectiveDate: new Date(),
    isActive: true,
    accountCodeFormat: {
        pattern: '\\d{4}',
        description: '4-digit account code',
        example: '1100'
    },
    signConventions: {
        asset: { normalBalance: 'debit', increaseBy: 'debit' },
        liability: { normalBalance: 'credit', increaseBy: 'credit' },
        equity: { normalBalance: 'credit', increaseBy: 'credit' },
        revenue: { normalBalance: 'credit', increaseBy: 'credit' },
        expense: { normalBalance: 'debit', increaseBy: 'debit' },
        production: { normalBalance: 'debit', increaseBy: 'debit' },
        memo: { normalBalance: 'debit', increaseBy: 'debit' },
        off: { normalBalance: 'debit', increaseBy: 'debit' }
    },
    rules: []
};

export const initializeTestStores = () => {
    const standardStore = useStandardStore.getState();
    
    // Reset store state
    standardStore.reset();
    
    // Add test standard
    const standard = standardStore.addStandard(testStandard);
    standardStore.setActiveStandard(standard.id);
    
    // Add test accounts with IDs
    const accountsWithIds = testAccounts.map(account => ({
        ...account,
        standardId: standard.id // Set the correct standard ID
    }));
    
    const accounts = standardStore.addAccounts(accountsWithIds);
    
    return {
        standardStore,
        accounts,
        standard
    };
};
