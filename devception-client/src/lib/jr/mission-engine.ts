import { JrBlockType, JrMission, JrRobot, MissionRun, ProgramBlock, SimulationStep } from './types';
import { validateProgram } from './program-validator';

const DIRECTIONS: JrRobot['direction'][] = ['up', 'right', 'down', 'left'];
const DELTAS: Record<JrRobot['direction'], { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

function copyRobot(robot: JrRobot): JrRobot {
  return { ...robot };
}

function sameCell(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y;
}

function isWall(mission: JrMission, cell: { x: number; y: number }): boolean {
  return mission.grid.walls.some((wall) => sameCell(wall, cell));
}

function isInside(mission: JrMission, cell: { x: number; y: number }): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < mission.grid.width && cell.y < mission.grid.height;
}

function turned(direction: JrRobot['direction'], amount: 1 | -1): JrRobot['direction'] {
  const index = DIRECTIONS.indexOf(direction);
  return DIRECTIONS[(index + amount + DIRECTIONS.length) % DIRECTIONS.length];
}

function step(
  blockIndex: number,
  robot: JrRobot,
  collectedStars: string[],
  status: SimulationStep['status'],
  message: string,
  hint?: string,
): SimulationStep {
  return {
    blockIndex,
    robot: copyRobot(robot),
    collectedStars: [...collectedStars],
    status,
    message,
    hint,
  };
}

export function executeMission(mission: JrMission, program: ProgramBlock[]): MissionRun {
  const robot = copyRobot(mission.start);
  const collectedStars: string[] = [];
  const steps: SimulationStep[] = [];
  let failedBlockIndex: number | null = null;
  const issue = validateProgram(mission, program);
  if (issue) {
    return {
      status: 'failed',
      steps: [step(issue.blockIndex, robot, [], 'failed', issue.message, issue.hint)],
      failedBlockIndex: issue.blockIndex,
      message: issue.message,
      hint: issue.hint,
    };
  }

  for (let index = 0; index < program.length; index += 1) {
    const block = program[index];

    if (block.type === 'START') {
      steps.push(step(index, robot, collectedStars, 'running', 'Pip is ready!'));
      continue;
    }

    if (block.type === 'MOVE_FORWARD') {
      const delta = DELTAS[robot.direction];
      const nextCell = { x: robot.x + delta.x, y: robot.y + delta.y };
      if (!isInside(mission, nextCell) || isWall(mission, nextCell)) {
        failedBlockIndex = index;
        steps.push(
          step(
            index,
            robot,
            collectedStars,
            'failed',
            'Bonk! Pip found a wall.',
            'Try turning before moving into that square.',
          ),
        );
        break;
      }
      robot.x = nextCell.x;
      robot.y = nextCell.y;
      steps.push(step(index, robot, collectedStars, 'running', 'Pip moved one square.'));
      continue;
    }

    if (block.type === 'TURN_LEFT' || block.type === 'TURN_RIGHT') {
      robot.direction = turned(robot.direction, block.type === 'TURN_LEFT' ? -1 : 1);
      steps.push(step(index, robot, collectedStars, 'running', `Pip turned ${block.type === 'TURN_LEFT' ? 'left' : 'right'}.`));
      continue;
    }

    if (block.type === 'COLLECT_STAR') {
      const star = mission.stars.find((candidate) => sameCell(candidate, robot) && !collectedStars.includes(candidate.id));
      if (!star) {
        failedBlockIndex = index;
        steps.push(
          step(
            index,
            robot,
            collectedStars,
            'failed',
            'No star here yet.',
            'Move Pip onto the star before using Collect Star.',
          ),
        );
        break;
      }
      collectedStars.push(star.id);
      steps.push(step(index, robot, collectedStars, 'running', 'Shiny! Pip collected the star.'));
      continue;
    }

    if (block.type === 'FINISH') {
      if (collectedStars.length !== mission.stars.length) {
        failedBlockIndex = index;
        steps.push(
          step(
            index,
            robot,
            collectedStars,
            'failed',
            'Pip still needs the star.',
            'Find the star, collect it, and then come back home.',
          ),
        );
        break;
      }
      if (!sameCell(robot, mission.goal)) {
        failedBlockIndex = index;
        steps.push(
          step(
            index,
            robot,
            collectedStars,
            'failed',
            'Pip is not at home yet.',
            'Keep moving until Pip reaches the glowing home square.',
          ),
        );
        break;
      }
      steps.push(step(index, robot, collectedStars, 'success', 'Rescue complete! Pip is home with the star.'));
      return {
        status: 'success',
        steps,
        failedBlockIndex: null,
        message: 'You did it! Pip is safe at home.',
        hint: 'Great teamwork. You gave Pip a plan and checked each step.',
      };
    }
  }

  if (failedBlockIndex !== null) {
    const lastStep = steps[steps.length - 1];
    return {
      status: 'failed',
      steps,
      failedBlockIndex,
      message: lastStep.message,
      hint: lastStep.hint ?? 'Try one small change and run the plan again.',
    };
  }

  const lastBlockIndex = Math.max(0, program.length - 1);
  steps.push(
    step(
      lastBlockIndex,
      robot,
      collectedStars,
      'failed',
      'The plan needs a Finish block.',
      'A program needs a clear ending so Pip knows the mission is done.',
    ),
  );
  return {
    status: 'failed',
    steps,
    failedBlockIndex: lastBlockIndex,
    message: 'The plan needs a Finish block.',
    hint: 'Add Finish after Pip reaches home.',
  };
}

export function blockLabel(type: JrBlockType): string {
  switch (type) {
    case 'START':
      return 'Start';
    case 'MOVE_FORWARD':
      return 'Move Forward';
    case 'TURN_LEFT':
      return 'Turn Left';
    case 'TURN_RIGHT':
      return 'Turn Right';
    case 'COLLECT_STAR':
      return 'Collect Star';
    case 'FINISH':
      return 'Finish';
  }
}
