import { JrBlockType, JrMission } from './types';

export const JR_BLOCK_TYPES: Array<{
  type: Exclude<JrBlockType, 'START' | 'FINISH'>;
  label: string;
  icon: string;
  color: string;
  helper: string;
}> = [
  {
    type: 'MOVE_FORWARD',
    label: 'Move Forward',
    icon: '↑',
    color: '#3b82f6',
    helper: 'Go one square',
  },
  {
    type: 'TURN_LEFT',
    label: 'Turn Left',
    icon: '↺',
    color: '#8b5cf6',
    helper: 'Face left',
  },
  {
    type: 'TURN_RIGHT',
    label: 'Turn Right',
    icon: '↻',
    color: '#ec4899',
    helper: 'Face right',
  },
  {
    type: 'COLLECT_STAR',
    label: 'Collect Star',
    icon: '★',
    color: '#f59e0b',
    helper: 'Pick up a star',
  },
];

export const ROBOT_RESCUE: JrMission = {
  id: 'robot-rescue',
  title: 'Robot Rescue',
  description: 'Help Pip collect the star and find the glowing home.',
  grid: {
    width: 5,
    height: 5,
    walls: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
    ],
  },
  start: { x: 0, y: 4, direction: 'right' },
  stars: [{ id: 'star-1', x: 2, y: 4 }],
  goal: { x: 4, y: 2 },
  allowedBlocks: [
    'START',
    'MOVE_FORWARD',
    'TURN_LEFT',
    'TURN_RIGHT',
    'COLLECT_STAR',
    'FINISH',
  ],
  maxBlocks: 12,
};

export const JR_MISSIONS = [ROBOT_RESCUE];
