import React, { useState } from 'react';
import { convertCSVToTransactions, testTransactionMapping } from '../../utils/transactionTestUtil';
import { mappingLogger } from '../../services/logging/MappingLogger';

const sampleData = [
  {
    Transaction_ID: "T1001",
    Date: "23.11.2024",
    Time: "3:23:59",
    Description: "Travel booking payment",
    Account_Number: "AC7105",
    Customer_Name: "Customer 1",
    Transaction_Type: "Debit",
    Amount: "836.54"
  },
  {
    Transaction_ID: "T1002",
    Date: "25.03.2024",
    Time: "6:45:25",
    Description: "Courier and shipping fee",
    Account_Number: "AC8299",
    Customer_Name: "Customer 2",
    Transaction_Type: "Withdrawal",
    Amount: "773.12"
  },
  {
    Transaction_ID: "T1003",
    Date: "10.11.2024",
    Time: "23:38:07",
    Description: "Salary deposit",
    Account_Number: "AC2150",
    Customer_Name: "Customer 3",
    Transaction_Type: "Withdrawal",
    Amount: "27.90"
  },
  {
    Transaction_ID: "T1004",
    Date: "17.06.2024",
    Time: "0:15:52",
    Description: "Electricity usage adjustment",
    Account_Number: "AC3129",
    Customer_Name: "Customer 4",
    Transaction_Type: "Credit",
    Amount: "547.78"
  },
  {
    Transaction_ID: "T1005",
    Date: "22.11.2024",
    Time: "0:51:02",
    Description: "Doctor consultation fee",
    Account_Number: "AC1214",
    Customer_Name: "Customer 5",
    Transaction_Type: "Deposit",
    Amount: "510.14"
  },
  {
    Transaction_ID: "T1006",
    Date: "07.11.2024",
    Time: "2:20:09",
    Description: "Courier and shipping fee",
    Account_Number: "AC4174",
    Customer_Name: "Customer 6",
    Transaction_Type: "Deposit",
    Amount: "896.81"
  }
];

export const TransactionMappingTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    mappingLogger.clearLogs();
    
    try {
      const transactions = convertCSVToTransactions(sampleData);
      await testTransactionMapping(transactions);
    } catch (error) {
      console.error('Test failed:', error);
    }
    
    setIsRunning(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Transaction Mapping Test</h2>
      <button
        onClick={runTest}
        disabled={isRunning}
        className={`px-4 py-2 rounded ${
          isRunning
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isRunning ? 'Running Test...' : 'Run Test'}
      </button>
      <p className="mt-2 text-sm text-gray-600">
        Check the Mapping Debug panel for results
      </p>
    </div>
  );
};
