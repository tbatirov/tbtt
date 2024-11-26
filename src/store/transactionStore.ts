import { create } from 'zustand';
import { Transaction } from '../types/ledger';
import { useStandardStore } from './standardStore';
import { SignConventionValidator } from '../services/validation/rules/accounting/SignConventionValidator';
import { ContraAccountValidator } from '../services/validation/rules/accounting/ContraAccountValidator';
import { ValidationContext, ValidationResult } from '../types/validation';
import { mappingLogger } from '../services/logging/MappingLogger';

interface TransactionStore {
  transactions: Transaction[];
  validationResults: Record<string, ValidationResult>;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransactionMapping: (transactionId: string, debitAccountId: string, creditAccountId: string) => Promise<ValidationResult>;
  approveTransactions: (companyId: string) => Promise<number>;
  approveTransactionsWithOverride: (companyId: string, override: { 
    reason: string;
    approvedBy: string;
    expiresAt?: Date;
  }) => Promise<number>;
  getTransactionsByCompany: (companyId: string) => Transaction[];
  getValidationResult: (transactionId: string) => ValidationResult | undefined;
  pendingApprovals: Record<string, {
    transactions: Transaction[];
    warnings: { transactionId: string; warnings: string; }[];
    timestamp: Date;
  } | undefined>;
}

export const useTransactionStore = create<TransactionStore>((set, get) => {
  // Initialize validators
  const signConventionValidator = new SignConventionValidator();
  const contraAccountValidator = new ContraAccountValidator();

  return {
    transactions: [],
    validationResults: {},
    pendingApprovals: {},

    addTransactions: (newTransactions) => {
      mappingLogger.info(`Adding ${newTransactions.length} new transactions`, 'mapping', undefined, {
        transactionIds: newTransactions.map(t => t.id)
      });
      set((state) => ({
        transactions: [...state.transactions, ...newTransactions]
      }));
    },

    updateTransactionMapping: async (transactionId, debitAccountId, creditAccountId) => {
      const { getActiveStandard, getAccounts } = useStandardStore.getState();
      const activeStandard = getActiveStandard();
      
      mappingLogger.debug('Starting transaction mapping update', 'mapping', transactionId, {
        debitAccountId,
        creditAccountId
      });
      
      if (!activeStandard) {
        mappingLogger.error('No active accounting standard found', 'mapping', transactionId);
        throw new Error('No active accounting standard');
      }

      const state = get();
      const transaction = state.transactions.find(t => t.id === transactionId);
      
      if (!transaction) {
        mappingLogger.error('Transaction not found', 'mapping', transactionId);
        throw new Error(`Transaction ${transactionId} not found`);
      }

      const accounts = getAccounts(activeStandard.id!);
      const debitAccount = accounts.find(a => a.id === debitAccountId);
      const creditAccount = accounts.find(a => a.id === creditAccountId);

      if (!debitAccount || !creditAccount) {
        mappingLogger.error('One or both accounts not found', 'mapping', transactionId, {
          debitAccountFound: !!debitAccount,
          creditAccountFound: !!creditAccount
        });
        throw new Error('One or both accounts not found');
      }

      // Create validation context with all required fields
      const validationContext: ValidationContext = {
        transaction,
        accounts: {
          debit: debitAccount,
          credit: creditAccount
        },
        debit: debitAccount,
        credit: creditAccount,
        standardId: activeStandard.id!,
        metadata: {
          ...transaction.metadata,
          validationDate: new Date()
        },
        state: {
          overrides: [],
          history: []
        }
      };

      mappingLogger.debug('Running validation checks', 'validation', transactionId);

      // Run validations
      const signConventionResult = await signConventionValidator.validate(validationContext);
      const contraAccountResult = await contraAccountValidator.validate(validationContext);

      mappingLogger.debug('Validation results received', 'validation', transactionId, {
        signConventionResult,
        contraAccountResult
      });

      // Combine validation results
      const combinedResult: ValidationResult = {
        isValid: signConventionResult.isValid && contraAccountResult.isValid,
        errors: [...signConventionResult.errors, ...contraAccountResult.errors],
        warnings: [...signConventionResult.warnings, ...contraAccountResult.warnings],
        level: signConventionResult.level,
        overrides: []
      };

      if (!combinedResult.isValid) {
        mappingLogger.error('Validation failed', 'validation', transactionId, {
          errors: combinedResult.errors
        });
      } else if (combinedResult.warnings.length > 0) {
        mappingLogger.warning('Validation passed with warnings', 'validation', transactionId, {
          warnings: combinedResult.warnings
        });
      } else {
        mappingLogger.info('Validation passed successfully', 'validation', transactionId);
      }

      // Update transaction with new mapping and status
      const updatedTransaction = {
        ...transaction,
        debitAccountId,
        creditAccountId,
        mappedAt: new Date(),
        status: combinedResult.isValid 
          ? (combinedResult.warnings.length > 0 ? 'warning' : 'mapped')
          : 'error',
        entries: transaction.entries.map(entry => ({
          ...entry,
          accountId: entry.type === 'debit' ? debitAccountId : creditAccountId
        }))
      };

      set((state) => ({
        transactions: state.transactions.map(t => 
          t.id === transactionId ? updatedTransaction : t
        ),
        validationResults: {
          ...state.validationResults,
          [transactionId]: combinedResult
        }
      }));

      mappingLogger.info('Transaction mapping updated', 'mapping', transactionId, {
        status: updatedTransaction.status,
        debitAccountId,
        creditAccountId
      });

      return combinedResult;
    },

    approveTransactions: async (companyId: string) => {
      const state = get();
      const transactions = state.transactions.filter(t => 
        t.companyId === companyId && t.status === 'mapped'
      );

      // Check if all transactions have been validated
      const invalidTransactions = transactions.filter(t => {
        const validationResult = state.validationResults[t.id!];
        return !validationResult || !validationResult.isValid;
      });

      if (invalidTransactions.length > 0) {
        const errors = invalidTransactions.map(t => {
          const result = state.validationResults[t.id!];
          return {
            transactionId: t.transactionId,
            errors: result ? result.errors.map(e => e.message).join(', ') : 'Not validated'
          };
        });
        
        throw new Error(`Cannot approve transactions with validation errors:\n${
          errors.map(e => `${e.transactionId}: ${e.errors}`).join('\n')
        }`);
      }

      // Check for transactions with warnings and require explicit override
      const transactionsWithWarnings = transactions.filter(t => {
        const validationResult = state.validationResults[t.id!];
        return validationResult?.warnings.length > 0;
      });

      if (transactionsWithWarnings.length > 0) {
        const warnings = transactionsWithWarnings.map(t => {
          const result = state.validationResults[t.id!];
          return {
            transactionId: t.transactionId,
            warnings: result.warnings.map(w => w.message).join(', ')
          };
        });

        // Store warning state for override handling
        set(state => ({
          ...state,
          pendingApprovals: {
            ...state.pendingApprovals,
            [companyId]: {
              transactions: transactionsWithWarnings,
              warnings,
              timestamp: new Date()
            }
          }
        }));

        throw new Error('WARNINGS_REQUIRE_OVERRIDE');
      }

      // All validations passed, approve transactions
      set(state => ({
        transactions: state.transactions.map(t =>
          t.companyId === companyId && t.status === 'mapped'
            ? {
                ...t,
                status: 'approved',
                updatedAt: new Date(),
                metadata: {
                  ...t.metadata,
                  approvedAt: new Date(),
                  validationResults: state.validationResults[t.id!]
                }
              }
            : t
        )
      }));

      return transactions.length;
    },

    approveTransactionsWithOverride: async (companyId: string, override: { 
      reason: string;
      approvedBy: string;
      expiresAt?: Date;
    }) => {
      const state = get();
      const pendingApproval = state.pendingApprovals[companyId];

      if (!pendingApproval) {
        throw new Error('No pending approvals requiring override');
      }

      // Apply override and approve transactions
      set(state => ({
        transactions: state.transactions.map(t => {
          if (t.companyId === companyId && t.status === 'mapped') {
            return {
              ...t,
              status: 'approved',
              updatedAt: new Date(),
              metadata: {
                ...t.metadata,
                approvedAt: new Date(),
                validationResults: state.validationResults[t.id!],
                override: {
                  ...override,
                  appliedAt: new Date()
                }
              }
            };
          }
          return t;
        }),
        // Clear pending approval
        pendingApprovals: {
          ...state.pendingApprovals,
          [companyId]: undefined
        }
      }));

      return pendingApproval.transactions.length;
    },

    getTransactionsByCompany: (companyId) => {
      return get().transactions.filter(t => t.companyId === companyId);
    },

    getValidationResult: (transactionId) => {
      return get().validationResults[transactionId];
    }
  };
});