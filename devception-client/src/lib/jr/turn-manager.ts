import { JrMission, ProgramBlock } from './types';
import { validateProgram } from './program-validator';

export type LocalTeam = {
  program: ProgramBlock[];
  version: number;
  turnNumber: number;
  currentPlayerIndex: number;
  playerCount: number;
};

export type LocalAction = {
  playerIndex: number;
  version: number;
  turnNumber: number;
} & (
  | { type: 'ADD'; block: ProgramBlock; index: number }
  | { type: 'REPLACE'; blockId: string; blockType: ProgramBlock['type'] }
  | { type: 'REMOVE'; blockId: string }
  | { type: 'PASS' }
);

/** Single-device authority. A future room server must enforce the same checks. */
export function applyLocalAction(team: LocalTeam, action: LocalAction, mission: JrMission): LocalTeam | null {
  if (action.playerIndex !== team.currentPlayerIndex || action.version !== team.version || action.turnNumber !== team.turnNumber) return null;
  const program = team.program.map((block) => ({ ...block }));
  if (action.type === 'ADD') {
    if (!Number.isInteger(action.index) || action.index < 1 || action.index >= program.length) return null;
    program.splice(action.index, 0, action.block);
  } else if (action.type === 'REMOVE' || action.type === 'REPLACE') {
    const index = program.findIndex((block) => block.id === action.blockId);
    if (index <= 0 || index >= program.length - 1) return null;
    if (action.type === 'REMOVE') program.splice(index, 1);
    else {
      if (program[index].type === action.blockType) return null;
      program[index].type = action.blockType;
    }
  }
  if (validateProgram(mission, program)) return null;
  return {
    ...team,
    program,
    version: team.version + (action.type === 'PASS' ? 0 : 1),
    turnNumber: team.turnNumber + 1,
    currentPlayerIndex: (team.currentPlayerIndex + 1) % team.playerCount,
  };
}
