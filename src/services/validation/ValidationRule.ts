import { ValidationContext, ValidationLevel, ValidationResult } from '../../types/validation';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  level: ValidationLevel;
  priority: number;
  dependencies?: string[];  // IDs of rules that must run first
  
  validate(context: ValidationContext): Promise<ValidationResult>;
  
  // Optional methods for rule customization
  canOverride?: (context: ValidationContext) => boolean;
  getDependencies?: () => string[];
}
