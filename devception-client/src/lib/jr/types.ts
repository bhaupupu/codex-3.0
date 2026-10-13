export type Direction = 'up' | 'right' | 'down' | 'left';

export type JrBlockType =
  | 'START'
  | 'MOVE_FORWARD'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'COLLECT_STAR'
  | 'FINISH';

export type JrCell = {
  x: number;
  y: number;
};

export type JrRobot = JrCell & {
  direction: Direction;
};

export type JrStar = JrCell & {
  id: string;
};

export type JrMission = {
  id: string;
  title: string;
  description: string;
  grid: {
    width: number;
    height: number;
    walls: JrCell[];
  };
  start: JrRobot;
  stars: JrStar[];
  goal: JrCell;
  allowedBlocks: JrBlockType[];
  maxBlocks: number;
};

export type ProgramBlock = {
  id: string;
  type: JrBlockType;
};

export type SimulationStatus = 'running' | 'success' | 'failed';

export type SimulationStep = {
  blockIndex: number;
  robot: JrRobot;
  collectedStars: string[];
  status: SimulationStatus;
  message: string;
  hint?: string;
};

export type MissionRun = {
  status: Exclude<SimulationStatus, 'running'>;
  steps: SimulationStep[];
  failedBlockIndex: number | null;
  message: string;
  hint: string;
};

export type JrPlayer = {
  id: string;
  name: string;
  color: string;
  isYou?: boolean;
};
