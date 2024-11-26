import { AccountType, AccountSubtype } from "../../stores/standardStore";
import { transactionAnalyzer, TransactionContext } from "./transactionAnalyzer";
import { Account } from "../../types/account";
import { StandardStore, useStandardStore } from "../../stores/standardStore";
import { Transaction } from "../../types/transaction";

interface AccountSelectionContext {
  transactionType: string;
  amount: number;
  description: string;
  historicalMatches?: Account[];
  confidenceScores: Map<string, number>;
  metadata: TransactionMetadata;
}

interface AccountMatchResult {
  account: Account;
  confidence: number;
  matchReason: string[];
  priority: number;
}

interface AccountPriorityRule {
  condition: (account: Account, context: AccountSelectionContext) => boolean;
  priorityAdjustment: number;
  reason: string;
}

export interface TransactionMapping {
  debitAccount: Account;
  creditAccount: Account;
  confidence: number;
  reasoning: string[];
}

export class AITransactionMapper {
  private accounts: Account[] = [];
  private accountsByType: Map<AccountType, Account[]> = new Map();
  private accountsBySubtype: Map<AccountSubtype, Account[]> = new Map();
  private accountsByCode: Map<string, Account> = new Map();
  private initialized = false;
  private standardStore: StandardStore;
  private historicalMappings: Map<string, { account: Account; frequency: number }[]> = new Map();
  private accountPatterns: Map<string, string[]> = new Map();
  private amountRanges: Map<string, { min: number; max: number }> = new Map();
  private accountHierarchy: Map<string, Account[]> = new Map();
  private accountValidationRules: Map<string, ((account: Account, context: AccountSelectionContext) => boolean)[]> = new Map();

  private readonly PRIORITY_RULES: AccountPriorityRule[] = [
    {
      condition: (account, context) => 
        this.matchesTransactionPattern(account, context.description),
      priorityAdjustment: 0.3,
      reason: 'Matches transaction pattern'
    },
    {
      condition: (account, context) => 
        this.hasHistoricalUsage(account, context.description),
      priorityAdjustment: 0.2,
      reason: 'Historical usage pattern'
    },
    {
      condition: (account, context) => 
        this.matchesAmountRange(account, context.amount),
      priorityAdjustment: 0.15,
      reason: 'Within typical amount range'
    },
    {
      condition: (account, context) => 
        account.isDefault,
      priorityAdjustment: 0.1,
      reason: 'Default account for type'
    }
  ];

  constructor(standardStore?: StandardStore) {
    this.standardStore = standardStore || useStandardStore.getState();
  }

  initialize(accounts: Account[]) {
    if (!accounts.length) {
      throw new Error('No accounts provided for mapping');
    }

    this.accounts = accounts;
    this.initialized = true;

    // Index accounts by type, subtype, and code
    this.indexAccounts();

    // Build account hierarchy and validation rules
    this.buildAccountHierarchy(accounts);
    this.initializeValidationRules();
  }

  private indexAccounts() {
    this.accountsByType.clear();
    this.accountsBySubtype.clear();
    this.accountsByCode.clear();

    for (const account of this.accounts) {
      if (!account.isActive) continue;

      // Index by type
      if (!this.accountsByType.has(account.type)) {
        this.accountsByType.set(account.type, []);
      }
      this.accountsByType.get(account.type)!.push(account);

      // Index by subtype
      if (!this.accountsBySubtype.has(account.subtype)) {
        this.accountsBySubtype.set(account.subtype, []);
      }
      this.accountsBySubtype.get(account.subtype)!.push(account);

      // Index by code
      this.accountsByCode.set(account.code, account);
    }

    // Sort accounts by code within each type and subtype
    for (const accounts of this.accountsByType.values()) {
      accounts.sort((a, b) => a.code.localeCompare(b.code));
    }
    for (const accounts of this.accountsBySubtype.values()) {
      accounts.sort((a, b) => a.code.localeCompare(b.code));
    }
  }

  private buildAccountHierarchy(accounts: Account[]) {
    this.accountHierarchy.clear();
    
    // First pass: Create parent-child relationships
    accounts.forEach(account => {
      const parentCode = this.getParentAccountCode(account.code);
      if (parentCode) {
        if (!this.accountHierarchy.has(parentCode)) {
          this.accountHierarchy.set(parentCode, []);
        }
        this.accountHierarchy.get(parentCode)!.push(account);
      }
    });

    // Second pass: Sort children by code
    this.accountHierarchy.forEach(children => {
      children.sort((a, b) => a.code.localeCompare(b.code));
    });
  }

  private getParentAccountCode(code: string): string | null {
    // Implement based on your account code structure
    // Example: For a code like "1000.100", parent would be "1000"
    const lastDot = code.lastIndexOf('.');
    return lastDot > 0 ? code.substring(0, lastDot) : null;
  }

  private getAccountHierarchyLevel(code: string): number {
    return code.split('.').length;
  }

  private initializeValidationRules() {
    this.accountValidationRules.clear();

    // Add type-specific validation rules
    this.addTypeValidationRules(AccountType.Asset, [
      this.validateAssetAccount,
      this.validatePositiveBalance
    ]);

    this.addTypeValidationRules(AccountType.Liability, [
      this.validateLiabilityAccount,
      this.validateNegativeBalance
    ]);

    this.addTypeValidationRules(AccountType.Income, [
      this.validateIncomeAccount,
      this.validateCreditBalance
    ]);

    this.addTypeValidationRules(AccountType.Expense, [
      this.validateExpenseAccount,
      this.validateDebitBalance
    ]);
  }

  private addTypeValidationRules(type: AccountType, rules: ((account: Account, context: AccountSelectionContext) => boolean)[]) {
    this.accountValidationRules.set(type, rules);
  }

  private validateAssetAccount = (account: Account, context: AccountSelectionContext): boolean => {
    // Asset accounts typically increase with debits
    if (context.transactionType === 'debit') {
      return true;
    }
    // Allow credits for specific scenarios
    return this.isValidAssetCredit(account, context);
  };

  private validateLiabilityAccount = (account: Account, context: AccountSelectionContext): boolean => {
    // Liability accounts typically increase with credits
    if (context.transactionType === 'credit') {
      return true;
    }
    // Allow debits for specific scenarios
    return this.isValidLiabilityDebit(account, context);
  };

  private validateIncomeAccount = (account: Account, context: AccountSelectionContext): boolean => {
    // Income accounts should normally be credited
    return context.transactionType === 'credit';
  };

  private validateExpenseAccount = (account: Account, context: AccountSelectionContext): boolean => {
    // Expense accounts should normally be debited
    return context.transactionType === 'debit';
  };

  private validatePositiveBalance = (account: Account, context: AccountSelectionContext): boolean => {
    // Ensure asset accounts maintain positive balance
    return true; // Implement balance check logic
  };

  private validateNegativeBalance = (account: Account, context: AccountSelectionContext): boolean => {
    // Ensure liability accounts maintain negative balance
    return true; // Implement balance check logic
  };

  private validateCreditBalance = (account: Account, context: AccountSelectionContext): boolean => {
    // Ensure income accounts maintain credit balance
    return true; // Implement balance check logic
  };

  private validateDebitBalance = (account: Account, context: AccountSelectionContext): boolean => {
    // Ensure expense accounts maintain debit balance
    return true; // Implement balance check logic
  };

  private isValidAssetCredit(account: Account, context: AccountSelectionContext): boolean {
    // Check for valid asset credit scenarios
    const validCreditScenarios = [
      this.isAssetSale(context),
      this.isAssetDepreciation(context),
      this.isAssetAdjustment(context)
    ];
    return validCreditScenarios.some(isValid => isValid);
  }

  private isValidLiabilityDebit(account: Account, context: AccountSelectionContext): boolean {
    // Check for valid liability debit scenarios
    const validDebitScenarios = [
      this.isLiabilityPayment(context),
      this.isLiabilityAdjustment(context)
    ];
    return validDebitScenarios.some(isValid => isValid);
  }

  private isAssetSale(context: AccountSelectionContext): boolean {
    return context.metadata.transactionType === 'sale' ||
           context.description.toLowerCase().includes('sale') ||
           context.description.toLowerCase().includes('sold');
  }

  private isAssetDepreciation(context: AccountSelectionContext): boolean {
    return context.metadata.transactionType === 'depreciation' ||
           context.description.toLowerCase().includes('depreciation');
  }

  private isAssetAdjustment(context: AccountSelectionContext): boolean {
    return context.metadata.transactionType === 'adjustment' ||
           context.description.toLowerCase().includes('adjust');
  }

  private isLiabilityPayment(context: AccountSelectionContext): boolean {
    return context.metadata.transactionType === 'payment' ||
           context.description.toLowerCase().includes('payment') ||
           context.description.toLowerCase().includes('paid');
  }

  private isLiabilityAdjustment(context: AccountSelectionContext): boolean {
    return context.metadata.transactionType === 'adjustment' ||
           context.description.toLowerCase().includes('adjust');
  }

  private findBestMatchingAccount(
    accountType: AccountType,
    accountSubtype: AccountSubtype | undefined,
    context: AccountSelectionContext
  ): AccountMatchResult {
    const potentialAccounts = this.getPotentialAccounts(accountType, accountSubtype);
    const rankedAccounts = this.rankAccounts(potentialAccounts, context);
    
    if (!rankedAccounts.length) {
      throw new Error(`No matching accounts found for type: ${accountType}`);
    }

    return rankedAccounts[0];
  }

  private getPotentialAccounts(
    accountType: AccountType,
    accountSubtype?: AccountSubtype
  ): Account[] {
    let accounts: Account[] = [];

    // Try to find accounts by subtype first
    if (accountSubtype) {
      accounts = this.accountsBySubtype.get(accountSubtype) || [];
    }

    // If no accounts found by subtype, fall back to type
    if (!accounts.length) {
      accounts = this.accountsByType.get(accountType) || [];
    }

    return accounts.filter(account => account.isActive);
  }

  private rankAccounts(
    accounts: Account[],
    context: AccountSelectionContext
  ): AccountMatchResult[] {
    return accounts
      .map(account => {
        const matchResult = this.evaluateAccount(account, context);
        return {
          account,
          ...matchResult
        };
      })
      .sort((a, b) => {
        // Sort by priority first, then by confidence
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return b.confidence - a.confidence;
      });
  }

  private evaluateAccount(
    account: Account,
    context: AccountSelectionContext
  ): Omit<AccountMatchResult, 'account'> {
    let priority = 0;
    let confidence = 0;
    const matchReason: string[] = [];

    // Apply priority rules
    for (const rule of this.PRIORITY_RULES) {
      if (rule.condition(account, context)) {
        priority += rule.priorityAdjustment;
        matchReason.push(rule.reason);
      }
    }

    // Calculate confidence based on metadata
    confidence = this.calculateConfidence(account, context);

    return {
      confidence,
      matchReason,
      priority
    };
  }

  private calculateConfidence(account: Account, context: AccountSelectionContext): number {
    let confidence = 0;

    // Base confidence from transaction analyzer
    confidence += context.confidenceScores.get(account.type) || 0;

    // Adjust based on historical accuracy
    const historicalAccuracy = this.getHistoricalAccuracy(account, context.description);
    confidence += historicalAccuracy * 0.2;

    // Adjust based on account code pattern match
    if (this.matchesAccountCodePattern(account, context)) {
      confidence += 0.15;
    }

    return Math.min(0.95, confidence);
  }

  private matchesTransactionPattern(account: Account, description: string): boolean {
    // Implement pattern matching logic
    const patterns = this.getAccountPatterns(account);
    return patterns.some(pattern => 
      description.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private hasHistoricalUsage(account: Account, description: string): boolean {
    const key = this.getHistoricalKey(description);
    const history = this.historicalMappings.get(key) || [];
    return history.some(h => h.account.id === account.id);
  }

  private matchesAmountRange(account: Account, amount: number): boolean {
    const accountKey = `${account.type}_${account.code}`;
    const range = this.amountRanges.get(accountKey);
    
    if (!range) {
      return true; // No range restrictions
    }

    return amount >= range.min && amount <= range.max;
  }

  private getAccountPatterns(account: Account): string[] {
    const accountKey = `${account.type}_${account.code}`;
    if (!this.accountPatterns.has(accountKey)) {
      // Generate patterns based on account properties
      const patterns = [
        account.name.toLowerCase(),
        account.code.toLowerCase(),
        ...this.generateAccountTypePatterns(account.type),
        ...this.generateSubtypePatterns(account.subtype)
      ];
      this.accountPatterns.set(accountKey, patterns);
    }
    return this.accountPatterns.get(accountKey) || [];
  }

  private generateAccountTypePatterns(type: AccountType): string[] {
    const patterns: string[] = [];
    switch (type) {
      case AccountType.Asset:
        patterns.push('purchase', 'buy', 'acquire', 'investment');
        break;
      case AccountType.Liability:
        patterns.push('loan', 'borrow', 'credit', 'debt');
        break;
      case AccountType.Income:
        patterns.push('revenue', 'income', 'earn', 'receive');
        break;
      case AccountType.Expense:
        patterns.push('expense', 'cost', 'pay', 'spend');
        break;
      case AccountType.Equity:
        patterns.push('capital', 'equity', 'owner', 'share');
        break;
    }
    return patterns;
  }

  private generateSubtypePatterns(subtype: AccountSubtype): string[] {
    // Add specific patterns based on account subtype
    const patterns: string[] = [];
    switch (subtype) {
      case AccountSubtype.Cash:
        patterns.push('cash', 'money', 'currency', 'atm');
        break;
      case AccountSubtype.BankAccount:
        patterns.push('bank', 'deposit', 'transfer', 'wire');
        break;
      case AccountSubtype.AccountsReceivable:
        patterns.push('invoice', 'receivable', 'customer', 'due');
        break;
      case AccountSubtype.AccountsPayable:
        patterns.push('bill', 'payable', 'vendor', 'supplier');
        break;
      // Add more subtypes as needed
    }
    return patterns;
  }

  private matchesAccountCodePattern(account: Account, context: AccountSelectionContext): boolean {
    const { description } = context;
    const codePattern = this.parseAccountCodePattern(account.code);
    return this.testAccountCodePattern(codePattern, description);
  }

  private parseAccountCodePattern(code: string): RegExp {
    // Convert account code to a flexible pattern
    // Example: "1000" becomes /(?:^|\D)1000(?:\D|$)/i
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\D)${escaped}(?:\\D|$)`, 'i');
  }

  private testAccountCodePattern(pattern: RegExp, description: string): boolean {
    return pattern.test(description);
  }

  private getHistoricalKey(description: string): string {
    return description.toLowerCase().trim();
  }

  private getHistoricalAccuracy(account: Account, description: string): number {
    const key = this.getHistoricalKey(description);
    const history = this.historicalMappings.get(key) || [];
    const accountHistory = history.find(h => h.account.id === account.id);
    
    if (!accountHistory) return 0;
    
    const totalUsage = history.reduce((sum, h) => sum + h.frequency, 0);
    return accountHistory.frequency / totalUsage;
  }

  mapTransaction(description: string, amount: number, date?: Date, customerName?: string): TransactionMapping {
    if (!this.initialized) {
      throw new Error('Transaction mapper not initialized');
    }

    const context: TransactionContext = {
      description,
      amount,
      date,
      customerName
    };

    const suggestions = transactionAnalyzer.analyzeTransaction(context);
    
    // Sort suggestions by confidence and split into debit and credit
    const debitSuggestion = suggestions.find(s => s.isDebit);
    const creditSuggestion = suggestions.find(s => !s.isDebit);

    if (!debitSuggestion || !creditSuggestion) {
      throw new Error("Unable to determine valid account mapping");
    }

    const debitAccount = this.findBestMatchingAccount(debitSuggestion.accountType, debitSuggestion.accountSubtype, {
      transactionType: debitSuggestion.transactionType,
      amount,
      description,
      confidenceScores: new Map(),
      metadata: {}
    });

    const creditAccount = this.findBestMatchingAccount(creditSuggestion.accountType, creditSuggestion.accountSubtype, {
      transactionType: creditSuggestion.transactionType,
      amount,
      description,
      confidenceScores: new Map(),
      metadata: {}
    });

    return {
      debitAccount: debitAccount.account,
      creditAccount: creditAccount.account,
      confidence: Math.min(debitAccount.confidence, creditAccount.confidence),
      reasoning: [
        ...debitAccount.matchReason,
        ...creditAccount.matchReason,
        `Selected debit account: ${debitAccount.account.name} (${debitAccount.account.type}/${debitAccount.account.subtype})`,
        `Selected credit account: ${creditAccount.account.name} (${creditAccount.account.type}/${creditAccount.account.subtype})`
      ]
    };
  }

  validateMapping(mapping: TransactionMapping): boolean {
    const debitContext: AccountSelectionContext = {
      transactionType: 'debit',
      amount: mapping.amount,
      description: mapping.description,
      confidenceScores: new Map(),
      metadata: mapping.metadata || {}
    };

    const creditContext: AccountSelectionContext = {
      ...debitContext,
      transactionType: 'credit'
    };

    // Validate debit account
    const debitRules = this.accountValidationRules.get(mapping.debitAccount.type) || [];
    const isValidDebit = debitRules.every(rule => rule(mapping.debitAccount, debitContext));

    // Validate credit account
    const creditRules = this.accountValidationRules.get(mapping.creditAccount.type) || [];
    const isValidCredit = creditRules.every(rule => rule(mapping.creditAccount, creditContext));

    // Additional validation for the transaction as a whole
    const isValidTransaction = this.validateTransactionPair(mapping);

    return isValidDebit && isValidCredit && isValidTransaction;
  }

  private validateTransactionPair(mapping: TransactionMapping): boolean {
    // Validate that the transaction follows accounting principles
    const isValidPair = this.isValidAccountPair(mapping.debitAccount, mapping.creditAccount);
    const isBalanced = mapping.amount > 0; // Ensure positive amount
    const hasValidTypes = this.hasValidAccountTypes(mapping);

    return isValidPair && isBalanced && hasValidTypes;
  }

  private isValidAccountPair(debitAccount: Account, creditAccount: Account): boolean {
    // Prevent transactions between certain account type combinations
    const invalidCombinations = [
      // Add invalid account type combinations
      [AccountType.Asset, AccountType.Liability],
      [AccountType.Income, AccountType.Expense]
    ];

    return !invalidCombinations.some(([type1, type2]) =>
      (debitAccount.type === type1 && creditAccount.type === type2) ||
      (debitAccount.type === type2 && creditAccount.type === type1)
    );
  }

  private hasValidAccountTypes(mapping: TransactionMapping): boolean {
    // Ensure the account types make sense for the transaction
    const { debitAccount, creditAccount } = mapping;
    
    // Common valid combinations
    const validCombinations = [
      // Asset-related
      [AccountType.Asset, AccountType.Asset], // Asset transfer
      [AccountType.Asset, AccountType.Income], // Revenue/Sale
      [AccountType.Asset, AccountType.Liability], // Loan/Payment
      
      // Expense-related
      [AccountType.Expense, AccountType.Asset], // Purchase/Payment
      [AccountType.Expense, AccountType.Liability], // Credit Purchase
      
      // Liability-related
      [AccountType.Liability, AccountType.Asset], // Loan Receipt
      [AccountType.Liability, AccountType.Liability], // Debt Transfer
      
      // Income-related
      [AccountType.Income, AccountType.Asset], // Revenue Receipt
      [AccountType.Income, AccountType.Liability] // Credit Sale
    ];

    return validCombinations.some(([type1, type2]) =>
      (debitAccount.type === type1 && creditAccount.type === type2) ||
      (debitAccount.type === type2 && creditAccount.type === type1)
    );
  }

  async suggestMapping(transaction: Transaction): Promise<TransactionMapping> {
    const mapping = this.mapTransaction(
      transaction.description,
      transaction.amount,
      transaction.date,
      transaction.customerName
    );

    if (!this.validateMapping(mapping)) {
      throw new Error('Invalid account mapping based on validation rules');
    }

    return mapping;
  }

  updateHistoricalMapping(transaction: Transaction, mapping: TransactionMapping) {
    const key = this.getHistoricalKey(transaction.description);
    
    // Update debit account history
    this.updateAccountHistory(key, mapping.debitAccount);
    
    // Update credit account history
    this.updateAccountHistory(key, mapping.creditAccount);

    // Update amount ranges
    this.updateAmountRange(mapping.debitAccount, transaction.amount);
    this.updateAmountRange(mapping.creditAccount, transaction.amount);
  }

  private updateAccountHistory(key: string, account: Account) {
    if (!this.historicalMappings.has(key)) {
      this.historicalMappings.set(key, []);
    }

    const history = this.historicalMappings.get(key)!;
    const existingEntry = history.find(h => h.account.id === account.id);

    if (existingEntry) {
      existingEntry.frequency += 1;
    } else {
      history.push({ account, frequency: 1 });
    }

    // Sort by frequency in descending order
    history.sort((a, b) => b.frequency - a.frequency);
  }

  private updateAmountRange(account: Account, amount: number) {
    const accountKey = `${account.type}_${account.code}`;
    const currentRange = this.amountRanges.get(accountKey) || { min: amount, max: amount };

    this.amountRanges.set(accountKey, {
      min: Math.min(currentRange.min, amount),
      max: Math.max(currentRange.max, amount)
    });
  }

  getHistoricalSuggestions(description: string): Account[] {
    const key = this.getHistoricalKey(description);
    const history = this.historicalMappings.get(key) || [];
    return history
      .sort((a, b) => b.frequency - a.frequency)
      .map(h => h.account)
      .slice(0, 5); // Return top 5 suggestions
  }
}

export const aiTransactionMapper = new AITransactionMapper();