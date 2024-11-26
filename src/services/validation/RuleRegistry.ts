import { ValidationLevel } from '../../types/validation';
import { ValidationRule } from './ValidationRule';

export class RuleRegistry {
  private rules: Map<string, ValidationRule> = new Map();
  private ruleDependencies: Map<string, Set<string>> = new Map();
  private rulesByLevel: Map<ValidationLevel, Set<string>> = new Map();

  constructor() {
    // Initialize level sets
    Object.values(ValidationLevel).forEach(level => {
      this.rulesByLevel.set(level, new Set());
    });
  }

  registerRule(rule: ValidationRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with ID ${rule.id} is already registered`);
    }

    // Register the rule
    this.rules.set(rule.id, rule);
    
    // Add to level index
    const levelSet = this.rulesByLevel.get(rule.level);
    if (levelSet) {
      levelSet.add(rule.id);
    }

    // Process dependencies
    if (rule.dependencies?.length) {
      this.ruleDependencies.set(rule.id, new Set(rule.dependencies));
      
      // Validate dependencies exist
      rule.dependencies.forEach(depId => {
        if (!this.rules.has(depId)) {
          throw new Error(`Rule ${rule.id} depends on non-existent rule ${depId}`);
        }
      });
    }
  }

  getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId);
  }

  getRulesByLevel(level: ValidationLevel): ValidationRule[] {
    const ruleIds = this.rulesByLevel.get(level) || new Set();
    return Array.from(ruleIds)
      .map(id => this.rules.get(id)!)
      .sort((a, b) => b.priority - a.priority);
  }

  getDependencies(ruleId: string): string[] {
    return Array.from(this.ruleDependencies.get(ruleId) || new Set());
  }

  private detectCycles(ruleId: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(ruleId)) {
      return true;
    }

    visited.add(ruleId);
    const dependencies = this.ruleDependencies.get(ruleId);
    
    if (dependencies) {
      for (const depId of dependencies) {
        if (this.detectCycles(depId, new Set(visited))) {
          return true;
        }
      }
    }

    return false;
  }

  validateDependencies(): void {
    for (const ruleId of this.rules.keys()) {
      if (this.detectCycles(ruleId)) {
        throw new Error(`Circular dependency detected involving rule ${ruleId}`);
      }
    }
  }
}
