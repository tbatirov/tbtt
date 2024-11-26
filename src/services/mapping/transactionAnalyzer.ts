import { AccountType, AccountSubtype } from "../../stores/standardStore";

export interface TransactionContext {
  description: string;
  amount: number;
  date?: Date;
  customerName?: string;
  metadata?: TransactionMetadata;
}

export interface TransactionMetadata {
  normalizedDescription: string;
  keywords: string[];
  indicators: {
    isRecurring: boolean;
    isCorrection: boolean;
    isRefund: boolean;
    isCapitalExpense: boolean;
  };
  confidence: {
    keywordMatch: number;
    amountMatch: number;
    contextMatch: number;
    total: number;
  };
}

interface AccountSuggestion {
  accountType: AccountType;
  accountSubtype: AccountSubtype;
  confidence: number;
  isDebit: boolean;
  reasoning: string[];
}

interface TransactionRule {
  condition: (context: TransactionContext) => boolean;
  adjustment: number; // Confidence adjustment
  reason: string;
}

interface TransactionCategory {
  name: string;
  priority: number;
  keywords: string[];
  variations: string[];
  debit: {
    type: AccountType;
    subtype: AccountSubtype;
  };
  credit: {
    type: AccountType;
    subtype: AccountSubtype;
  };
  rules: TransactionRule[];
  amountThreshold?: number;
  confidenceBoost?: number;
}

export class TransactionAnalyzer {
  private static readonly AMOUNT_THRESHOLDS = {
    CAPITALIZATION: 1000,
    HIGH_VALUE: 5000,
    LOW_VALUE: 100
  };

  // Transaction Categories with proper accounting classifications
  private static TRANSACTION_CATEGORIES: TransactionCategory[] = [
    {
      name: 'Employee Compensation',
      priority: 1,
      keywords: ['salary', 'wage', 'payroll', 'bonus', 'incentive payout', 'commission'],
      variations: ['monthly salary', 'weekly wage', 'performance bonus', 'sales commission'],
      debit: {
        type: 'expense',
        subtype: 'operating-expense'
      },
      credit: {
        type: 'liability',
        subtype: 'current-liability'
      },
      rules: [
        {
          condition: (ctx) => ctx.amount > TransactionAnalyzer.AMOUNT_THRESHOLDS.HIGH_VALUE,
          adjustment: -0.1,
          reason: 'Unusually high amount for employee payment'
        },
        {
          condition: (ctx) => !!ctx.metadata?.indicators.isRecurring,
          adjustment: 0.2,
          reason: 'Recurring employee payment pattern'
        }
      ],
      confidenceBoost: 0.2
    },
    {
      name: 'Fixed Assets',
      priority: 2,
      keywords: ['furniture', 'equipment', 'vehicle', 'machinery', 'computer'],
      variations: ['office furniture', 'IT equipment', 'company vehicle', 'production machinery'],
      debit: {
        type: 'asset',
        subtype: 'non-current-asset'
      },
      credit: {
        type: 'liability',
        subtype: 'current-liability'
      },
      rules: [
        {
          condition: (ctx) => ctx.amount > TransactionAnalyzer.AMOUNT_THRESHOLDS.CAPITALIZATION,
          adjustment: 0.2,
          reason: 'Amount exceeds capitalization threshold'
        },
        {
          condition: (ctx) => ctx.metadata?.indicators.isCapitalExpense === true,
          adjustment: 0.3,
          reason: 'Clear capital expense indicators'
        }
      ],
      amountThreshold: TransactionAnalyzer.AMOUNT_THRESHOLDS.CAPITALIZATION
    },
    {
      name: 'Financial Transactions',
      priority: 3,
      keywords: ['loan', 'interest', 'repayment', 'credit card', 'debt'],
      variations: ['loan payment', 'credit card bill', 'interest payment', 'debt repayment'],
      debit: {
        type: 'liability',
        subtype: 'current-liability'
      },
      credit: {
        type: 'asset',
        subtype: 'current-asset'
      },
      rules: [
        {
          condition: (ctx) => ctx.metadata?.indicators.isRecurring === true,
          adjustment: 0.15,
          reason: 'Regular financial payment pattern'
        }
      ]
    }
  ];

  private normalizeDescription(description: string): string {
    return description.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')        // Normalize spaces
      .trim();
  }

  private extractKeywords(description: string): string[] {
    const normalized = this.normalizeDescription(description);
    // Split into words and filter out common words
    return normalized.split(' ').filter(word => 
      word.length > 2 && !['the', 'and', 'for', 'with'].includes(word)
    );
  }

  private detectTransactionIndicators(context: TransactionContext): TransactionMetadata['indicators'] {
    const normalized = this.normalizeDescription(context.description);
    
    return {
      isRecurring: /monthly|weekly|annual|recurring/i.test(normalized),
      isCorrection: /correction|adjust|reverse/i.test(normalized),
      isRefund: /refund|return|credit/i.test(normalized),
      isCapitalExpense: /purchase|acquire|buy/i.test(normalized) && 
                       context.amount > TransactionAnalyzer.AMOUNT_THRESHOLDS.CAPITALIZATION
    };
  }

  analyzeTransaction(context: TransactionContext): AccountSuggestion[] {
    // Preprocess and enrich transaction data
    const metadata: TransactionMetadata = {
      normalizedDescription: this.normalizeDescription(context.description),
      keywords: this.extractKeywords(context.description),
      indicators: this.detectTransactionIndicators(context),
      confidence: {
        keywordMatch: 0,
        amountMatch: 0,
        contextMatch: 0,
        total: 0
      }
    };

    // Attach metadata to context
    context.metadata = metadata;

    const matchedCategory = this.findBestMatchingCategory(context);
    const suggestions: AccountSuggestion[] = [];

    if (matchedCategory) {
      const confidenceScores = this.calculateConfidenceScores(context, matchedCategory);
      metadata.confidence = confidenceScores;

      const debitMapping = this.shouldCapitalize(context.amount, matchedCategory)
        ? { type: 'asset' as AccountType, subtype: 'non-current-asset' as AccountSubtype }
        : matchedCategory.debit;

      suggestions.push(
        {
          accountType: debitMapping.type,
          accountSubtype: debitMapping.subtype,
          confidence: confidenceScores.total,
          isDebit: true,
          reasoning: this.generateReasoningForSuggestion(context, matchedCategory, true)
        },
        {
          accountType: matchedCategory.credit.type,
          accountSubtype: matchedCategory.credit.subtype,
          confidence: confidenceScores.total,
          isDebit: false,
          reasoning: this.generateReasoningForSuggestion(context, matchedCategory, false)
        }
      );
    } else {
      // Default mapping with detailed reasoning
      suggestions.push(
        {
          accountType: 'expense',
          accountSubtype: 'operating-expense',
          confidence: 0.3,
          isDebit: true,
          reasoning: ['No specific category match found', 'Using default expense classification']
        },
        {
          accountType: 'liability',
          accountSubtype: 'current-liability',
          confidence: 0.3,
          isDebit: false,
          reasoning: ['Default liability account for unmatched transaction']
        }
      );
    }

    return suggestions;
  }

  private findBestMatchingCategory(context: TransactionContext): TransactionCategory | null {
    let bestMatch: TransactionCategory | null = null;
    let highestMatchScore = 0;

    for (const category of TransactionAnalyzer.TRANSACTION_CATEGORIES) {
      const matchScore = this.calculateCategoryMatchScore(context, category);
      if (matchScore > highestMatchScore) {
        highestMatchScore = matchScore;
        bestMatch = category;
      }
    }

    return bestMatch;
  }

  private calculateCategoryMatchScore(context: TransactionContext, category: TransactionCategory): number {
    let score = 0;
    const description = context.description.toLowerCase();

    // Check keyword matches
    for (const keyword of category.keywords) {
      if (description.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // Adjust score based on amount thresholds
    if (category.amountThreshold) {
      if (Math.abs(context.amount) >= category.amountThreshold) {
        score += 0.5;
      }
    }

    return score;
  }

  private calculateConfidenceScores(context: TransactionContext, category: TransactionCategory): TransactionMetadata['confidence'] {
    const keywordMatch = this.calculateKeywordMatchConfidence(context.metadata!.keywords, category.keywords);
    const amountMatch = this.calculateAmountMatchConfidence(context.amount, category.amountThreshold);
    const contextMatch = this.calculateContextMatchConfidence(context.metadata!.indicators, category.rules);

    const total = Math.min(0.95, keywordMatch + amountMatch + contextMatch + (category.confidenceBoost || 0));

    return { keywordMatch, amountMatch, contextMatch, total };
  }

  private calculateKeywordMatchConfidence(keywords: string[], categoryKeywords: string[]): number {
    const matchCount = keywords.filter(keyword => 
      categoryKeywords.includes(keyword)
    ).length;

    return Math.min(0.2, matchCount * 0.05);  // Up to 0.2 boost based on keyword matches
  }

  private calculateAmountMatchConfidence(amount: number, threshold?: number): number {
    if (!threshold) {
      return 0;
    }

    const amountRatio = Math.abs(amount) / threshold;
    if (amountRatio >= 1) {
      return 0.1;  // Boost confidence for amounts above threshold
    }
    return 0;
  }

  private calculateContextMatchConfidence(indicators: TransactionMetadata['indicators'], rules: TransactionRule[]): number {
    let score = 0;

    for (const rule of rules) {
      if (rule.condition(indicators)) {
        score += rule.adjustment;
      }
    }

    return score;
  }

  private shouldCapitalize(amount: number, category: TransactionCategory): boolean {
    return category.amountThreshold !== undefined && Math.abs(amount) >= category.amountThreshold;
  }

  private generateReasoningForSuggestion(context: TransactionContext, category: TransactionCategory, isDebit: boolean): string[] {
    const reasons: string[] = [];

    if (isDebit) {
      reasons.push(`Debit account type: ${category.debit.type} - ${category.debit.subtype}`);
    } else {
      reasons.push(`Credit account type: ${category.credit.type} - ${category.credit.subtype}`);
    }

    if (context.metadata!.indicators.isRecurring) {
      reasons.push('Recurring transaction pattern detected');
    }

    if (context.metadata!.indicators.isCapitalExpense) {
      reasons.push('Capital expense indicators detected');
    }

    return reasons;
  }
}

export const transactionAnalyzer = new TransactionAnalyzer();
