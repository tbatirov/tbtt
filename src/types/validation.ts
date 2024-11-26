import { z } from 'zod';

export const accountImportSchema = z.object({
  accounting_code: z.string().min(1, 'Account code is required'),
  accounting_name: z.string().min(1, 'Account name is required'),
  type: z.string().min(1, 'Type is required'),
  subtype: z.string().min(1, 'Subtype is required'),
  sign_convention: z.string().min(1, 'Sign convention is required')
}).strict();

export const ledgerEntrySchema = z.object({
  Date: z.string().min(1, 'Date is required'),
  Reference: z.string().min(1, 'Reference is required'),
  Description: z.string().min(1, 'Description is required'),
  Debit_Account: z.string().min(1, 'Debit account is required'),
  Debit_Account_Name: z.string().min(1, 'Debit account name is required'),
  Credit_Account: z.string().min(1, 'Credit account is required'),
  Credit_Account_Name: z.string().min(1, 'Credit account name is required'),
  Amount: z.string().min(1, 'Amount is required'),
  Running_Balance: z.string().min(1, 'Running balance is required'),
  Posted_By: z.string().min(1, 'Posted by is required')
}).strict();

export type AccountImportData = z.infer<typeof accountImportSchema>;
export type LedgerEntryData = z.infer<typeof ledgerEntrySchema>;

export enum ValidationLevel {
  Structural = 'structural',
  Accounting = 'accounting',
  Business = 'business',
  Historical = 'historical'
}

export enum ValidationSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info'
}

export interface ValidationError {
  code: string;
  message: string;
  level: ValidationLevel;
  severity: ValidationSeverity;
  affectedFields: string[];
  suggestedFixes?: ValidationFix[];
}

export interface ValidationFix {
  description: string;
  action: () => Promise<void>;
}

export interface ValidationOverride {
  ruleId: string;
  reason: string;
  approvedBy?: string;
  expiresAt?: Date;
}

export interface ValidationState {
  overrides: ValidationOverride[];
  history: ValidationResult[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  overrides?: ValidationOverride[];
  level: ValidationLevel;
}

export interface ValidationContext {
  transaction: Transaction;
  accounts: {
    debit: Account;
    credit: Account;
  };
  metadata?: Record<string, unknown>;
  state: ValidationState;
}

// Accounting-specific types
export interface AccountingPeriod {
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
  closingDate?: Date;
}

export interface AccountBalance {
  current: number;
  pending: number;
  asOf: Date;
}

export interface SignConventionRule {
  accountType: string;
  normalBalance: 'debit' | 'credit';
  increasesWith: 'debit' | 'credit';
}

export interface AccountTypeCompatibility {
  sourceType: string;
  targetType: string;
  allowedOperations: ('debit' | 'credit')[];
}

// Extend ValidationContext to include accounting-specific data
export interface AccountingValidationContext extends ValidationContext {
  balances?: {
    debit?: AccountBalance;
    credit?: AccountBalance;
  };
  period?: AccountingPeriod;
}