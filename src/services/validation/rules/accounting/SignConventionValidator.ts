import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity, SignConventionRule } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';
import { AccountType } from '../../../../types/accounting';
import { mappingLogger } from '../../../logging/MappingLogger';

export class SignConventionValidator implements ValidationRule {
  id = 'sign-convention';
  name = 'Sign Convention Validator';
  description = 'Validates that transactions follow proper accounting sign conventions';
  level = ValidationLevel.Accounting;
  priority = 85;
  dependencies = ['account-type-compatibility'];

  private readonly signConventions: SignConventionRule[] = [
    {
      accountType: 'asset',
      normalBalance: 'debit',
      increasesWith: 'debit'
    },
    {
      accountType: 'liability',
      normalBalance: 'credit',
      increasesWith: 'credit'
    },
    {
      accountType: 'equity',
      normalBalance: 'credit',
      increasesWith: 'credit'
    },
    {
      accountType: 'revenue',
      normalBalance: 'credit',
      increasesWith: 'credit'
    },
    {
      accountType: 'expense',
      normalBalance: 'debit',
      increasesWith: 'debit'
    }
  ];

  private getSignConvention(accountType: string): SignConventionRule {
    const convention = this.signConventions.find(sc => sc.accountType === accountType);
    if (!convention) {
      throw new Error(`No sign convention found for account type: ${accountType}`);
    }
    return convention;
  }

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];
    
    mappingLogger.debug('Starting sign convention validation', 'validation', context.transaction.id);

    const { debit: debitAccount, credit: creditAccount } = context.accounts;
    const { amount } = context.transaction;

    if (!debitAccount || !creditAccount) {
      mappingLogger.error('Missing debit or credit account', 'validation', context.transaction.id);
      return {
        isValid: false,
        errors: [{
          code: 'MISSING_ACCOUNTS',
          message: 'Both debit and credit accounts are required',
          level: this.level,
          severity: ValidationSeverity.Error,
          affectedFields: ['debitAccountId', 'creditAccountId']
        }],
        warnings: [],
        level: this.level
      };
    }

    try {
      // Get sign conventions for both accounts
      const debitConvention = this.getSignConvention(debitAccount.type);
      const creditConvention = this.getSignConvention(creditAccount.type);

      mappingLogger.debug('Retrieved sign conventions', 'validation', context.transaction.id, {
        debitConvention,
        creditConvention
      });

      // Check if the transaction follows normal balance conventions
      if (debitConvention.normalBalance === 'credit') {
        warnings.push({
          code: 'ABNORMAL_DEBIT',
          message: `Debiting account ${debitAccount.code} (${debitAccount.type}) with normal credit balance`,
          level: this.level,
          severity: ValidationSeverity.Warning,
          affectedFields: ['debitAccountId']
        });
      }

      if (creditConvention.normalBalance === 'debit') {
        warnings.push({
          code: 'ABNORMAL_CREDIT',
          message: `Crediting account ${creditAccount.code} (${creditAccount.type}) with normal debit balance`,
          level: this.level,
          severity: ValidationSeverity.Warning,
          affectedFields: ['creditAccountId']
        });
      }

      // Check for unusual combinations
      if (debitAccount.type === creditAccount.type) {
        warnings.push({
          code: 'SAME_TYPE_TRANSACTION',
          message: `Transaction between accounts of same type (${debitAccount.type})`,
          level: this.level,
          severity: ValidationSeverity.Warning,
          affectedFields: ['debitAccountId', 'creditAccountId']
        });
      }

      const isValid = errors.length === 0;
      mappingLogger.debug('Sign convention validation complete', 'validation', context.transaction.id, {
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid,
        errors,
        warnings,
        level: this.level
      };
    } catch (error) {
      mappingLogger.error('Error during sign convention validation', 'validation', context.transaction.id, { error });
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          level: this.level,
          severity: ValidationSeverity.Error,
          affectedFields: ['debitAccountId', 'creditAccountId']
        }],
        warnings: [],
        level: this.level
      };
    }
  }
}
