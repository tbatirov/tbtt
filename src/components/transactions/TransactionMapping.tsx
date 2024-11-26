import React, { useState } from 'react';
import { useTransactionStore } from '../../store/transactionStore';
import { useStandardStore } from '../../store/standardStore';
import { TransactionMappingStatus } from './TransactionMappingStatus';
import { TransactionMappingTable } from './TransactionMappingTable';
import { aiTransactionMapper } from '../../services/mapping/aiTransactionMapper';
import { configService } from '../../services/mapping/config';

interface TransactionMappingProps {
  companyId: string | null;
  onComplete: () => void;
}

export const TransactionMapping: React.FC<TransactionMappingProps> = ({
  companyId,
  onComplete
}) => {
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [mappingErrors, setMappingErrors] = useState<Record<string, string>>({});
  const [autoMapError, setAutoMapError] = useState<string | null>(null);
  const [mappingProgress, setMappingProgress] = useState(0);
  
  const { transactions, updateTransactionMapping } = useTransactionStore();
  const { getActiveStandard, getAccounts } = useStandardStore();
  const activeStandard = getActiveStandard();

  const companyTransactions = transactions.filter(t => t.companyId === companyId);

  const handleAutoMap = async () => {
    if (!configService.isEnabled()) {
      setAutoMapError('API key not found in environment variables. Please check your .env file.');
      return;
    }

    if (!companyId || !activeStandard) {
      setAutoMapError('No active accounting standard found');
      return;
    }

    const accounts = getAccounts(activeStandard.id!);
    if (!accounts.length) {
      setAutoMapError('No accounts found in chart of accounts');
      return;
    }
    
    setIsAutoMapping(true);
    setAutoMapError(null);
    setMappingErrors({});
    setMappingProgress(0);
    
    try {
      aiTransactionMapper.initialize(accounts);

      const batchSize = 3;
      const totalBatches = Math.ceil(companyTransactions.length / batchSize);
      
      for (let i = 0; i < companyTransactions.length; i += batchSize) {
        const batch = companyTransactions.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async transaction => {
            const result = await aiTransactionMapper.suggestMapping(transaction);
            return result;
          })
        );

        results.forEach((result, index) => {
          const transaction = batch[index];
          if (result.status === 'fulfilled' && result.value.debitAccount && result.value.creditAccount) {
            updateTransactionMapping(
              transaction.id!,
              result.value.debitAccount.id!,
              result.value.creditAccount.id!
            );
          } else if (result.status === 'rejected') {
            const error = result.reason instanceof Error ? result.reason.message : 'Mapping failed';
            setMappingErrors(prev => ({
              ...prev,
              [transaction.id!]: error
            }));
          }
        });

        setMappingProgress(((i + batch.length) / companyTransactions.length) * 100);
        
        if (i + batchSize < companyTransactions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Auto-mapping failed';
      setAutoMapError(msg);
    } finally {
      setIsAutoMapping(false);
      setMappingProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      {autoMapError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Auto-mapping Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{autoMapError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <TransactionMappingStatus
        companyId={companyId}
        onAutoMap={handleAutoMap}
        onComplete={onComplete}
        isAutoMapping={isAutoMapping}
        progress={mappingProgress}
        hasErrors={Object.keys(mappingErrors).length > 0}
      />

      <TransactionMappingTable
        transactions={companyTransactions}
        onAccountSelect={(transactionId, entryType, accountId) => {
          updateTransactionMapping(
            transactionId,
            entryType === 'debit' ? accountId : '',
            entryType === 'credit' ? accountId : ''
          );
        }}
        errors={mappingErrors}
      />
    </div>
  );
};