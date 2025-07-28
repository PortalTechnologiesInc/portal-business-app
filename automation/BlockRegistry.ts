import { BlockType } from './types';
import { keyHandshakeTrigger } from './blocks/KeyHandshakeTrigger';
import { paymentRequest } from './blocks/PaymentRequest';
import { ticketRequest } from './blocks/TicketRequest';
import { ticketSend } from './blocks/TicketSend';
import { constant } from './blocks/Constant';
import { split } from './blocks/Split';
import { conditional } from './blocks/Conditional';

class BlockRegistry {
  private blocks: Map<string, BlockType> = new Map();

  constructor() {
    this.registerBlock(keyHandshakeTrigger);
    this.registerBlock(paymentRequest);
    this.registerBlock(ticketRequest);
    this.registerBlock(ticketSend);
    this.registerBlock(constant);
    this.registerBlock(split);
    this.registerBlock(conditional);
  }

  registerBlock(block: BlockType) {
    this.blocks.set(block.id, block);
  }

  getBlock(id: string): BlockType | undefined {
    return this.blocks.get(id);
  }

  getAllBlocks(): BlockType[] {
    return Array.from(this.blocks.values());
  }

  getBlockSettings(type: string) {
    const block = this.getBlock(type);
    return block?.getSettings() || [];
  }


}

export const blockRegistry = new BlockRegistry(); 