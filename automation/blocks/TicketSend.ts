import { BlockType, BlockParameter, ConnectionPoint, DataField } from '../types';

export const ticketSend: BlockType = {
  id: 'ticket_send',
  name: 'Ticket Send',
  
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
          { name: 'key', type: 'string', description: 'Send key' }
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
        id: 'output-result',
        type: 'output',
        x: 52,
        y: 72,
        label: 'Result',
        dataFields: [
          { name: 'transaction_id', type: 'string', description: 'Transaction ID' },
          { name: 'key', type: 'string', description: 'Send key' },
          { name: 'amount', type: 'number', description: 'Sent amount' },
          { name: 'status', type: 'string', description: 'Send status' }
        ]
      }
    ];
  },

  getWidth(): number { return 155; },
  getHeight(): number { return 80; }
}; 