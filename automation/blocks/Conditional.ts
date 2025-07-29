import { BlockType, BlockParameter, ConnectionPoint, DataField, BlockConfig } from '../types';

export const conditional: BlockType = {
  id: 'conditional',
  name: 'If',
  
  getSettings(): BlockParameter[] {
    return [
      {
        id: 'field', // Changed from 'condition'
        name: 'Field to Match', // Changed from 'Condition'
        type: 'text',
        required: true,
        placeholder: 'e.g., body.status, headers.content-type' // Changed
      },
      {
        id: 'operator',
        name: 'Operator',
        type: 'select',
        required: true,
        defaultValue: 'equals',
        options: ['equals', 'not equals', 'greater than', 'less than', 'contains', 'not contains', 'exists', 'not exists']
      },
      {
        id: 'value',
        name: 'Value to Compare', // Changed from 'Value'
        type: 'text',
        required: false,
        placeholder: 'e.g., 200, "success", true' // Changed
      }
    ];
  },

  getInputs(): ConnectionPoint[] {
    return [
      {
        id: 'input-data',
        type: 'input',
        x: 40,
        y: -8,
        label: 'Data',
        dataFields: [
          { name: 'data', type: 'object', description: 'Input data to evaluate' }
        ]
      }
    ];
  },

  getOutputs(): ConnectionPoint[] {
    return [
      {
        id: 'output-true',
        type: 'output',
        x: 30,
        y: 72, // Changed from 52
        label: 'True',
        dataFields: [
          { name: 'data', type: 'object', description: 'Data when condition is true' },
          { name: 'condition_met', type: 'boolean', description: 'Whether condition was met' }
        ]
      },
      {
        id: 'output-false',
        type: 'output',
        x: 74,
        y: 72, // Changed from 52
        label: 'False',
        dataFields: [
          { name: 'data', type: 'object', description: 'Data when condition is false' },
          { name: 'condition_met', type: 'boolean', description: 'Whether condition was met' }
        ]
      }
    ];
  },

  getWidth(): number { return 120; },
  getHeight(): number { return 80; }, // Changed from 60

  async run(inputs: Promise<any>[], config?: BlockConfig): Promise<any> {
    try {
      // Await all input promises
      const resolvedInputs = await Promise.all(inputs);
      
      // Get the input data
      const inputData = resolvedInputs[0]['input-data'];
      
      // Get configured values from config
      const fieldToMatch = config?.parameters?.field as string;
      const operator = config?.parameters?.operator as string || 'equals';
      const valueToCompare = config?.parameters?.value as string;
      
      // For now, simulate a simple condition evaluation
      // In a real implementation, this would use the block's settings
      console.log(`Evaluating condition: ${fieldToMatch} ${operator} ${valueToCompare} for data:`, inputData);

      // Helper function to check if field exists
      const fieldExists = (obj: any, path: string): boolean => {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current === null || current === undefined || typeof current !== 'object') {
            return false;
          }
          if (!(key in current)) {
            return false;
          }
          current = current[key];
        }
        return true;
      };

      // Helper function to get field value
      const getFieldValue = (obj: any, path: string): any => {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current === null || current === undefined) {
            return undefined;
          }
          current = current[key];
        }
        return current;
      };

      // Get the actual field value using dot notation
      const actualFieldValue = getFieldValue(inputData, fieldToMatch);

      let conditionMet = false;

      switch (operator) {
        case 'equals':
          conditionMet = actualFieldValue === valueToCompare;
          break;
        
        case 'not equals':
          conditionMet = actualFieldValue !== valueToCompare;
          break;
        
        case 'greater than':
          const numValue = parseFloat(valueToCompare);
          const numFieldValue = parseFloat(actualFieldValue);
          conditionMet = !isNaN(numFieldValue) && !isNaN(numValue) && numFieldValue > numValue;
          break;
        
        case 'less than':
          const numValue2 = parseFloat(valueToCompare);
          const numFieldValue2 = parseFloat(actualFieldValue);
          conditionMet = !isNaN(numFieldValue2) && !isNaN(numValue2) && numFieldValue2 < numValue2;
          break;
        
        case 'contains':
          if (typeof actualFieldValue === 'string' && typeof valueToCompare === 'string') {
            conditionMet = actualFieldValue.includes(valueToCompare);
          } else if (Array.isArray(actualFieldValue)) {
            conditionMet = actualFieldValue.includes(valueToCompare);
          } else {
            conditionMet = false;
          }
          break;
        
        case 'not contains':
          if (typeof actualFieldValue === 'string' && typeof valueToCompare === 'string') {
            conditionMet = !actualFieldValue.includes(valueToCompare);
          } else if (Array.isArray(actualFieldValue)) {
            conditionMet = !actualFieldValue.includes(valueToCompare);
          } else {
            conditionMet = true;
          }
          break;
        
        case 'exists':
          conditionMet = fieldExists(inputData, fieldToMatch) && actualFieldValue !== undefined && actualFieldValue !== null;
          break;
        
        case 'not exists':
          conditionMet = !fieldExists(inputData, fieldToMatch) || actualFieldValue === undefined || actualFieldValue === null;
          break;
        
        default:
          throw new Error(`Unknown operator: ${operator}`);
      }

      if (conditionMet) {
        return {
          'output-true': {
            data: inputData,
            condition_met: true
          }
        };
      } else {
        return {
          'output-false': {
            data: inputData,
            condition_met: false
          }
        };
      }
    } catch (error) {
      console.log('Error in conditional block:', error);
      throw error;
    }
  }
}; 