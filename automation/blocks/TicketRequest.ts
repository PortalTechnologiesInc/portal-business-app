import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export const ticketRequest: BlockType = {
  id: 'ticket_request',
  name: 'Ticket Request',
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'mint-url',
        name: 'Mint URL',
        type: 'text',
        required: true,
        placeholder: 'Enter mint url'
      },
      {
        id: 'unit',
        name: 'Unit',
        type: 'text',
        required: true,
        placeholder: 'Enter unit'
      }
    ];
  },

  getInputs(): ConnectionPoint[] {
    return [
      {
        id: 'input-key',
        type: 'input',
        x: 30,
        y: -8,
        label: 'Key',
        dataFields: [
          { name: 'key', type: 'string', description: 'Request key' }
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
          { name: 'ticket_id', type: 'string', description: 'Ticket request ID' },
          { name: 'key', type: 'string', description: 'Request key' },
          { name: 'amount', type: 'number', description: 'Requested amount' },
          { name: 'status', type: 'string', description: 'Ticket status' }
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
          { name: 'key', type: 'string', description: 'Request key' },
          { name: 'amount', type: 'number', description: 'Requested amount' }
        ]
      }
    ];
  },

  getWidth(): number { return 155; },
  getHeight(): number { return 80; }
}; 