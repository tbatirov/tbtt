import React, { useState } from 'react';
import { useTransactionStore } from '../../store/transactionStore';
import { useStandardStore } from '../../store/standardStore';
import { Check, ArrowLeft, AlertTriangle, XCircle } from 'lucide-react';
import { Dialog } from '../common/Dialog';

interface MappingPreviewProps {
  companyId: string;
  onApprove: () => void;
  onEdit: () => void;
}

interface OverrideFormData {
  reason: string;
  approvedBy: string;
  expiresAt?: string;
}

export const MappingPreview: React.FC<MappingPreviewProps> = ({
  companyId,
  onApprove,
  onEdit
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideData, setOverrideData] = useState<OverrideFormData>({
    reason: '',
    approvedBy: ''
  });

  const { 
    transactions, 
    approveTransactions,
    approveTransactionsWithOverride,
    getValidationResult 
  } = useTransactionStore();
  
  const { getActiveStandard, getAccounts } = useStandardStore();
  const activeStandard = getActiveStandard();
  const accounts = activeStandard ? getAccounts(activeStandard.id!) : [];

  const companyTransactions = transactions.filter(t => t.companyId === companyId);
  const mappedTransactions = companyTransactions.filter(t => t.status === 'mapped');
  const unmappedTransactions = companyTransactions.filter(t => t.status !== 'mapped');

  const transactionsWithWarnings = mappedTransactions.filter(t => {
    const result = getValidationResult(t.id!);
    return result?.warnings.length > 0;
  });

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await approveTransactions(companyId);
      onApprove();
    } catch (err) {
      const error = err as Error;
      if (error.message === 'WARNINGS_REQUIRE_OVERRIDE') {
        setShowOverrideDialog(true);
      } else {
        setError(error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideData.reason || !overrideData.approvedBy) {
      setError('Please provide both reason and approver');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await approveTransactionsWithOverride(companyId, {
        reason: overrideData.reason,
        approvedBy: overrideData.approvedBy,
        expiresAt: overrideData.expiresAt ? new Date(overrideData.expiresAt) : undefined
      });
      setShowOverrideDialog(false);
      onApprove();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Mapping Review</h2>
          <div className="flex gap-4">
            <button
              onClick={onEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Edit Mappings
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing || unmappedTransactions.length > 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve & Generate
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <XCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {transactionsWithWarnings.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Transactions with Warnings
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    {transactionsWithWarnings.length} transaction(s) have warnings that
                    require review before approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Mapping Statistics</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Transactions</span>
                <span className="text-sm font-medium">{companyTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Mapped Transactions</span>
                <span className="text-sm font-medium text-green-600">{mappedTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Unmapped Transactions</span>
                <span className="text-sm font-medium text-red-600">{unmappedTransactions.length}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Account Distribution</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {Object.entries(
                mappedTransactions.reduce((acc, t) => {
                  const account = accounts.find(a => a.id === t.accountId);
                  if (account) {
                    acc[account.type] = (acc[account.type] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>))
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-sm text-gray-600">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Transaction Preview</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companyTransactions.map((transaction, index) => {
                const account = accounts.find(a => a.id === transaction.accountId);
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account ? `${account.code} - ${account.name}` : 'Unmapped'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Mapped
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Unmapped
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Override Dialog */}
      <Dialog
        isOpen={showOverrideDialog}
        onClose={() => setShowOverrideDialog(false)}
        title="Override Required"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Some transactions have warnings that require override approval.
            Please provide the following information to proceed:
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Override Reason
            </label>
            <textarea
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows={3}
              value={overrideData.reason}
              onChange={(e) => setOverrideData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Explain why these warnings can be safely ignored..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Approved By
            </label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={overrideData.approvedBy}
              onChange={(e) => setOverrideData(prev => ({ ...prev, approvedBy: e.target.value }))}
              placeholder="Enter your name or ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Override Expiration (Optional)
            </label>
            <input
              type="date"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={overrideData.expiresAt}
              onChange={(e) => setOverrideData(prev => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
              onClick={handleOverride}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Apply Override'}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
              onClick={() => setShowOverrideDialog(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};