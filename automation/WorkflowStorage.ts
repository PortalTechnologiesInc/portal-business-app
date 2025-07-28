import { Block, Connection, BlockConfig } from './types';

export interface WorkflowData {
  id: string;
  name: string;
  blocks: Block[];
  connections: Connection[];
  blockConfigs: BlockConfig[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export class WorkflowSerializer {
  /**
   * Serialize workflow data to JSON string
   */
  static serialize(workflow: WorkflowData): string {
    try {
      return JSON.stringify(workflow, null, 2);
    } catch (error) {
      console.error('Error serializing workflow:', error);
      throw new Error('Failed to serialize workflow');
    }
  }

  /**
   * Deserialize JSON string to workflow data
   */
  static deserialize(jsonData: string): WorkflowData {
    try {
      const workflow = JSON.parse(jsonData) as WorkflowData;
      
      // Validate the workflow structure
      if (!workflow.id || !workflow.name || !Array.isArray(workflow.blocks)) {
        throw new Error('Invalid workflow data structure');
      }
      
      return workflow;
    } catch (error) {
      console.error('Error deserializing workflow:', error);
      throw new Error('Failed to deserialize workflow');
    }
  }

  /**
   * Validate workflow data structure
   */
  static validate(workflow: WorkflowData): boolean {
    return !!(
      workflow.id &&
      workflow.name &&
      Array.isArray(workflow.blocks) &&
      Array.isArray(workflow.connections) &&
      Array.isArray(workflow.blockConfigs) &&
      workflow.createdAt &&
      workflow.updatedAt &&
      typeof workflow.isActive === 'boolean'
    );
  }

  /**
   * Create a new workflow data structure
   */
  static createWorkflow(id: string, name: string): WorkflowData {
    const now = new Date().toISOString().split('T')[0];
    return {
      id,
      name,
      blocks: [],
      connections: [],
      blockConfigs: [],
      createdAt: now,
      updatedAt: now,
      isActive: false
    };
  }
} 