import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';

export class TransactionStructureValidator implements ValidationRule {
  id = 'transaction-structure';
  name = 'Transaction Structure Validator';
  description = 'Validates the basic structure and required fields of a transaction';
  level = ValidationLevel.Structural;
  priority = 95; // Run after existence check but before type validation
  dependencies = ['account-existence'];

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    const { transaction } = context;

    // Validate transaction exists
    if (!transaction) {
      errors.push({
        code: 'TRANSACTION_MISSING',
        message: 'Transaction object is required',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction']
      });
      return { isValid: false, errors, warnings, level: this.level };
    }

    // Validate required fields
    if (!transaction.id) {
      errors.push({
        code: 'TRANSACTION_ID_MISSING',
        message: 'Transaction ID is required',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.id']
      });
    }

    if (!transaction.date) {
      errors.push({
        code: 'TRANSACTION_DATE_MISSING',
        message: 'Transaction date is required',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.date']
      });
    } else if (!(transaction.date instanceof Date) && isNaN(new Date(transaction.date).getTime())) {
      errors.push({
        code: 'TRANSACTION_DATE_INVALID',
        message: 'Transaction date is invalid',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.date']
      });
    }

    if (transaction.amount === undefined || transaction.amount === null) {
      errors.push({
        code: 'TRANSACTION_AMOUNT_MISSING',
        message: 'Transaction amount is required',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.amount']
      });
    } else if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
      errors.push({
        code: 'TRANSACTION_AMOUNT_INVALID',
        message: 'Transaction amount must be a valid number',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.amount']
      });
    } else if (transaction.amount <= 0) {
      errors.push({
        code: 'TRANSACTION_AMOUNT_NEGATIVE',
        message: 'Transaction amount must be positive',
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: ['transaction.amount']
      });
    }

    // Validate description
    if (!transaction.description) {
      warnings.push({
        code: 'TRANSACTION_DESCRIPTION_MISSING',
        message: 'Transaction description is recommended',
        level: this.level,
        severity: ValidationSeverity.Warning,
        affectedFields: ['transaction.description']
      });
    } else if (transaction.description.length < 3) {
      warnings.push({
        code: 'TRANSACTION_DESCRIPTION_TOO_SHORT',
        message: 'Transaction description should be more descriptive',
        level: this.level,
        severity: ValidationSeverity.Warning,
        affectedFields: ['transaction.description']
      });
    }

    // Validate metadata
    if (!transaction.metadata || typeof transaction.metadata !== 'object') {
      warnings.push({
        code: 'TRANSACTION_METADATA_INVALID',
        message: 'Transaction metadata should be an object',
        level: this.level,
        severity: ValidationSeverity.Warning,
        affectedFields: ['transaction.metadata']
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      level: this.level
    };
  }

  // Basic structure validation cannot be overridden
  canOverride = () => false;
}
