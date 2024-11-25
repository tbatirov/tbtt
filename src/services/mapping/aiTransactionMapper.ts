import { Transaction } from '../../types/ledger';
import { Account } from '../../types/accounting';
import { configService } from './config';

interface AIMapping {
  debitAccount: Account;
  creditAccount: Account;
  confidence: number;
  reasoning: string;
}

export class AITransactionMapper {
  private accounts: Account[] = [];
  private initialized = false;
  private requestQueue: Promise<any>[] = [];
  private maxConcurrentRequests = 2;
  private requestDelay = 1000;

  initialize(accounts: Account[]) {
    if (!accounts.length) {
      throw new Error('No accounts provided for mapping');
    }

    if (!configService.isEnabled()) {
      throw new Error('AI service not configured - missing API key');
    }

    this.accounts = accounts;
    this.initialized = true;
  }

  async mapTransaction(transaction: Transaction): Promise<AIMapping> {
    if (!this.initialized) {
      throw new Error('Transaction mapper not initialized');
    }

    while (this.requestQueue.length >= this.maxConcurrentRequests) {
      await Promise.race(this.requestQueue);
    }

    const requestPromise = this.processTransaction(transaction);
    this.requestQueue.push(requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.requestQueue = this.requestQueue.filter(p => p !== requestPromise);
    }
  }

  private async processTransaction(transaction: Transaction): Promise<AIMapping> {
    try {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));

      const prompt = this.buildPrompt(transaction);
      const config = configService.getConfig();
      
      const response = await fetch('/api/analyze-transaction', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const mapping = this.parseAIResponse(data.result);
      return this.validateMapping(mapping);
    } catch (error) {
      throw new Error('Transaction mapping failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private buildPrompt(transaction: Transaction): string {
    const accountsList = this.accounts
      .map(a => `${a.code} - ${a.name} (${a.type})`)
      .join('\n');

    return `Analyze this transaction and determine the appropriate accounts for double-entry bookkeeping:

Transaction Details:
- Description: ${transaction.description}
- Amount: ${transaction.entries[0]?.amount}
- Date: ${transaction.date}
- Customer: ${transaction.customerName || 'N/A'}

Available Accounts:
${accountsList}

Based on accounting principles and the transaction details, determine:
1. Which account should be debited
2. Which account should be credited
3. Explain your reasoning

Respond with a JSON object in this exact format:
{
  "debitAccountCode": "string",
  "creditAccountCode": "string",
  "confidence": number (0-1),
  "reasoning": "string"
}`;
  }

  private parseAIResponse(response: string): AIMapping {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!this.validateResponseFormat(parsed)) {
        throw new Error('Missing required fields in response');
      }

      const debitAccount = this.accounts.find(a => a.code === parsed.debitAccountCode);
      const creditAccount = this.accounts.find(a => a.code === parsed.creditAccountCode);

      if (!debitAccount || !creditAccount) {
        throw new Error('Invalid account codes in response');
      }

      return {
        debitAccount,
        creditAccount,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        reasoning: parsed.reasoning
      };
    } catch (error) {
      throw new Error('Failed to parse AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  private validateResponseFormat(parsed: any): boolean {
    return (
      typeof parsed.debitAccountCode === 'string' &&
      typeof parsed.creditAccountCode === 'string' &&
      typeof parsed.confidence === 'number' &&
      typeof parsed.reasoning === 'string' &&
      parsed.debitAccountCode.length > 0 &&
      parsed.creditAccountCode.length > 0 &&
      parsed.reasoning.length > 0
    );
  }

  private validateMapping(mapping: AIMapping): AIMapping {
    if (mapping.debitAccount.id === mapping.creditAccount.id) {
      throw new Error('Debit and credit accounts cannot be the same');
    }

    const validDebitTypes = new Set(['asset', 'expense']);
    const validCreditTypes = new Set(['liability', 'equity', 'revenue']);

    const isValidDebit = validDebitTypes.has(mapping.debitAccount.type);
    const isValidCredit = validCreditTypes.has(mapping.creditAccount.type);

    if (!isValidDebit || !isValidCredit) {
      throw new Error('Invalid account type combination');
    }

    return mapping;
  }
}

export const aiTransactionMapper = new AITransactionMapper();