import { ValidationService } from '../ValidationService';
import { Transaction } from '../../../types/transaction';
import { Account } from '../../../types/account';
import { AccountType, AccountSubtype } from '../../../stores/standardStore';

describe('ValidationService', () => {
  let validationService: ValidationService;
  let mockTransaction: Transaction;
  let mockDebitAccount: Account;
  let mockCreditAccount: Account;

  beforeEach(() => {
    validationService = new ValidationService();

    mockTransaction = {
      id: 'test-transaction',
      date: new Date(),
      description: 'Test Transaction',
      amount: 100,
      metadata: {}
    };

    mockDebitAccount = {
      id: 'debit-account',
      code: '1000',
      name: 'Cash',
      type: AccountType.Asset,
      subtype: AccountSubtype.Cash,
      metadata: {}
    };

    mockCreditAccount = {
      id: 'credit-account',
      code: '2000',
      name: 'Accounts Payable',
      type: AccountType.Liability,
      subtype: AccountSubtype.AccountsPayable,
      metadata: {}
    };
  });

  describe('Account Existence Validation', () => {
    it('should pass validation with valid accounts', async () => {
      const result = await validationService.validate(
        mockTransaction,
        mockDebitAccount,
        mockCreditAccount
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with missing debit account', async () => {
      const result = await validationService.validate(
        mockTransaction,
        null as any,
        mockCreditAccount
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('DEBIT_ACCOUNT_MISSING');
    });

    it('should fail validation with missing credit account', async () => {
      const result = await validationService.validate(
        mockTransaction,
        mockDebitAccount,
        null as any
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('CREDIT_ACCOUNT_MISSING');
    });
  });

  describe('Override Management', () => {
    it('should respect valid overrides', async () => {
      // Add an override for the account existence validator
      validationService.addOverride({
        ruleId: 'account-existence',
        reason: 'Testing override functionality',
        approvedBy: 'test-user',
        expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
      });

      const result = await validationService.validate(
        mockTransaction,
        null as any,
        mockCreditAccount
      );

      // Should still show error but be considered valid due to override
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.overrides).toHaveLength(1);
    });

    it('should not apply expired overrides', async () => {
      // Add an expired override
      validationService.addOverride({
        ruleId: 'account-existence',
        reason: 'Testing override expiration',
        approvedBy: 'test-user',
        expiresAt: new Date(Date.now() - 3600000) // Expired 1 hour ago
      });

      const result = await validationService.validate(
        mockTransaction,
        null as any,
        mockCreditAccount
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
