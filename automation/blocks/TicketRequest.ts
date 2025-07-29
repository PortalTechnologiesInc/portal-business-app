import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';

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
          { name: 'num_tickets', type: 'number', description: 'Number of tickets requested' }
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
        ]
      }
    ];
  },

  getWidth(): number { return 155; },
  getHeight(): number { return 80; },

  async run(inputs: Promise<any>[], config?: BlockConfig): Promise<any> {
    // TODO: request the ticket
    console.log(inputs);
    const key = inputs[0]['input-key'];
    const amount = inputs[0]['input-amount'];

    return new Promise((resolve) => {
      setTimeout(() => {
        if (Math.random() < 0.5) {
          resolve({
            'output-success': {
              'num_tickets': amount,
            },
          })
        } else {
          resolve({
            'output-failure': {
              'error': 'Failed to request ticket',
            }
          })
        }
      }, 3000)
    })
 }
}; 