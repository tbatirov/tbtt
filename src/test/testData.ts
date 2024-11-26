import { Transaction } from '../types/ledger';

export const testTransactions: Transaction[] = [
  {
    id: 'T1001',
    date: new Date('2024-04-02T04:28:55'),
    description: 'Professional Service Fee',
    amount: 57.65,
    customerName: 'Customer 1',
    accountNumber: 'AC5200',
    type: 'deposit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 57.65, accountId: '', status: 'pending' },
      { type: 'credit', amount: 57.65, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Deposit', importDate: new Date() }
  },
  {
    id: 'T1002',
    date: new Date('2024-04-06T12:57:26'),
    description: 'Small Business Supplies',
    amount: 840.19,
    customerName: 'Customer 2',
    accountNumber: 'AC5272',
    type: 'credit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 840.19, accountId: '', status: 'pending' },
      { type: 'credit', amount: 840.19, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Credit', importDate: new Date() }
  },
  {
    id: 'T1003',
    date: new Date('2024-10-01T19:01:58'),
    description: 'Cheque Deposit',
    amount: 175.76,
    customerName: 'Customer 3',
    accountNumber: 'AC7528',
    type: 'deposit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 175.76, accountId: '', status: 'pending' },
      { type: 'credit', amount: 175.76, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Deposit', importDate: new Date() }
  },
  {
    id: 'T1004',
    date: new Date('2024-05-27T17:09:51'),
    description: 'Grocery Store Purchase',
    amount: 313.45,
    customerName: 'Customer 4',
    accountNumber: 'AC8917',
    type: 'deposit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 313.45, accountId: '', status: 'pending' },
      { type: 'credit', amount: 313.45, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Deposit', importDate: new Date() }
  },
  {
    id: 'T1005',
    date: new Date('2024-10-07T04:40:02'),
    description: 'Mobile Recharge',
    amount: 802.19,
    customerName: 'Customer 5',
    accountNumber: 'AC5429',
    type: 'credit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 802.19, accountId: '', status: 'pending' },
      { type: 'credit', amount: 802.19, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Credit', importDate: new Date() }
  },
  {
    id: 'T1006',
    date: new Date('2024-03-30T23:54:38'),
    description: 'Restaurant Payment',
    amount: 687.58,
    customerName: 'Customer 6',
    accountNumber: 'AC2836',
    type: 'debit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 687.58, accountId: '', status: 'pending' },
      { type: 'credit', amount: 687.58, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Debit', importDate: new Date() }
  },
  {
    id: 'T1007',
    date: new Date('2024-07-27T02:56:34'),
    description: 'Movie Ticket Booking',
    amount: 343.97,
    customerName: 'Customer 7',
    accountNumber: 'AC2042',
    type: 'credit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 343.97, accountId: '', status: 'pending' },
      { type: 'credit', amount: 343.97, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Credit', importDate: new Date() }
  },
  {
    id: 'T1008',
    date: new Date('2024-04-14T01:48:01'),
    description: 'Cash Deposit',
    amount: 719.84,
    customerName: 'Customer 8',
    accountNumber: 'AC3645',
    type: 'debit',
    status: 'pending',
    entries: [
      { type: 'debit', amount: 719.84, accountId: '', status: 'pending' },
      { type: 'credit', amount: 719.84, accountId: '', status: 'pending' }
    ],
    metadata: { originalType: 'Debit', importDate: new Date() }
  }
];
