import { vi } from 'vitest';
import { StandardStore } from '../../../stores/standardStore';

// Mock standard store implementation
export class MockStandardStore implements StandardStore {
  getActiveStandard() {
    return {
      id: 'test-standard',
      name: 'Test Standard',
      description: 'Test accounting standard',
      signConventions: {
        asset: 'debit',
        liability: 'credit',
        equity: 'credit',
        revenue: 'credit',
        expense: 'debit'
      }
    };
  }

  getStandards() {
    return [this.getActiveStandard()];
  }

  setActiveStandard() {}
  addStandard() {}
  updateStandard() {}
  deleteStandard() {}
}

// Export a function that returns the mock store
export const useStandardStore = () => new MockStandardStore();

// Mock the module
vi.mock('../../../stores/standardStore', () => ({
  useStandardStore
}));
