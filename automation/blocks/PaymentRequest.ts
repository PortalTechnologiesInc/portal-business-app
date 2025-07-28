import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export const paymentRequest: BlockType = {
  id: 'payment_request',
  name: 'Payment Request',
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'user_key',
        name: 'User Key',
        type: 'text',
        required: true,
        placeholder: 'Enter user public key'
      },
      {
        id: 'amount',
        name: 'Amount',
        type: 'number',
        required: true,
        placeholder: 'Enter amount in sats'
      }
    ];
  },

  getInputs(): ConnectionPoint[] {
    return [
      {
        id: 'input-user_key',
        type: 'input',
        x: 30,
        y: -8,
        label: 'User Key',
        dataFields: [
          { name: 'user_key', type: 'string', description: 'User public key' }
        ]
      },
      {
        id: 'input-amount',
        type: 'input',
        x: 74,
        y: -8,
        label: 'Amount',
        dataFields: [
          { name: 'amount', type: 'number', description: 'Amount in sats' }
        ]
      }
    ];
  },

  getOutputs(): ConnectionPoint[] {
    return [
      {
        id: 'output-success',
        type: 'output',
        x: 30,
        y: 72,
        label: 'Success',
        dataFields: [
          { name: 'payment_id', type: 'string', description: 'Payment request ID' },
          { name: 'amount', type: 'number', description: 'Requested amount' },
          { name: 'user_key', type: 'string', description: 'User public key' },
          { name: 'status', type: 'string', description: 'Payment status' }
        ]
      },
      {
        id: 'output-failure',
        type: 'output',
        x: 74,
        y: 72,
        label: 'Failure',
        dataFields: [
          { name: 'error', type: 'string', description: 'Error message' },
          { name: 'user_key', type: 'string', description: 'User public key' },
          { name: 'amount', type: 'number', description: 'Requested amount' }
        ]
      }
    ];
  },

  getWidth(): number { return 155; },
  getHeight(): number { return 80; }
}; 