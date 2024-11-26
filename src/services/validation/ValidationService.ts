import { 
  ValidationContext, 
  ValidationLevel, 
  ValidationResult, 
  ValidationState,
  ValidationError,
  ValidationOverride
} from '../../types/validation';
import { RuleRegistry } from './RuleRegistry';
import { Transaction } from '../../types/transaction';
import { Account } from '../../types/account';
import { AccountExistenceValidator } from './rules/structural/AccountExistenceValidator';
import { AccountTypeValidator } from './rules/structural/AccountTypeValidator';
import { TransactionStructureValidator } from './rules/structural/TransactionStructureValidator';

export class ValidationService {
  private ruleRegistry: RuleRegistry;
  private validationState: ValidationState;

  constructor() {
    this.ruleRegistry = new RuleRegistry();
    this.validationState = {
      overrides: [],
      history: []
    };

    // Register default validators
    this.registerDefaultValidators();
  }

  private registerDefaultValidators(): void {
    // Register structural validators in order of priority
    this.ruleRegistry.registerRule(new AccountExistenceValidator());
    this.ruleRegistry.registerRule(new TransactionStructureValidator());
    this.ruleRegistry.registerRule(new AccountTypeValidator());
    
    // Validate no circular dependencies
    this.ruleRegistry.validateDependencies();
  }

  async validate(
    transaction: Transaction,
    debitAccount: Account,
    creditAccount: Account,
    metadata?: Record<string, unknown>
  ): Promise<ValidationResult> {
    // Create validation context
    const context: ValidationContext = {
      transaction,
      accounts: {
        debit: debitAccount,
        credit: creditAccount
      },
      metadata,
      state: this.validationState
    };

    // Run validation levels in order
    const results: ValidationResult[] = [];
    
    for (const level of Object.values(ValidationLevel)) {
      const levelResult = await this.validateLevel(level, context);
      results.push(levelResult);

      // Stop on first validation level that fails
      if (!levelResult.isValid && !this.hasValidOverride(levelResult)) {
        break;
      }
    }

    // Combine all results
    return this.combineResults(results);
  }

  private async validateLevel(
    level: ValidationLevel,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const rules = this.ruleRegistry.getRulesByLevel(level);
    const results: ValidationResult[] = [];

    for (const rule of rules) {
      // Check if all dependencies have passed
      const dependencies = rule.getDependencies?.() || [];
      const dependenciesValid = await this.checkDependencies(dependencies, context);
      
      if (!dependenciesValid) {
        continue;
      }

      const result = await rule.validate(context);
      results.push(result);

      // Stop level validation if a rule fails without override
      if (!result.isValid && !this.hasValidOverride(result)) {
        break;
      }
    }

    return this.combineResults(results, level);
  }

  private async checkDependencies(
    dependencies: string[],
    context: ValidationContext
  ): Promise<boolean> {
    for (const depId of dependencies) {
      const rule = this.ruleRegistry.getRule(depId);
      if (!rule) {
        throw new Error(`Dependency rule ${depId} not found`);
      }

      const result = await rule.validate(context);
      if (!result.isValid && !this.hasValidOverride(result)) {
        return false;
      }
    }
    return true;
  }

  private hasValidOverride(result: ValidationResult): boolean {
    if (!result.errors.length || !result.overrides?.length) {
      return false;
    }

    const now = new Date();
    return result.overrides.some(override => 
      !override.expiresAt || override.expiresAt > now
    );
  }

  private combineResults(results: ValidationResult[], level?: ValidationLevel): ValidationResult {
    if (results.length === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
        level: level || ValidationLevel.Structural
      };
    }

    const combined: ValidationResult = {
      isValid: results.every(r => r.isValid || this.hasValidOverride(r)),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings),
      overrides: results.flatMap(r => r.overrides || []),
      level: level || results[0].level
    };

    return combined;
  }

  // Public methods for managing overrides
  addOverride(override: ValidationOverride): void {
    this.validationState.overrides.push(override);
  }

  removeOverride(ruleId: string): void {
    this.validationState.overrides = this.validationState.overrides
      .filter(o => o.ruleId !== ruleId);
  }

  clearExpiredOverrides(): void {
    const now = new Date();
    this.validationState.overrides = this.validationState.overrides
      .filter(o => !o.expiresAt || o.expiresAt > now);
  }

  // Method to register custom validators
  registerValidator(validator: any): void {
    this.ruleRegistry.registerRule(validator);
    this.ruleRegistry.validateDependencies();
  }
}
