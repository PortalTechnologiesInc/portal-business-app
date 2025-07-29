import { Currency } from 'portal-business-app-lib';
import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';
import uuid from 'react-native-uuid';

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
  getHeight(): number { return 80; },

  async run(inputs: Promise<any>[], config?: BlockConfig, nostrService?: any): Promise<any> {
    try {
      // Await all input promises
      const resolvedInputs = await Promise.all(inputs);
      console.log(inputs);
      
      // Get the input data
      const inputData = resolvedInputs[0];

      const userKey = inputData['input-user_key'];
      const amount = inputData['input-amount'];

      console.log('userKey', userKey, 'amount', amount);

      const invoice = await nostrService.makeInvoice(BigInt(amount), 'Ticket sale');
      console.log('Invoice created:', invoice);

      const response = await nostrService.requestSinglePayment(userKey, [], {
        amount: BigInt(amount),
        currency: new Currency.Millisats(),
        description: 'Ticket sale',
        authToken: undefined,
        invoice: invoice.invoice,
        currentExchangeRate: undefined,
        expiresAt: BigInt((new Date().getTime() + 1000 * 60 * 60 * 24)),
        subscriptionId: undefined,
        requestId: uuid.v4(),
      }).catch(error => {
        console.log('Error:', error.inner);
      });

      return Promise.resolve({
        'output-success': {
          'payment_id': invoice.paymentHash,
          'amount': amount,
          'user_key': userKey,
          'status': response.status.tag
        }
      });
    } catch (error) {
      return Promise.resolve({
        'output-failure': {
          'error': error instanceof Error ? error.inner : 'Unknown error',
        }
      });
    }
  }
}; 