'use client';

import { useEffect, useRef } from 'react';
import * as Blockly from 'blockly/core';
import { ProgramBlock } from '@/lib/jr/types';
import { JR_BLOCK_TYPES } from '@/lib/jr/mission-definitions';

const BLOCK_TYPES: Record<ProgramBlock['type'], string> = {
  START: 'jr_start', MOVE_FORWARD: 'jr_move_forward', TURN_LEFT: 'jr_turn_left',
  TURN_RIGHT: 'jr_turn_right', COLLECT_STAR: 'jr_collect_star', FINISH: 'jr_finish',
};

function registerBlocks() {
  const definitions = [
    { type: 'START' as const, label: '▶  Start', color: '#16813e' },
    ...JR_BLOCK_TYPES.map((block) => ({ ...block, label: `${block.icon}  ${block.label}` })),
    { type: 'FINISH' as const, label: '⚑  Finish', color: '#b83e50' },
  ];
  definitions.forEach(({ type, label, color }) => {
    if (Blockly.Blocks[BLOCK_TYPES[type]]) return;
    Blockly.Blocks[BLOCK_TYPES[type]] = {
      init(this: Blockly.Block) {
        this.appendDummyInput().appendField(label);
        if (type !== 'START') this.setPreviousStatement(true);
        if (type !== 'FINISH') this.setNextStatement(true);
        this.setColour(color);
        this.setTooltip(label);
        this.contextMenu = false;
      },
    };
  });
}

type Props = {
  program: ProgramBlock[];
  activeBlockIndex: number | null;
  disabled: boolean;
  maxBlocks: number;
  onAddBlock: (type: ProgramBlock['type'], index?: number) => void;
};

/** Native Blockly dragging, with accepted blocks locked to one deliberate edit per turn. */
export function BlocklyWorkspace(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const { program, activeBlockIndex } = props;

  useEffect(() => {
    if (!hostRef.current) return;
    registerBlocks();
    const workspace = Blockly.inject(hostRef.current, {
      renderer: 'zelos',
      toolbox: {
        kind: 'flyoutToolbox',
        contents: JR_BLOCK_TYPES.map(({ type }) => ({ kind: 'block', type: BLOCK_TYPES[type] })),
      },
      horizontalLayout: true,
      toolboxPosition: 'end',
      scrollbars: true,
      trashcan: false,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { controls: false, wheel: false, startScale: 1, maxScale: 1, minScale: 1 },
      sounds: false,
      grid: { spacing: 24, length: 2, colour: '#bdd7e5', snap: false },
    });
    workspaceRef.current = workspace;

    function renderProgram() {
      Blockly.Events.disable();
      try {
        workspace.clear();
        const blocks = propsRef.current.program;
        // Use Blockly serialization to restore the accepted connected workspace.
        let next: Record<string, unknown> | undefined;
        for (let index = blocks.length - 1; index >= 0; index -= 1) {
          next = { type: BLOCK_TYPES[blocks[index].type], id: blocks[index].id, ...(next ? { next: { block: next } } : {}) };
        }
        Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [{ ...next, x: 32, y: 24 }] } }, workspace);
        workspace.getAllBlocks(false).forEach((block) => {
          block.setMovable(false);
          block.setDeletable(false);
          block.setEditable(false);
        });
      } finally {
        Blockly.Events.enable();
      }
    }

    function acceptDrop(event: Blockly.Events.Abstract) {
      if (event.type !== Blockly.Events.BLOCK_DRAG || (event as Blockly.Events.BlockDrag).isStart) return;
      const { program: accepted, disabled, onAddBlock, maxBlocks } = propsRef.current;
      const added = workspace.getAllBlocks(false).filter((block) => !accepted.some((item) => item.id === block.id));
      if (!added.length) return;
      if (!disabled && added.length === 1 && accepted.length < maxBlocks) {
        const type = JR_BLOCK_TYPES.find((item) => BLOCK_TYPES[item.type] === added[0].type)?.type;
        let index = accepted.length - 1;
        let cursor = workspace.getBlockById(accepted[0].id)?.getNextBlock();
        let position = 1;
        while (cursor && position <= maxBlocks) {
          if (cursor.id === added[0].id) { index = position; break; }
          cursor = cursor.getNextBlock();
          position += 1;
        }
        if (type) onAddBlock(type, index);
      }
      // Remove the provisional drag, including disconnected or unsupported blocks.
      renderProgram();
    }
    workspace.addChangeListener(acceptDrop);
    renderProgram();
    const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
    observer.observe(hostRef.current);
    return () => {
      observer.disconnect();
      workspace.removeChangeListener(acceptDrop);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    Blockly.Events.disable();
    try {
      workspace.clear();
      let previous: Blockly.BlockSvg | null = null;
      program.forEach((item, index) => {
        const block = workspace.newBlock(BLOCK_TYPES[item.type], item.id);
        block.initSvg();
        block.render();
        if (!index) block.moveBy(32, 24);
        if (previous?.nextConnection && block.previousConnection) previous.nextConnection.connect(block.previousConnection);
        block.setMovable(false);
        block.setDeletable(false);
        block.setEditable(false);
        previous = block;
      });
      workspace.getFlyout()?.getWorkspace().getAllBlocks(false).forEach((block) => {
        block.setEnabled(program.length < propsRef.current.maxBlocks);
      });
      Blockly.svgResize(workspace);
    } finally {
      Blockly.Events.enable();
    }
  }, [program]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const id = activeBlockIndex === null ? null : program[activeBlockIndex]?.id ?? null;
    workspace.highlightBlock(id);
    if (id) workspace.centerOnBlock(id);
  }, [activeBlockIndex, program]);

  return (
    <div className="jr-workspace-frame">
      <div ref={hostRef} className="jr-blockly-workspace" aria-label="Drag one block from the Blockly tray into your plan" />
      {props.disabled && <div className="jr-workspace-cover">Watch Pip follow your plan!</div>}
    </div>
  );
}
