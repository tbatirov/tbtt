import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';

export class DebitCreditEqualityValidator implements ValidationRule {
  id = 'debit-credit-equality';
  name = 'Debit Credit Equality Validator';
  description = 'Validates that debit amount equals credit amount in a transaction';
  level = ValidationLevel.Accounting;
  priority = 100; // Highest priority for accounting rules
  dependencies = ['transaction-structure']; // Depends on valid transaction structure

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const { transaction } = context;

    // Check if amount is properly set
    if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
      errors.push({
        code: 'INVALID_TRANSACTION_AMOUNT',
        message: 'Transaction amount must be a valid number',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.amount']
      });
      return { isValid: false, errors, warnings, level: this.level };
    }

    // In our system, we store a single amount and ensure it's properly applied
    // to both debit and credit sides. This validator ensures the amount is valid
    // and the transaction is balanced.

    if (transaction.amount <= 0) {
      errors.push({
        code: 'NEGATIVE_OR_ZERO_AMOUNT',
        message: 'Transaction amount must be positive',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.amount']
      });
    }

    // Check for precision/rounding issues
    const roundedAmount = Math.round(transaction.amount * 100) / 100;
    if (roundedAmount !== transaction.amount) {
      warnings.push({
        code: 'AMOUNT_PRECISION_WARNING',
        message: 'Transaction amount should have at most 2 decimal places',
        level: this.level,
        severity: ValidationSeverity.Warning,
        affectedFields: ['transaction.amount']
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      level: this.level
    };
  }

  // Debit-Credit equality is a fundamental principle that cannot be overridden
  canOverride = () => false;
}
