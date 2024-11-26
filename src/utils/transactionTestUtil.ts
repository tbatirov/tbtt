import { Transaction } from '../types/ledger';
import { mappingLogger } from '../services/logging/MappingLogger';
import { useTransactionStore } from '../store/transactionStore';
import { useStandardStore } from '../store/standardStore';
import { testTransactions } from '../test/testData';

interface CSVTransaction {
  Transaction_ID: string;
  Date: string;
  Time: string;
  Description: string;
  Account_Number: string;
  Customer_Name: string;
  Transaction_Type: string;
  Amount: string;
}

export const convertCSVToTransactions = (csvData: CSVTransaction[]): Transaction[] => {
  return csvData.map(row => ({
    id: row.Transaction_ID,
    date: new Date(`${row.Date} ${row.Time}`),
    description: row.Description,
    amount: parseFloat(row.Amount),
    customerName: row.Customer_Name,
    accountNumber: row.Account_Number,
    type: row.Transaction_Type.toLowerCase(),
    status: 'pending',
    entries: [
      {
        type: 'debit',
        amount: parseFloat(row.Amount),
        accountId: '', // To be mapped
        status: 'pending'
      },
      {
        type: 'credit',
        amount: parseFloat(row.Amount),
        accountId: '', // To be mapped
        status: 'pending'
      }
    ],
    metadata: {
      originalType: row.Transaction_Type,
      importDate: new Date()
    }
  }));
};

export const suggestAccountMapping = (transaction: Transaction, accounts: any[]) => {
  const { description, type, amount } = transaction;
  const descLower = description.toLowerCase();
  
  // Log mapping attempt for debugging
  mappingLogger.info('Attempting to map transaction', 'mapping', transaction.id, { description, type, amount });

  // Helper function to identify account section from code
  const getAccountSection = (accountCode: string): string => {
    // Assuming account codes are 4 digits, return first two digits
    return accountCode.substring(0, 2);
  };

  // Helper function to check if account is a section header
  const isSectionHeader = (accountCode: string): boolean => {
    return accountCode.endsWith('00');
  };

  // Get accounts by type and subtype with enhanced section-based scoring
  const getAccountsByType = (accountType: string, subtypes: string[] = [], keywords: string[] = []) => {
    const typeAccounts = accounts.filter(a => a.type === accountType);
    
    // First pass: identify relevant sections
    const sectionScores = new Map<string, number>();
    typeAccounts.forEach(account => {
      if (isSectionHeader(account.code)) {
        let sectionScore = 0;
        const sectionText = (account.name + ' ' + (account.description || '')).toLowerCase();
        
        // Score based on keywords
        keywords.forEach(keyword => {
          if (sectionText.includes(keyword.toLowerCase())) {
            sectionScore += 2; // Higher weight for section matches
          }
        });

        // Store section score
        const section = getAccountSection(account.code);
        sectionScores.set(section, (sectionScores.get(section) || 0) + sectionScore);
      }
    });

    // Score and sort accounts with section consideration
    const scoredAccounts = typeAccounts.map(account => {
      let score = 0;
      const accountSection = getAccountSection(account.code);
      
      // Base score for matching type
      score += 1;
      
      // Additional score for matching subtype
      if (subtypes.length > 0 && subtypes.includes(account.subtype)) {
        score += 2;
      }

      // Section relevance score
      const sectionScore = sectionScores.get(accountSection) || 0;
      score += sectionScore;
      
      // Penalty for header accounts (we want to use specific accounts)
      if (isSectionHeader(account.code)) {
        score -= 3;
      }
      
      // Score for matching keywords in account name or description
      const accountText = (account.name + ' ' + (account.description || '')).toLowerCase();
      keywords.forEach(keyword => {
        if (accountText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      return { account, score };
    });

    // Sort by score descending
    scoredAccounts.sort((a, b) => b.score - a.score);
    
    // Log account scores for debugging
    mappingLogger.debug('Account scores', 'mapping', transaction.id, { 
      accountType,
      sectionScores: Object.fromEntries(sectionScores),
      scores: scoredAccounts.map(sa => ({
        id: sa.account.id,
        code: sa.account.code,
        name: sa.account.name,
        score: sa.score,
        section: getAccountSection(sa.account.code)
      }))
    });

    return scoredAccounts.map(sa => sa.account);
  };

  // Common keywords for transaction types
  const keywords = {
    service: ['service', 'professional', 'consulting', 'fee'],
    supplies: ['supplies', 'materials', 'items', 'purchase'],
    deposit: ['deposit', 'credit', 'cheque'],
    expense: ['payment', 'expense', 'purchase', 'store'],
    recharge: ['recharge', 'mobile', 'phone', 'utility'],
    entertainment: ['restaurant', 'movie', 'entertainment', 'ticket']
  };

  // Helper function to check if description matches any keywords
  const matchesKeywords = (desc: string, keywordList: string[]) => {
    return keywordList.some(keyword => desc.includes(keyword));
  };

  // Extract relevant keywords from description
  const getRelevantKeywords = (desc: string): string[] => {
    const words = desc.toLowerCase().split(/\s+/);
    return words.filter(word => 
      word.length > 3 && // Skip short words
      !['and', 'the', 'for', 'from', 'with'].includes(word) // Skip common words
    );
  };

  // Find the most relevant accounts based on transaction type and description
  const findRelevantAccounts = (debitTypes: string[], creditTypes: string[]) => {
    const descKeywords = getRelevantKeywords(description);
    
    const debitAccounts = debitTypes.flatMap(type => 
      getAccountsByType(type, [], descKeywords)
    );
    
    const creditAccounts = creditTypes.flatMap(type => 
      getAccountsByType(type, [], descKeywords)
    );

    if (debitAccounts.length === 0 || creditAccounts.length === 0) {
      mappingLogger.warn('No matching accounts found for transaction', 'mapping', transaction.id, { description, type });
      return null;
    }

    const mapping = {
      debit: debitAccounts[0],
      credit: creditAccounts[0]
    };

    mappingLogger.debug('Found account mapping', 'mapping', transaction.id, {
      debit: {
        id: mapping.debit.id,
        code: mapping.debit.code,
        name: mapping.debit.name
      },
      credit: {
        id: mapping.credit.id,
        code: mapping.credit.code,
        name: mapping.credit.name
      }
    });

    return mapping;
  };

  // Professional service fee
  if (matchesKeywords(descLower, keywords.service)) {
    mappingLogger.info('Mapped as service transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['asset'], ['revenue']);
  }

  // Supplies and purchases
  if (matchesKeywords(descLower, keywords.supplies)) {
    mappingLogger.info('Mapped as supplies transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['expense'], ['asset']);
  }

  // Deposits
  if (matchesKeywords(descLower, keywords.deposit)) {
    mappingLogger.info('Mapped as deposit transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['asset'], ['asset']);
  }

  // General expenses
  if (matchesKeywords(descLower, keywords.expense)) {
    mappingLogger.info('Mapped as expense transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['expense'], ['asset']);
  }

  // Recharge/utilities
  if (matchesKeywords(descLower, keywords.recharge)) {
    mappingLogger.info('Mapped as utility transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['expense'], ['asset']);
  }

  // Entertainment
  if (matchesKeywords(descLower, keywords.entertainment)) {
    mappingLogger.info('Mapped as entertainment transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['expense'], ['asset']);
  }

  // Default mapping based on transaction type
  if (type === 'debit' || type === 'withdrawal') {
    mappingLogger.info('Mapped as debit transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['expense'], ['asset']);
  }

  if (type === 'credit' || type === 'deposit') {
    mappingLogger.info('Mapped as credit transaction', 'mapping', transaction.id, { description, type });
    return findRelevantAccounts(['asset'], ['revenue']);
  }

  // Fallback mapping
  mappingLogger.warn('Using fallback mapping', 'mapping', transaction.id, { description, type });
  const mapping = findRelevantAccounts(['asset', 'expense'], ['liability', 'revenue']);
  if (!mapping) {
    mappingLogger.error('Failed to find any suitable accounts for mapping', 'mapping', transaction.id, { description, type });
    return null;
  }
  return mapping;
};

// Transaction type to section mapping
const TRANSACTION_SECTIONS = {
  'Professional Service Fee': { debit: '11', credit: '91' },  // Receivable to Service Revenue
  'Small Business Supplies': { debit: '94', credit: '11' },   // Operating Expense to Cash/Payable
  'Bank Transfer': { debit: '11', credit: '11' },            // Cash to Cash
  'Expense': { debit: '94', credit: '11' },                  // Operating Expense to Cash
  'Revenue': { debit: '11', credit: '91' }                   // Receivable to Revenue
};

const validateSectionMapping = (transaction: Transaction, suggestedAccounts: any[]) => {
  const transactionType = transaction.metadata?.originalType || transaction.type;
  const expectedSections = TRANSACTION_SECTIONS[transactionType];
  
  if (!expectedSections) {
    mappingLogger.warn(`No section mapping found for transaction type: ${transactionType}`);
    return false;
  }

  const [debitAccount, creditAccount] = suggestedAccounts;
  const debitSection = debitAccount.code.substring(0, 2);
  const creditSection = creditAccount.code.substring(0, 2);

  const isValid = debitSection === expectedSections.debit && 
                 creditSection === expectedSections.credit;

  if (!isValid) {
    mappingLogger.warn(
      `Invalid section mapping for ${transactionType}. ` +
      `Expected: ${expectedSections.debit}xx -> ${expectedSections.credit}xx, ` +
      `Got: ${debitSection}xx -> ${creditSection}xx`
    );
  }

  return isValid;
};

export const suggestAccountMappingImproved = (transaction: Transaction, accounts: any[]) => {
  const { description, type, amount } = transaction;
  const descLower = description.toLowerCase();
  
  // Log mapping attempt for debugging
  mappingLogger.info('Attempting to map transaction', 'mapping', transaction.id, { description, type, amount });

  // Score accounts based on type, subtype, and keywords
  const scoredAccounts = accounts
    .filter(account => account.level !== 'header') // Exclude header accounts
    .map(account => ({
      account,
      score: calculateAccountScore(account, transaction)
    }))
    .sort((a, b) => b.score - a.score);

  // Get top scoring accounts for debit and credit
  const suggestedAccounts = [
    scoredAccounts[0]?.account,
    scoredAccounts[1]?.account
  ];

  // Validate section mapping
  if (!validateSectionMapping(transaction, suggestedAccounts)) {
    mappingLogger.warn('Section validation failed, falling back to default mapping');
    return null;
  }

  return suggestedAccounts;
};

export const testTransactionMapping = async () => {
  const { standardStore } = initializeTestStores();
  const activeStandard = standardStore.getActiveStandard();
  
  if (!activeStandard) {
    mappingLogger.error('No active standard found', 'mapping');
    return;
  }
  
  const accounts = standardStore.getAccounts();
  
  if (!accounts || accounts.length === 0) {
    mappingLogger.error('No accounts found for active standard', 'mapping');
    return;
  }
  
  mappingLogger.info('Starting test mapping', 'mapping', undefined, {
    transactionIds: testTransactions.map(t => t.id)
  });

  // Add test transactions
  const transactionStore = useTransactionStore.getState();
  transactionStore.addTransactions(testTransactions);

  // Map each transaction
  for (const transaction of testTransactions) {
    const suggestedMapping = suggestAccountMappingImproved(transaction, accounts);
    
    if (!suggestedMapping) {
      mappingLogger.error('Failed to suggest mapping', 'mapping', transaction.id);
      continue;
    }

    try {
      await transactionStore.updateTransactionMapping(
        transaction.id,
        suggestedMapping[0].id,
        suggestedMapping[1].id
      );
      
      mappingLogger.info('Successfully mapped transaction', 'mapping', transaction.id, {
        debitAccount: suggestedMapping[0],
        creditAccount: suggestedMapping[1]
      });
    } catch (error) {
      mappingLogger.error('Error updating transaction mapping', 'mapping', transaction.id, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  mappingLogger.info('Test mapping complete', 'mapping');
};
