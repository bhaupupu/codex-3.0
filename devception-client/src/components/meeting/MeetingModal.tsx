'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingStore } from '@/store/meetingStore';
import { useGameStore } from '@/store/gameStore';
import { VotingCard } from './VotingCard';
import { VoteResults } from './VoteResults';
import { ChatPanel } from '@/components/game/ChatPanel';
import { AppSocket } from '@/lib/socket';

interface Props {
  socket: AppSocket | null;
  roomCode: string;
  myUserId: string;
}

export function MeetingModal({ socket, roomCode, myUserId }: Props) {
  const { meeting, setMyVote } = useMeetingStore();
  const { game } = useGameStore();
  const [discussionTime, setDiscussionTime] = useState(0);
  const [votingTime, setVotingTime] = useState(0);

  useEffect(() => {
    if (!meeting) return;
    let t: ReturnType<typeof setInterval>;

    if (meeting.phase === 'discussion') {
      const secs = Math.round(meeting.discussionMs / 1000);
      setDiscussionTime(secs);
      t = setInterval(() => setDiscussionTime((s) => Math.max(0, s - 1)), 1000);
    } else if (meeting.phase === 'voting') {
      const secs = Math.round(meeting.votingMs / 1000);
      setVotingTime(secs);
      t = setInterval(() => setVotingTime((s) => Math.max(0, s - 1)), 1000);
    }

    return () => clearInterval(t);
  }, [meeting?.phase, meeting?.discussionMs, meeting?.votingMs]);

  const [activeTab, setActiveTab] = useState<'voting' | 'evidence'>('voting');

  const me = game?.players.find((p) => p.userId === myUserId);
  const canAct = !!me?.isAlive;

  const handleVote = (targetId: string) => {
    if (!meeting || meeting.myVote || !canAct) return;
    setMyVote(targetId);
    socket?.emit('meeting:vote', { roomCode, meetingId: meeting.meetingId, targetId });
  };

  const handleCiteEvidence = (evidenceId: string) => {
    socket?.emit('chat:present-evidence', { roomCode, evidenceId });
  };

  const alivePlayers = game?.players.filter((p) => p.isAlive) ?? [];
  const evidenceList = meeting?.evidence ?? [];
  const regressionCount = evidenceList.filter((e) => e.causedTestRegression).length;

  return (
    <AnimatePresence>
      {meeting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            className="game-panel max-w-2xl w-full flex flex-col"
            style={{ border: '2px solid #ef4444', height: '90vh' }}
          >
            {/* Header */}
            <div className="p-4 md:p-6 border-b text-center flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <p className="text-3xl mb-1">🚨</p>
              <h2 className="text-xl md:text-2xl font-black" style={{ color: '#ef4444' }}>EMERGENCY MEETING</h2>
              <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Called by <strong>{meeting.calledByName}</strong>
              </p>

              {meeting.phase === 'discussion' && (
                <div className="mt-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Discussion Phase</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: discussionTime < 15 ? '#ef4444' : 'var(--text-primary)' }}>
                    {discussionTime}s
                  </p>
                </div>
              )}

              {meeting.phase === 'voting' && (
                <div className="mt-2">
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Voting Phase</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: votingTime < 10 ? '#ef4444' : 'var(--accent-blue)' }}>
                    {votingTime}s
                  </p>
                </div>
              )}

              {/* Tab Selector */}
              {meeting.phase !== 'results' && (
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    onClick={() => setActiveTab('voting')}
                    className="pixel-btn py-1 px-3"
                    style={{
                      fontSize: '9px',
                      background: activeTab === 'voting' ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: activeTab === 'voting' ? '#fff' : 'var(--text-primary)',
                      border: '2px solid var(--border)',
                    }}
                  >
                    🗳️ VOTING ({alivePlayers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('evidence')}
                    className="pixel-btn py-1 px-3 relative"
                    style={{
                      fontSize: '9px',
                      background: activeTab === 'evidence' ? '#ef4444' : 'var(--bg-card)',
                      color: activeTab === 'evidence' ? '#fff' : 'var(--text-primary)',
                      border: '2px solid var(--border)',
                    }}
                  >
                    🔍 CODE EVIDENCE ({evidenceList.length})
                    {regressionCount > 0 && (
                      <span className="ml-1 px-1 rounded text-[8px] bg-red-900 text-white font-bold">
                        {regressionCount} ⚠️
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Content — voting or evidence */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1 min-h-0">
              {!canAct && meeting.phase !== 'results' && (
                <div
                  className="mb-4 text-center text-xs font-semibold py-2 rounded"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                >
                  Spectating — you were eliminated. You cannot vote or chat.
                </div>
              )}

              {meeting.phase === 'results' ? (
                <VoteResults
                  ejected={meeting.ejected}
                  tally={meeting.tally ?? {}}
                  wasTie={meeting.wasTie}
                  players={alivePlayers}
                />
              ) : activeTab === 'voting' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {alivePlayers.map((p) => (
                    <VotingCard
                      key={p.userId}
                      player={p}
                      isMe={p.userId === myUserId}
                      hasVoted={meeting.votedPlayers.has(p.userId)}
                      myVote={meeting.myVote}
                      onVote={canAct && meeting.phase === 'voting' ? handleVote : undefined}
                    />
                  ))}
                  {meeting.phase === 'voting' && (
                    <VotingCard
                      player={null}
                      isMe={false}
                      hasVoted={false}
                      myVote={meeting.myVote}
                      onVote={canAct ? handleVote : undefined}
                      isSkip
                    />
                  )}
                </div>
              ) : (
                /* Evidence Ledger Panel */
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2b303c]">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Audit Trail & Code Regressions
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Showing recent changes
                    </span>
                  </div>

                  {evidenceList.length === 0 ? (
                    <p className="text-center py-8 text-xs text-gray-500 font-mono">
                      No code edits or regressions logged yet this match.
                    </p>
                  ) : (
                    evidenceList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                        style={{
                          background: item.causedTestRegression ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${item.causedTestRegression ? '#ef4444' : 'var(--border)'}`,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                              style={{
                                background: item.causedTestRegression ? '#ef4444' : item.actionType === 'sabotage' ? '#f59e0b' : '#3b82f6',
                                color: '#fff',
                              }}>
                              {item.causedTestRegression ? '⚠️ REGRESSION' : item.actionType.toUpperCase()}
                            </span>
                            <span className="text-gray-400 text-[10px]">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-gray-300 font-bold">
                              by {item.displayName}
                            </span>
                          </div>
                          <p className="text-gray-200 truncate">{item.snippet}</p>
                          {item.affectedDescription && (
                            <p className="text-red-400 text-[11px] mt-0.5">
                              Failed: {item.affectedDescription}
                            </p>
                          )}
                        </div>

                        {canAct && (
                          <button
                            onClick={() => handleCiteEvidence(item.id)}
                            className="pixel-btn py-1 px-2 flex-shrink-0"
                            style={{ fontSize: '8px', background: '#3b82f6', color: '#fff' }}
                            title="Cite this evidence in the discussion chat"
                          >
                            💬 CITE IN CHAT
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Chat panel — available throughout the meeting */}
            {meeting.phase !== 'results' && (
              <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--border)', height: '200px' }}>
                <ChatPanel socket={socket} roomCode={roomCode} disabled={!canAct} />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
