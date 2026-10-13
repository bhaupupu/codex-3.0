'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Play, CheckCircle2, AlertTriangle, Terminal, Cpu } from 'lucide-react';

export interface ExecutionVerdict {
  id: string;
  description: string;
  passed: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
}

export interface ExecutionResultData {
  sandbox?: string;
  compileError?: string;
  verdicts: ExecutionVerdict[];
  allPassed: boolean;
  timestamp?: number;
}

interface Props {
  isRunning: boolean;
  onRunTests: () => void;
  onSubmitCode: () => void;
  results: ExecutionResultData | null;
  submitMessage?: string | null;
  disabled?: boolean;
}

export function ExecutionConsole({
  isRunning,
  onRunTests,
  onSubmitCode,
  results,
  submitMessage,
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const passedCount = results?.verdicts.filter((v) => v.passed).length ?? 0;
  const totalCount = results?.verdicts.length ?? 0;

  return (
    <div
      className="rounded-lg flex flex-col overflow-hidden transition-all duration-200"
      style={{
        background: '#161922',
        border: '1px solid var(--border)',
        boxShadow: 'var(--pixel-shadow-sm)',
      }}
    >
      {/* Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#12141c] border-b border-[#232733] gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onRunTests}
            disabled={disabled || isRunning}
            className="pixel-btn pixel-btn-blue py-1.5 px-3 flex items-center gap-1.5"
            style={{ fontSize: '9px', opacity: disabled || isRunning ? 0.6 : 1 }}
          >
            <Play size={12} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? 'EXECUTING...' : 'RUN TESTS'}
          </button>

          <button
            onClick={onSubmitCode}
            disabled={disabled || isRunning}
            className={`pixel-btn py-1.5 px-3 flex items-center gap-1.5 ${
              results?.allPassed ? 'pixel-btn-green' : 'pixel-btn-light'
            }`}
            style={{ fontSize: '9px', opacity: disabled ? 0.6 : 1 }}
          >
            <CheckCircle2 size={12} />
            SUBMIT
          </button>

          {results && (
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
              style={{
                background: results.allPassed ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)',
                color: results.allPassed ? '#22c55e' : '#ef4444',
                border: `1px solid ${results.allPassed ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)'}`,
              }}
            >
              {passedCount}/{totalCount} Passed
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {results?.sandbox && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-gray-400">
              <Cpu size={12} className="text-amber-400" />
              {results.sandbox === 'judge0' ? 'Judge0 Sandbox' : 'Dev Sandbox'}
            </span>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-gray-200 transition-colors p-1"
            title={isOpen ? 'Collapse console' : 'Expand console'}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Console Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 text-xs font-mono max-h-48 overflow-y-auto space-y-2">
              {submitMessage && (
                <div className="p-2 rounded bg-amber-950/40 border border-amber-600/50 text-amber-300 text-[11px]">
                  {submitMessage}
                </div>
              )}

              {/* Compilation / Syntax Errors */}
              {results?.compileError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-600/50 text-red-300">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-red-400">
                    <AlertTriangle size={13} />
                    COMPILATION / SYNTAX ERROR
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] font-mono">{results.compileError}</pre>
                </div>
              )}

              {/* Test Cases Checklist */}
              {results && results.verdicts.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Terminal size={11} />
                    Test Suite Verdicts
                  </div>
                  {results.verdicts.map((v) => (
                    <div
                      key={v.id}
                      className="px-2.5 py-1.5 rounded flex items-start justify-between gap-2"
                      style={{
                        background: v.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${v.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.3)'}`,
                      }}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="font-bold mt-0.5" style={{ color: v.passed ? '#22c55e' : '#ef4444' }}>
                          {v.passed ? '✓' : '✗'}
                        </span>
                        <div>
                          <p className="text-gray-200 text-[11px] font-medium">{v.description}</p>
                          {v.error && <p className="text-red-400 text-[10px] mt-0.5">{v.error}</p>}
                          {v.output && <p className="text-gray-400 text-[10px] mt-0.5">stdout: {v.output}</p>}
                        </div>
                      </div>
                      {v.executionTime !== undefined && (
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {(v.executionTime * 1000).toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-2 text-[11px]">
                  {isRunning
                    ? 'Executing code in Judge0 sandbox...'
                    : 'Click "RUN TESTS" to test your shared code against challenge test cases.'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
