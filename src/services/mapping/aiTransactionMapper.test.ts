import { describe, expect, test, beforeEach } from 'vitest';
import { AITransactionMapper } from './aiTransactionMapper';
import { Account } from '../../types/accounting';
import { Transaction } from '../../types/ledger';
import { MockStandardStore } from './__mocks__/standardStore';

// Mock accounts for testing
const mockAccounts: Account[] = [
  {
    id: 'cash',
    standardId: 'test-standard',
    code: '1100',
    name: 'Cash',
    type: 'asset',
    subtype: 'current-asset',
    level: 'detail',
    description: 'Cash account',
    isActive: true
  },
  {
    id: 'accounts-payable',
    standardId: 'test-standard',
    code: '2100',
    name: 'Accounts Payable',
    type: 'liability',
    subtype: 'current-liability',
    level: 'detail',
    description: 'Accounts payable',
    isActive: true
  },
  {
    id: 'operating-expense',
    standardId: 'test-standard',
    code: '5100',
    name: 'Operating Expense',
    type: 'expense',
    subtype: 'operating-expense',
    level: 'detail',
    description: 'Operating expenses',
    isActive: true
  },
  {
    id: 'sales-revenue',
    standardId: 'test-standard',
    code: '4100',
    name: 'Sales Revenue',
    type: 'revenue',
    subtype: 'operating-revenue',
    level: 'detail',
    description: 'Sales revenue',
    isActive: true
  },
  {
    id: 'retained-earnings',
    standardId: 'test-standard',
    code: '3100',
    name: 'Retained Earnings',
    type: 'equity',
    subtype: 'retained-earnings',
    level: 'detail',
    description: 'Retained earnings',
    isActive: true
  }
];

describe('AITransactionMapper', () => {
  let mapper: AITransactionMapper;
  let mockStore: MockStandardStore;

  beforeEach(() => {
    mockStore = new MockStandardStore();
    mapper = new AITransactionMapper(mockStore);
    mapper.initialize(mockAccounts);
  });

  test('should initialize with accounts', () => {
    expect(() => mapper.initialize(mockAccounts)).not.toThrow();
  });

  test('should throw error when initializing with empty accounts', () => {
    expect(() => new AITransactionMapper(mockStore).initialize([])).toThrow('No accounts provided for mapping');
  });

  describe('validateMapping', () => {
    test('should allow debit asset, credit liability', () => {
      const debitAccount = mockAccounts.find(a => a.id === 'cash')!;
      const creditAccount = mockAccounts.find(a => a.id === 'accounts-payable')!;
      expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
    });

    test('should allow debit expense, credit asset', () => {
      const debitAccount = mockAccounts.find(a => a.id === 'operating-expense')!;
      const creditAccount = mockAccounts.find(a => a.id === 'cash')!;
      expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
    });

    test('should allow debit revenue, credit equity (revenue decrease)', () => {
      const debitAccount = mockAccounts.find(a => a.id === 'sales-revenue')!;
      const creditAccount = mockAccounts.find(a => a.id === 'retained-earnings')!;
      expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
    });

    test('should not allow same account for debit and credit', () => {
      const account = mockAccounts.find(a => a.id === 'cash')!;
      expect(() => mapper['validateMapping'](account, account, 100))
        .toThrow('Debit and credit accounts cannot be the same');
    });

    test('should throw error when no active standard exists', () => {
      mockStore.getActiveStandard = () => null;
      const debitAccount = mockAccounts.find(a => a.id === 'cash')!;
      const creditAccount = mockAccounts.find(a => a.id === 'accounts-payable')!;
      expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100))
        .toThrow('No active accounting standard found');
    });

    test('should validate based on sign conventions', () => {
      const debitAccount = mockAccounts.find(a => a.id === 'sales-revenue')!;
      const creditAccount = mockAccounts.find(a => a.id === 'operating-expense')!;
      expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100))
        .toThrow('Invalid account type combination based on sign conventions');
    });

    describe('common accounting transactions', () => {
      test('should allow cash receipt from customer (debit cash, credit revenue)', () => {
        const debitAccount = mockAccounts.find(a => a.id === 'cash')!;
        const creditAccount = mockAccounts.find(a => a.id === 'sales-revenue')!;
        expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
      });

      test('should allow bill payment (debit expense, credit cash)', () => {
        const debitAccount = mockAccounts.find(a => a.id === 'operating-expense')!;
        const creditAccount = mockAccounts.find(a => a.id === 'cash')!;
        expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
      });

      test('should allow loan receipt (debit cash, credit loan payable)', () => {
        const debitAccount = mockAccounts.find(a => a.id === 'cash')!;
        const creditAccount = mockAccounts.find(a => a.id === 'accounts-payable')!;
        expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
      });

      test('should allow purchase on credit (debit expense, credit accounts payable)', () => {
        const debitAccount = mockAccounts.find(a => a.id === 'operating-expense')!;
        const creditAccount = mockAccounts.find(a => a.id === 'accounts-payable')!;
        expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
      });

      test('should allow revenue decrease (debit revenue, credit cash)', () => {
        const debitAccount = mockAccounts.find(a => a.id === 'sales-revenue')!;
        const creditAccount = mockAccounts.find(a => a.id === 'cash')!;
        expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
      });

      test('should allow expense refund (debit cash, credit expense)', () => {
        const debitAccount = mockAccounts.find(a => a.id === 'cash')!;
        const creditAccount = mockAccounts.find(a => a.id === 'operating-expense')!;
        expect(() => mapper['validateMapping'](debitAccount, creditAccount, 100)).not.toThrow();
      });
    });
  });
});
