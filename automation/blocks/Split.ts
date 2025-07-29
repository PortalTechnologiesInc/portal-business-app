import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';

export const split: BlockType = {
  id: 'split',
  name: 'Split',
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'split_ratio',
        name: 'Split Ratio',
        type: 'number',
        required: false,
        placeholder: '0.5 (default: 50/50)',
        defaultValue: 0.5
      }
    ];
  },

  getInputs(): ConnectionPoint[] {
    return [
      {
        id: 'input-value',
        type: 'input',
        x: 52,
        y: -8,
        label: 'Value',
        dataFields: [
          { name: 'value', type: 'object', description: 'Passthrough data' }
        ]
      }
    ];
  },

  getOutputs(): ConnectionPoint[] {
    return [
      {
        id: 'output-left',
        type: 'output',
        x: 30,
        y: 72,
        label: 'L',
        dataFields: [
          { name: 'passthru', type: 'object', description: 'Passthrough data' },
        ]
      },
      {
        id: 'output-right',
        type: 'output',
        x: 74,
        y: 72,
        label: 'R',
        dataFields: [
          { name: 'passthru', type: 'object', description: 'Passthrough data' },
        ]
      }
    ];
  },

  getWidth(): number { return 120; },
  getHeight(): number { return 80; },

  async run(inputs: Promise<any>[], config?: BlockConfig): Promise<any> {
    // Await all input promises
    const resolvedInputs = await Promise.all(inputs);
    
    console.log(resolvedInputs);
    // Get the input value
    const inputValue = resolvedInputs[0]['input-value'];
    
    return {
      'output-left': inputValue,
      'output-right': inputValue
    };
  }
}; 