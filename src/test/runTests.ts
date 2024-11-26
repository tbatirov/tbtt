import { testTransactionMapping } from '../utils/transactionTestUtil';

async function runTests() {
    console.log('Starting transaction mapping tests...');
    try {
        await testTransactionMapping();
        console.log('Tests completed successfully');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTests();
