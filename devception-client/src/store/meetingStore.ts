import { DetectiveAnalysis } from '@/types/socket';

export interface EvidenceItem {
  id: string;
  timestamp: number;
  userId: string;
  displayName: string;
  line: number;
  snippet: string;
  actionType: string;
  affectedDescription?: string;
  causedTestRegression?: boolean;
  astraAnalysis?: DetectiveAnalysis;
}

export interface MeetingState {
  meetingId: string;
  calledBy: string;
  calledByName: string;
  phase: 'discussion' | 'voting' | 'results';
  votedPlayers: Set<string>;
  myVote: string | null;
  tally: Record<string, number> | null;
  ejected: {
    userId: string;
    displayName: string;
    role: string;
    wasImposter: boolean;
  } | null;
  wasTie: boolean;
  discussionMs: number;
  votingMs: number;
  evidence: EvidenceItem[];
  analyzingEvidenceId: string | null;
}

interface MeetingStore {
  meeting: MeetingState | null;
  startMeeting: (data: {
    meetingId: string;
    calledBy: string;
    calledByName: string;
    discussionMs: number;
    votingMs: number;
    evidence?: EvidenceItem[];
  }) => void;
  setPhase: (phase: MeetingState['phase']) => void;
  markVoted: (userId: string) => void;
  setMyVote: (targetId: string) => void;
  setEvidence: (evidence: EvidenceItem[]) => void;
  setEvidenceAnalysis: (evidenceId: string, analysis: DetectiveAnalysis) => void;
  setAnalyzingEvidenceId: (id: string | null) => void;
  setResults: (data: {
    tally: Record<string, number>;
    ejected: MeetingState['ejected'];
    wasTie: boolean;
  }) => void;
  endMeeting: () => void;
}

import { create } from 'zustand';

export const useMeetingStore = create<MeetingStore>((set) => ({
  meeting: null,

  startMeeting: ({ meetingId, calledBy, calledByName, discussionMs, votingMs, evidence }) =>
    set({
      meeting: {
        meetingId,
        calledBy,
        calledByName,
        phase: 'discussion',
        votedPlayers: new Set(),
        myVote: null,
        tally: null,
        ejected: null,
        wasTie: false,
        discussionMs,
        votingMs,
        evidence: evidence ?? [],
        analyzingEvidenceId: null,
      },
    }),

  setEvidence: (evidence) =>
    set((s) => (s.meeting ? { meeting: { ...s.meeting, evidence } } : {})),

  setEvidenceAnalysis: (evidenceId, analysis) =>
    set((s) => {
      if (!s.meeting) return {};
      const updatedEvidence = s.meeting.evidence.map((item) =>
        item.id === evidenceId ? { ...item, astraAnalysis: analysis } : item
      );
      return { meeting: { ...s.meeting, evidence: updatedEvidence, analyzingEvidenceId: null } };
    }),

  setAnalyzingEvidenceId: (id) =>
    set((s) => (s.meeting ? { meeting: { ...s.meeting, analyzingEvidenceId: id } } : {})),

  setPhase: (phase) =>
    set((s) => (s.meeting ? { meeting: { ...s.meeting, phase } } : {})),

  markVoted: (userId) =>
    set((s) => {
      if (!s.meeting) return {};
      const next = new Set(s.meeting.votedPlayers);
      next.add(userId);
      return { meeting: { ...s.meeting, votedPlayers: next } };
    }),

  setMyVote: (targetId) =>
    set((s) => (s.meeting ? { meeting: { ...s.meeting, myVote: targetId } } : {})),

  setResults: ({ tally, ejected, wasTie }) =>
    set((s) =>
      s.meeting
        ? { meeting: { ...s.meeting, phase: 'results', tally, ejected, wasTie } }
        : {}
    ),

  endMeeting: () => set({ meeting: null }),
}));
