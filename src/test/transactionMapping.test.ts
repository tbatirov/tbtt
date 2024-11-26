import { describe, beforeEach, it, expect } from 'vitest';
import { initializeTestStores } from './testSetup';
import { testTransactions } from './testData';
import { suggestAccountMapping } from '../utils/transactionTestUtil';

describe('Transaction Mapping Tests', () => {
    let stores: ReturnType<typeof initializeTestStores>;

    beforeEach(() => {
        stores = initializeTestStores();
    });

    it('should map transactions correctly', () => {
        const { standardStore, accounts } = stores;
        const activeStandard = standardStore.getActiveStandard();
        
        expect(activeStandard).toBeDefined();
        expect(accounts.length).toBeGreaterThan(0);
        
        // Test mapping for each transaction
        testTransactions.forEach(transaction => {
            const mapping = suggestAccountMapping(transaction, accounts);
            
            expect(mapping).toBeDefined();
            expect(mapping?.debit).toBeDefined();
            expect(mapping?.credit).toBeDefined();
            expect(mapping?.debit.id).toBeDefined();
            expect(mapping?.credit.id).toBeDefined();
        });
    });
});
