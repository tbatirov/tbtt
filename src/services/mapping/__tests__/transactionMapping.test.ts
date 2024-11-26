import { describe, expect, test, beforeEach } from 'vitest';
import { AITransactionMapper } from '../aiTransactionMapper';
import { Account } from '../../../types/accounting';
import { Transaction } from '../../../types/ledger';
import { MockStandardStore } from '../__mocks__/standardStore';

// Mock accounts for testing
const mockAccounts: Account[] = [
  {
    id: 'asset1',
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
    id: 'liability1',
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
    id: 'expense1',
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
    id: 'revenue1',
    standardId: 'test-standard',
    code: '4100',
    name: 'Sales Revenue',
    type: 'revenue',
    subtype: 'operating-revenue',
    level: 'detail',
    description: 'Sales revenue',
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

  test('should validate mapping between accounts', () => {
    const debitAccount = mockAccounts.find(a => a.type === 'asset');
    const creditAccount = mockAccounts.find(a => a.type === 'liability');

    expect(() => {
      mapper['validateMapping'](debitAccount!, creditAccount!, 100);
    }).not.toThrow();
  });

  test('should throw error when mapping same account', () => {
    const account = mockAccounts[0];
    expect(() => {
      mapper['validateMapping'](account, account, 100);
    }).toThrow('Debit and credit accounts cannot be the same');
  });
});
