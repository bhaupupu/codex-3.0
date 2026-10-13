import { JrMission, ProgramBlock } from './types';

export type ProgramIssue = { blockIndex: number; message: string; hint: string };

/** Validate the small command language, including data restored from storage. */
export function validateProgram(mission: JrMission, input: unknown): ProgramIssue | null {
  if (!Array.isArray(input) || input.length < 2) {
    return { blockIndex: 0, message: 'Every plan needs a beginning and an ending.', hint: 'Use Start first and Finish last.' };
  }
  if (input.length > Math.min(mission.maxBlocks, 100)) {
    return { blockIndex: mission.maxBlocks, message: 'This plan has too many blocks.', hint: `Keep your plan to ${mission.maxBlocks} blocks, including Start and Finish.` };
  }
  const ids = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const block = input[index];
    if (!block || typeof block.id !== 'string' || !block.id || ids.has(block.id) || !mission.allowedBlocks.includes(block.type)) {
      return { blockIndex: index, message: 'That block does not belong in this plan.', hint: 'Choose a block from the block box.' };
    }
    ids.add(block.id);
    if ((block.type === 'START' && index !== 0) || (block.type === 'FINISH' && index !== input.length - 1)) {
      return { blockIndex: index, message: 'Start and Finish need their own places.', hint: 'Start goes first. Finish goes last.' };
    }
  }
  const blocks = input as ProgramBlock[];
  if (blocks[0].type !== 'START' || blocks[blocks.length - 1].type !== 'FINISH') {
    return { blockIndex: blocks.length - 1, message: 'The plan needs Start and Finish.', hint: 'Use Start first and Finish last.' };
  }
  return null;
}
