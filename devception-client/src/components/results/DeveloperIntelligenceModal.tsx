'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSocket } from '@/lib/socket';
import { DeveloperReport, PlayerMatchMetrics } from '@/types/socket';

interface Props {
  socket: AppSocket | null;
  roomCode: string;
}

export function DeveloperIntelligenceModal({ socket, roomCode }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<DeveloperReport | null>(null);
  const [metrics, setMetrics] = useState<PlayerMatchMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleReport = (data: { report: DeveloperReport; metrics: PlayerMatchMetrics }) => {
      setReport(data.report);
      setMetrics(data.metrics);
      setLoading(false);
    };

    socket.on('report:developer-intelligence', handleReport);

    return () => {
      socket.off('report:developer-intelligence', handleReport);
    };
  }, [socket]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!report && socket) {
      setLoading(true);
      socket.emit('report:get-developer-intelligence', { roomCode });
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="pixel-btn py-2.5 px-4 rounded font-bold flex items-center justify-center gap-2 w-full text-center tracking-wide"
        style={{
          background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
          color: '#fff',
          fontSize: '11px',
        }}
      >
        <span>🧠</span>
        <span>VIEW DEVELOPER INTELLIGENCE DOSSIER</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="game-panel max-w-xl w-full p-5 max-h-[85vh] overflow-y-auto text-xs font-mono border-2 border-indigo-500 shadow-2xl shadow-indigo-950/60"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-indigo-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧠</span>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">
                      Astra Developer Intelligence Report
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Personalized technical dossier grounded in verified match telemetry
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-400">
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  Synthesizing match metrics and code telemetry...
                </div>
              ) : report ? (
                <div className="space-y-4">
                  {/* Title & Summary */}
                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-amber-300">
                        {report.profileTitle}
                      </span>
                      {metrics && (
                        <span className="text-[9px] uppercase px-2 py-0.5 rounded font-bold bg-indigo-900/60 text-indigo-200 border border-indigo-700">
                          {metrics.role === 'imposter' ? 'Tactical Role' : 'Engineer Role'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-200 leading-relaxed">
                      {report.summary}
                    </p>
                  </div>

                  {/* Deterministic Metrics Grid */}
                  {metrics && (
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-2">
                        Telemetry & Contribution Scoreboard:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-gray-400 text-[9px] block">TESTS PASSED</span>
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            {metrics.testsPassed}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-gray-400 text-[9px] block">MINI-TASKS</span>
                          <span className="text-sm font-bold text-blue-400 font-mono">
                            {metrics.tasksCompleted}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-gray-400 text-[9px] block">BUGS FIXED</span>
                          <span className="text-sm font-bold text-purple-400 font-mono">
                            {metrics.bugsFixed}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-black/40 border border-white/5">
                          <span className="text-gray-400 text-[9px] block">CODE EDITS</span>
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            {metrics.codeEditsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strengths & Growth Areas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-2">
                        ✨ Demonstrated Strengths:
                      </span>
                      <ul className="space-y-1.5 text-[10px] text-gray-300">
                        {report.technicalStrengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded bg-amber-950/20 border border-amber-500/20">
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-2">
                        🎯 Actionable Growth Areas:
                      </span>
                      <ul className="space-y-1.5 text-[10px] text-gray-300">
                        {report.growthAreas.map((area, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-400">▸</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actionable Advice */}
                  <div className="p-3 rounded bg-purple-950/20 border border-purple-500/20">
                    <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block mb-1">
                      💡 Next Match Recommendation:
                    </span>
                    <p className="text-[11px] text-gray-200 leading-relaxed">
                      {report.actionableAdvice}
                    </p>
                  </div>

                  {/* Collaboration Insight */}
                  <div className="p-2.5 rounded bg-black/40 border border-white/10 text-[10px] text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 text-sm">💬</span>
                    <div>
                      <strong className="text-blue-300 block">Collaboration Assessment:</strong>
                      {report.collaborationInsight}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  Click below to load your personalized developer report.
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="pixel-btn py-1.5 px-4 text-xs font-bold"
                  style={{ background: 'var(--bg-card)', color: '#fff' }}
                >
                  CLOSE DOSSIER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
