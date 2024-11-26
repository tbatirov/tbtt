import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';

export class AccountExistenceValidator implements ValidationRule {
  id = 'account-existence';
  name = 'Account Existence Validator';
  description = 'Validates that both debit and credit accounts exist in the system';
  level = ValidationLevel.Structural;
  priority = 100; // Highest priority for structural validation

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    
    // Check debit account
    if (!context.accounts.debit) {
      errors.push({
        code: 'DEBIT_ACCOUNT_MISSING',
        message: 'Debit account does not exist',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['debitAccount']
      });
    }

    // Check credit account
    if (!context.accounts.credit) {
      errors.push({
        code: 'CREDIT_ACCOUNT_MISSING',
        message: 'Credit account does not exist',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['creditAccount']
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      level: this.level
    };
  }

  // Account existence is a critical check that cannot be overridden
  canOverride = () => false;
}
