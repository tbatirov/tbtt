import { Transaction } from '../../types/ledger';
import { Account } from '../../types/accounting';
import { aiTransactionMapper } from './aiTransactionMapper';
import { configService } from './config';

export interface MappingResult {
  debitAccount?: Account;
  creditAccount?: Account;
  confidence: number;
  reasoning?: string;
  error?: string;
}

export class TransactionMapper {
  private accounts: Account[] = [];
  private initialized = false;

  initialize(accounts: Account[]) {
    if (!accounts.length) {
      throw new Error('No accounts provided for mapping');
    }

    this.accounts = accounts;

    if (!configService.isEnabled()) {
      throw new Error('AI service is not configured. Please set up your API key in Settings.');
    }

    try {
      aiTransactionMapper.initialize(accounts, configService.getConfig().apiKey);
      this.initialized = true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to initialize mapper';
      throw new Error(msg);
    }
  }

  async mapTransaction(transaction: Transaction): Promise<MappingResult> {
    if (!this.initialized) {
      throw new Error('Transaction mapper not initialized');
    }

    if (!configService.isEnabled()) {
      throw new Error('AI service is not configured');
    }

    try {
      const aiMatch = await aiTransactionMapper.mapTransaction(transaction);
      if (aiMatch) {
        return {
          debitAccount: aiMatch.debitAccount,
          creditAccount: aiMatch.creditAccount,
          confidence: aiMatch.confidence,
          reasoning: aiMatch.reasoning
        };
      }

      return {
        confidence: 0,
        error: 'No suitable mapping found'
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        confidence: 0,
        error: `Mapping failed: ${msg}`
      };
    }
  }
}

export const transactionMapper = new TransactionMapper();