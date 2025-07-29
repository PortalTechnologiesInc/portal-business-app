import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';

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
  getHeight(): number { return 80; },

  async run(inputs: Promise<any>[], config?: BlockConfig, nostrService?: any, ecashService?: any): Promise<any> {
    console.log(inputs);

    const key = inputs[0]['input-key'];
    const amount = inputs[0]['input-amount'];

    const mintUrl = config?.parameters['mint-url'];
    const unit = config?.parameters['unit'];

    const wallet = await ecashService.addWallet(mintUrl, unit);
    const token = await wallet.mintToken(BigInt(amount));
    await nostrService.sendCashuDirect(key, [], {
      token: token
    }).catch(error => {
      console.log('Error:', error);
    });

    return new Promise((resolve) => {
      resolve({
        'output-success': {
          'num_tickets': amount,
        },
      })
    })
  }
}; 