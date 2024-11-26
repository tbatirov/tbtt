import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';
import { AccountType } from '../../../../types/accounting';
import { mappingLogger } from '../../../logging/MappingLogger';

export class ContraAccountValidator implements ValidationRule {
  id = 'contra-account';
  name = 'Contra Account Validator';
  description = 'Validates special rules for contra accounts';
  level = ValidationLevel.Accounting;
  priority = 80;
  dependencies = ['sign-convention'];

  private readonly contraAccountRules: Record<string, {
    allowedSubtypes: string[];
    normalBalance: 'debit' | 'credit';
    parentType: string;
  }> = {
    'asset': {
      allowedSubtypes: ['allowance_doubtful_accounts', 'accumulated_depreciation'],
      normalBalance: 'credit',
      parentType: 'asset'
    },
    'liability': {
      allowedSubtypes: ['discount_bonds_payable'],
      normalBalance: 'debit',
      parentType: 'liability'
    },
    'revenue': {
      allowedSubtypes: ['sales_returns', 'sales_discounts'],
      normalBalance: 'debit',
      parentType: 'revenue'
    },
    'expense': {
      allowedSubtypes: ['purchase_returns', 'purchase_discounts'],
      normalBalance: 'credit',
      parentType: 'expense'
    }
  };

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    mappingLogger.debug('Starting contra account validation', 'validation', context.transaction.id);

    const { debit: debitAccount, credit: creditAccount } = context.accounts;

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
      // Check both accounts for contra account rules
      if (debitAccount.metadata?.isContraAccount) {
        const debitValidation = this.validateContraAccount(debitAccount, 'debit');
        if (debitValidation.error) errors.push(debitValidation.error);
        if (debitValidation.warning) warnings.push(debitValidation.warning);
      }

      if (creditAccount.metadata?.isContraAccount) {
        const creditValidation = this.validateContraAccount(creditAccount, 'credit');
        if (creditValidation.error) errors.push(creditValidation.error);
        if (creditValidation.warning) warnings.push(creditValidation.warning);
      }

      // Check for contra account interactions
      if (debitAccount.metadata?.isContraAccount && creditAccount.metadata?.isContraAccount) {
        warnings.push({
          code: 'CONTRA_ACCOUNT_INTERACTION',
          message: 'Transaction between two contra accounts',
          level: this.level,
          severity: ValidationSeverity.Warning,
          affectedFields: ['debitAccountId', 'creditAccountId']
        });
      }

      const isValid = errors.length === 0;
      mappingLogger.debug('Contra account validation complete', 'validation', context.transaction.id, {
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
      mappingLogger.error('Error during contra account validation', 'validation', context.transaction.id, { error });
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

  private validateContraAccount(account: any, operation: 'debit' | 'credit'): {
    error?: ValidationError;
    warning?: ValidationError;
  } {
    const rules = this.contraAccountRules[account.type];
    if (!rules) {
      return {
        error: {
          code: 'INVALID_CONTRA_ACCOUNT_TYPE',
          message: `Invalid contra account type: ${account.type}`,
          level: this.level,
          severity: ValidationSeverity.Error,
          affectedFields: [`${operation}AccountId`]
        }
      };
    }

    // Check if the subtype is allowed for this type of contra account
    if (!rules.allowedSubtypes.includes(account.subtype)) {
      return {
        error: {
          code: 'INVALID_CONTRA_ACCOUNT_SUBTYPE',
          message: `Invalid contra account subtype: ${account.subtype} for type ${account.type}`,
          level: this.level,
          severity: ValidationSeverity.Error,
          affectedFields: [`${operation}AccountId`]
        }
      };
    }

    // Check if the operation matches the normal balance for this contra account
    if (operation !== rules.normalBalance) {
      return {
        warning: {
          code: 'CONTRA_ACCOUNT_UNUSUAL_DIRECTION',
          message: `Unusual ${operation} entry for contra account ${account.code} (normal balance is ${rules.normalBalance})`,
          level: this.level,
          severity: ValidationSeverity.Warning,
          affectedFields: [`${operation}AccountId`]
        }
      };
    }

    return {};
  }
}
