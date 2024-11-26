import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity, AccountTypeCompatibility } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';
import { AccountType } from '../../../../stores/standardStore';

export class AccountTypeCompatibilityValidator implements ValidationRule {
  id = 'account-type-compatibility';
  name = 'Account Type Compatibility Validator';
  description = 'Validates that account type combinations are valid for the transaction';
  level = ValidationLevel.Accounting;
  priority = 90;
  dependencies = ['account-type', 'debit-credit-equality'];

  // Define valid account type combinations
  private readonly validCombinations: AccountTypeCompatibility[] = [
    // Asset combinations
    {
      sourceType: AccountType.Asset,
      targetType: AccountType.Asset,
      allowedOperations: ['debit', 'credit'] // Asset transfers
    },
    {
      sourceType: AccountType.Asset,
      targetType: AccountType.Liability,
      allowedOperations: ['credit'] // Paying off liabilities
    },
    {
      sourceType: AccountType.Asset,
      targetType: AccountType.Expense,
      allowedOperations: ['credit'] // Paying for expenses
    },
    {
      sourceType: AccountType.Asset,
      targetType: AccountType.Equity,
      allowedOperations: ['credit'] // Owner withdrawals
    },
    
    // Liability combinations
    {
      sourceType: AccountType.Liability,
      targetType: AccountType.Asset,
      allowedOperations: ['debit'] // Taking on debt
    },
    {
      sourceType: AccountType.Liability,
      targetType: AccountType.Liability,
      allowedOperations: ['debit', 'credit'] // Debt transfers
    },
    
    // Revenue combinations
    {
      sourceType: AccountType.Revenue,
      targetType: AccountType.Asset,
      allowedOperations: ['debit'] // Recording income
    },
    {
      sourceType: AccountType.Revenue,
      targetType: AccountType.Liability,
      allowedOperations: ['debit'] // Revenue with delayed payment
    },
    
    // Expense combinations
    {
      sourceType: AccountType.Expense,
      targetType: AccountType.Asset,
      allowedOperations: ['debit'] // Direct expense payments
    },
    {
      sourceType: AccountType.Expense,
      targetType: AccountType.Liability,
      allowedOperations: ['credit'] // Expenses on credit
    },
    
    // Equity combinations
    {
      sourceType: AccountType.Equity,
      targetType: AccountType.Asset,
      allowedOperations: ['debit'] // Owner investments
    }
  ];

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const { debit: debitAccount, credit: creditAccount } = context.accounts;

    // Find valid combinations for these account types
    const validCombination = this.findValidCombination(
      debitAccount.type,
      creditAccount.type
    );

    if (!validCombination) {
      errors.push({
        code: 'INVALID_ACCOUNT_COMBINATION',
        message: `Invalid combination of account types: ${debitAccount.type} (debit) and ${creditAccount.type} (credit)`,
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['accounts.debit.type', 'accounts.credit.type']
      });
    } else {
      // Check if the operation is allowed
      if (!validCombination.allowedOperations.includes('debit')) {
        errors.push({
          code: 'INVALID_DEBIT_OPERATION',
          message: `Account type ${debitAccount.type} cannot be debited in combination with ${creditAccount.type}`,
          level: this.level,
          severity: ValidationSeverity.Error,
          affectedFields: ['accounts.debit.type']
        });
      }
      if (!validCombination.allowedOperations.includes('credit')) {
        errors.push({
          code: 'INVALID_CREDIT_OPERATION',
          message: `Account type ${creditAccount.type} cannot be credited in combination with ${debitAccount.type}`,
          level: this.level,
          severity: ValidationSeverity.Error,
          affectedFields: ['accounts.credit.type']
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      level: this.level
    };
  }

  private findValidCombination(
    debitType: AccountType,
    creditType: AccountType
  ): AccountTypeCompatibility | undefined {
    // Check direct combination
    const directMatch = this.validCombinations.find(
      combo => combo.sourceType === debitType && combo.targetType === creditType
    );

    if (directMatch) {
      return directMatch;
    }

    // Check reverse combination
    const reverseMatch = this.validCombinations.find(
      combo => combo.sourceType === creditType && combo.targetType === debitType
    );

    if (reverseMatch) {
      // Reverse the operations for the opposite direction
      return {
        sourceType: debitType,
        targetType: creditType,
        allowedOperations: reverseMatch.allowedOperations.map(op => 
          op === 'debit' ? 'credit' : 'debit'
        )
      };
    }

    return undefined;
  }

  // Account type compatibility rules can be overridden in special cases
  canOverride = () => true;
}
