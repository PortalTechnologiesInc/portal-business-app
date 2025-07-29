import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';

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

  async run(inputs: Promise<any>[], config?: BlockConfig): Promise<Promise<any>[]> {
    try {
      // Await all input promises
      const resolvedInputs = await Promise.all(inputs);
      
      // Extract user_key and amount from inputs
      const userKey = resolvedInputs[0]?.user_key || resolvedInputs[0];
      const amount = resolvedInputs[1]?.amount || resolvedInputs[1];
      
      // Get configured values from config
      const configuredUserKey = config?.parameters?.user_key as string;
      const configuredAmount = config?.parameters?.amount as number;
      
      // Use configured values if available, otherwise use inputs
      const finalUserKey = configuredUserKey || userKey;
      const finalAmount = configuredAmount || amount;
      
      // Simulate payment request processing
      console.log(`Processing payment request for user ${finalUserKey}, amount: ${finalAmount}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success (90% success rate)
      const isSuccess = Math.random() > 0.1;
      
      if (isSuccess) {
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return [
          Promise.resolve({
            payment_id: paymentId,
            amount: finalAmount,
            user_key: finalUserKey,
            status: 'pending'
          }),
          Promise.resolve(null) // No failure
        ];
      } else {
        return [
          Promise.resolve(null), // No success
          Promise.resolve({
            error: 'Payment request failed',
            user_key: finalUserKey,
            amount: finalAmount
          })
        ];
      }
    } catch (error) {
      return [
        Promise.resolve(null), // No success
        Promise.resolve({
          error: error instanceof Error ? error.message : 'Unknown error',
          user_key: 'unknown',
          amount: 0
        })
      ];
    }
  }
}; 