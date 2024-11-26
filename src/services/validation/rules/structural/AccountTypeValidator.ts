import { ValidationContext, ValidationLevel, ValidationResult, ValidationSeverity } from '../../../../types/validation';
import { ValidationRule } from '../../ValidationRule';
import { AccountType, AccountSubtype } from '../../../../stores/standardStore';

export class AccountTypeValidator implements ValidationRule {
  id = 'account-type';
  name = 'Account Type Validator';
  description = 'Validates account types and subtypes are valid and consistent';
  level = ValidationLevel.Structural;
  priority = 90; // Run after existence check
  dependencies = ['account-existence'];

  // Valid subtype mappings
  private readonly validSubtypes: Record<AccountType, AccountSubtype[]> = {
    [AccountType.Asset]: [
      AccountSubtype.Cash,
      AccountSubtype.BankAccount,
      AccountSubtype.AccountsReceivable,
      AccountSubtype.Inventory,
      AccountSubtype.FixedAsset
    ],
    [AccountType.Liability]: [
      AccountSubtype.AccountsPayable,
      AccountSubtype.LongTermLiability,
      AccountSubtype.ShortTermLiability
    ],
    [AccountType.Equity]: [
      AccountSubtype.CommonStock,
      AccountSubtype.RetainedEarnings
    ],
    [AccountType.Revenue]: [
      AccountSubtype.SalesRevenue,
      AccountSubtype.ServiceRevenue
    ],
    [AccountType.Expense]: [
      AccountSubtype.OperatingExpense,
      AccountSubtype.NonOperatingExpense
    ]
  };

  async validate(context: ValidationContext): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    // Validate debit account
    if (context.accounts.debit) {
      const debitErrors = this.validateAccountType(
        context.accounts.debit.type,
        context.accounts.debit.subtype,
        'debit'
      );
      errors.push(...debitErrors);
    }

    // Validate credit account
    if (context.accounts.credit) {
      const creditErrors = this.validateAccountType(
        context.accounts.credit.type,
        context.accounts.credit.subtype,
        'credit'
      );
      errors.push(...creditErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      level: this.level
    };
  }

  private validateAccountType(
    type: AccountType,
    subtype: AccountSubtype,
    accountRole: 'debit' | 'credit'
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const fieldPrefix = accountRole === 'debit' ? 'debit' : 'credit';

    // Check if account type is valid
    if (!Object.values(AccountType).includes(type)) {
      errors.push({
        code: `${fieldPrefix.toUpperCase()}_INVALID_ACCOUNT_TYPE`,
        message: `Invalid account type: ${type}`,
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: [`${fieldPrefix}Account.type`]
      });
      return errors; // Return early as subtype validation depends on valid type
    }

    // Check if subtype is valid
    if (!Object.values(AccountSubtype).includes(subtype)) {
      errors.push({
        code: `${fieldPrefix.toUpperCase()}_INVALID_ACCOUNT_SUBTYPE`,
        message: `Invalid account subtype: ${subtype}`,
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: [`${fieldPrefix}Account.subtype`]
      });
    }

    // Check if subtype is valid for the account type
    if (!this.validSubtypes[type]?.includes(subtype)) {
      errors.push({
        code: `${fieldPrefix.toUpperCase()}_INVALID_TYPE_SUBTYPE_COMBINATION`,
        message: `Invalid subtype ${subtype} for account type ${type}`,
        level: this.level,
        severity: ValidationSeverity.Error,
        affectedFields: [`${fieldPrefix}Account.type`, `${fieldPrefix}Account.subtype`]
      });
    }

    return errors;
  }

  // Type validation is critical and cannot be overridden
  canOverride = () => false;
}
