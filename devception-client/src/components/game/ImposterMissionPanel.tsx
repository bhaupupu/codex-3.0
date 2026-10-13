'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppSocket } from '@/lib/socket';
import { ImpostorMission } from '@/types/socket';

interface Props {
  socket: AppSocket | null;
  roomCode: string;
  isAlive: boolean;
}

export function ImposterMissionPanel({ socket, roomCode, isAlive }: Props) {
  const [mission, setMission] = useState<ImpostorMission | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Red Herring State
  const [showRedHerringModal, setShowRedHerringModal] = useState<boolean>(false);
  const [redHerringData, setRedHerringData] = useState<{
    hypothesis: string;
    argumentPoints: string[];
  } | null>(null);
  const [loadingRedHerring, setLoadingRedHerring] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    // Request initial mission on mount
    socket.emit('imposter:get-mission', { roomCode });

    const handleMission = (data: { mission: ImpostorMission }) => {
      setMission(data.mission);
    };

    const handleCooldown = (data: { remainingMs: number; startCooldown?: boolean; cooldownMs?: number }) => {
      const ms = data.startCooldown && data.cooldownMs ? data.cooldownMs : data.remainingMs;
      setCooldownRemaining(Math.round(ms / 1000));
    };

    const handleRedHerring = (data: { hypothesis: string; argumentPoints: string[] }) => {
      setRedHerringData(data);
      setLoadingRedHerring(false);
      setShowRedHerringModal(true);
    };

    socket.on('imposter:mission', handleMission);
    socket.on('imposter:cooldown-update', handleCooldown);
    socket.on('imposter:red-herring', handleRedHerring);

    return () => {
      socket.off('imposter:mission', handleMission);
      socket.off('imposter:cooldown-update', handleCooldown);
      socket.off('imposter:red-herring', handleRedHerring);
    };
  }, [socket, roomCode]);

  // Countdown timer for ability cooldowns
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const handleLogicBomb = () => {
    if (cooldownRemaining > 0 || !isAlive) return;
    socket?.emit('imposter:inject-bug', { roomCode });
  };

  const handleVariableShadow = () => {
    if (cooldownRemaining > 0 || !isAlive) return;
    socket?.emit('imposter:variable-shadow', { roomCode });
  };

  const handleGenerateRedHerring = () => {
    if (!isAlive) return;
    setLoadingRedHerring(true);
    socket?.emit('imposter:get-red-herring', { roomCode });
  };

  const handleDeployRedHerring = (text: string) => {
    socket?.emit('imposter:deploy-red-herring', { roomCode, text });
    setShowRedHerringModal(false);
  };

  if (!isAlive) return null;

  return (
    <div className="border border-red-500/50 bg-[#160d14]/90 backdrop-blur rounded-lg p-3 text-xs font-mono shadow-lg shadow-red-950/40">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-red-500/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-red-400 tracking-wider text-[11px] uppercase">
            🕵️ Impostor Co-Pilot
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cooldownRemaining > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700/60 font-bold">
              ⏳ COOLDOWN: {cooldownRemaining}s
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
              ⚡ READY
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white text-[10px]"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 space-y-2.5 overflow-hidden"
          >
            {/* Active Mission */}
            {mission ? (
              <div className="p-2.5 rounded bg-black/40 border border-red-500/20 text-gray-300">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 font-bold text-[11px]">{mission.title}</span>
                  <span className="text-[9px] uppercase px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    TARGET MISSION
                  </span>
                </div>
                <p className="text-[10px] text-gray-300 mb-1.5 leading-relaxed">
                  {mission.strategicObjective}
                </p>
                <div className="text-[9px] text-gray-400 bg-red-950/30 p-1.5 rounded border border-red-900/40">
                  <span className="text-red-400 font-bold">Success Condition: </span>
                  {mission.successCondition}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 italic py-1">
                Fetching strategic mission from Astra...
              </div>
            )}

            {/* Sabotage Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleLogicBomb}
                disabled={cooldownRemaining > 0}
                className="pixel-btn py-1.5 px-2 flex flex-col items-center justify-center text-center rounded transition"
                style={{
                  fontSize: '9px',
                  background: cooldownRemaining > 0 ? '#1f2937' : 'linear-gradient(135deg, #b91c1c, #dc2626)',
                  color: '#fff',
                  opacity: cooldownRemaining > 0 ? 0.6 : 1,
                }}
                title="Inject subtle edge-case comparison mutation into shared code"
              >
                <span className="font-bold">💣 LOGIC BOMB</span>
                <span className="text-[8px] opacity-80 mt-0.5">Flip operator</span>
              </button>

              <button
                onClick={handleVariableShadow}
                disabled={cooldownRemaining > 0}
                className="pixel-btn py-1.5 px-2 flex flex-col items-center justify-center text-center rounded transition"
                style={{
                  fontSize: '9px',
                  background: cooldownRemaining > 0 ? '#1f2937' : 'linear-gradient(135deg, #7c2d12, #ea580c)',
                  color: '#fff',
                  opacity: cooldownRemaining > 0 ? 0.6 : 1,
                }}
                title="Re-bind a variable to null/None to disrupt downstream execution"
              >
                <span className="font-bold">🌫️ SHADOW</span>
                <span className="text-[8px] opacity-80 mt-0.5">Nullify variable</span>
              </button>

              <button
                onClick={handleGenerateRedHerring}
                disabled={loadingRedHerring}
                className="pixel-btn py-1.5 px-2 flex flex-col items-center justify-center text-center rounded transition"
                style={{
                  fontSize: '9px',
                  background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
                  color: '#fff',
                }}
                title="Generate a plausible false debugging hypothesis to cite in meetings"
              >
                <span className="font-bold">🐟 RED HERRING</span>
                <span className="text-[8px] opacity-80 mt-0.5">
                  {loadingRedHerring ? 'Drafting...' : 'Craft theory'}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Red Herring Preview Modal */}
      <AnimatePresence>
        {showRedHerringModal && redHerringData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="game-panel max-w-md w-full p-4 border-2 border-purple-500 text-xs font-mono"
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-purple-500/30">
                <span className="font-bold text-purple-300 uppercase flex items-center gap-1.5">
                  <span>🐟</span> Astra Red Herring Generator
                </span>
                <button
                  onClick={() => setShowRedHerringModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-2.5 rounded bg-purple-950/30 border border-purple-500/20 text-gray-200 mb-3">
                <strong className="text-purple-300 block mb-1">Plausible Misdirection:</strong>
                <p className="text-[11px] leading-relaxed">{redHerringData.hypothesis}</p>
              </div>

              <div className="space-y-1.5 mb-4">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  Suggested Arguments:
                </span>
                {redHerringData.argumentPoints.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-black/40 border border-white/5 text-[10px] text-gray-300 flex items-start gap-1.5"
                  >
                    <span className="text-purple-400">▸</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDeployRedHerring(redHerringData.hypothesis)}
                  className="pixel-btn py-1.5 px-3 flex-1 text-center font-bold"
                  style={{ fontSize: '10px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff' }}
                >
                  💬 DEPLOY TO TEAM CHAT
                </button>
                <button
                  onClick={() => setShowRedHerringModal(false)}
                  className="pixel-btn py-1.5 px-3"
                  style={{ fontSize: '10px', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                >
                  KEEP PRIVATE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
