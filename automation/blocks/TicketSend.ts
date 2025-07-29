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

  async run(inputs: Promise<any>[], config?: BlockConfig): Promise<Promise<any>[]> {
    try {
      // Await all input promises
      const resolvedInputs = await Promise.all(inputs);
      
      // Extract key and amount from inputs
      const key = resolvedInputs[0]?.key;
      const amount = resolvedInputs[0]?.amount;
      
      // Get configured values from config
      const configuredMintUrl = config?.parameters?.['mint-url'] as string;
      const configuredUnit = config?.parameters?.unit as string;
      
      // Use configured values if available, otherwise use inputs
      const finalKey = configuredMintUrl || key;
      const finalAmount = configuredUnit || amount;
      
      // Simulate ticket send processing
      console.log(`Processing ticket send for mint URL ${finalKey}, unit: ${finalAmount}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success (80% success rate)
      const isSuccess = Math.random() > 0.2;
      
      if (isSuccess) {
        const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return [
          Promise.resolve({
            transaction_id: transactionId,
            key: finalKey,
            amount: finalAmount,
            status: 'completed'
          })
        ];
      } else {
        return [
          Promise.resolve({
            error: 'Ticket send failed',
            key: finalKey,
            amount: finalAmount,
            status: 'failed'
          })
        ];
      }
    } catch (error) {
      return [
        Promise.resolve({
          error: error instanceof Error ? error.message : 'Unknown error',
          key: 'unknown',
          amount: 0,
          status: 'failed'
        })
      ];
    }
  }
}; 