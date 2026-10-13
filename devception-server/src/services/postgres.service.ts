import { Pool } from 'pg';
import { logger } from '../utils/logger';

// ─── PostgreSQL Configuration & Connection Pool ────────────────────────────────
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

let pool: Pool | null = null;
let isConnected = false;

if (postgresUrl) {
  try {
    pool = new Pool({
      connectionString: postgresUrl,
      ssl: process.env.NODE_ENV === 'production' && !postgresUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  } catch (err) {
    logger.warn('[PostgreSQL] Failed to initialize Pool instance', { error: (err as Error).message });
  }
}

// ─── Initialize Schema Migrations ─────────────────────────────────────────────
export async function initPostgres(): Promise<boolean> {
  if (!pool) {
    logger.info('[PostgreSQL] DATABASE_URL not configured. Running in development fallback persistence mode.');
    return false;
  }

  try {
    const client = await pool.connect();
    try {
      await client.query(`
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          display_name VARCHAR(255) NOT NULL,
          avatar_url TEXT,
          is_guest BOOLEAN DEFAULT FALSE,
          games_played INT DEFAULT 0,
          games_won INT DEFAULT 0,
          times_imposter INT DEFAULT 0,
          tasks_completed INT DEFAULT 0,
          xp INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Rooms table
        CREATE TABLE IF NOT EXISTS rooms (
          id SERIAL PRIMARY KEY,
          room_code VARCHAR(32) UNIQUE NOT NULL,
          language VARCHAR(32) NOT NULL,
          skill_level VARCHAR(32) DEFAULT 'beginner',
          max_players INT DEFAULT 8,
          host_user_id VARCHAR(255),
          status VARCHAR(32) DEFAULT 'waiting',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Matches table
        CREATE TABLE IF NOT EXISTS matches (
          id SERIAL PRIMARY KEY,
          room_code VARCHAR(32) NOT NULL,
          language VARCHAR(32) NOT NULL,
          skill_level VARCHAR(32) DEFAULT 'beginner',
          winner VARCHAR(32),
          duration_ms INT DEFAULT 0,
          final_progress INT DEFAULT 0,
          started_at TIMESTAMP WITH TIME ZONE,
          ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          metadata JSONB
        );

        -- Match Participants table
        CREATE TABLE IF NOT EXISTS match_participants (
          id SERIAL PRIMARY KEY,
          match_id INT REFERENCES matches(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          role VARCHAR(32) NOT NULL,
          is_alive BOOLEAN DEFAULT TRUE,
          is_winner BOOLEAN DEFAULT FALSE,
          tasks_completed INT DEFAULT 0,
          xp_earned INT DEFAULT 0
        );

        -- Match Votes table
        CREATE TABLE IF NOT EXISTS match_votes (
          id SERIAL PRIMARY KEY,
          match_id INT REFERENCES matches(id) ON DELETE CASCADE,
          meeting_id VARCHAR(255),
          voter_id VARCHAR(255) NOT NULL,
          target_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Match Events & Edit Evidence table
        CREATE TABLE IF NOT EXISTS match_events (
          id SERIAL PRIMARY KEY,
          match_id INT REFERENCES matches(id) ON DELETE CASCADE,
          event_type VARCHAR(64) NOT NULL,
          payload JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      isConnected = true;
      logger.info('[PostgreSQL] Database connected and schema verified successfully');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn('[PostgreSQL] Connection check failed; operating in fallback mode', {
      error: (err as Error).message,
    });
    isConnected = false;
    return false;
  }
}

export function isPostgresConnected(): boolean {
  return isConnected;
}

// ─── Durable Match Persistence ────────────────────────────────────────────────
export interface MatchRecordInput {
  roomCode: string;
  language: string;
  skillLevel?: string;
  winner: 'good-coders' | 'imposters';
  durationMs: number;
  finalProgress: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  players: Array<{
    userId: string;
    displayName: string;
    role: string;
    isAlive: boolean;
    isWinner: boolean;
    tasksCompleted: number;
    xpEarned: number;
  }>;
  meetings?: Array<{
    meetingId: string;
    calledBy: string;
    ejectedPlayer: string | null;
    wasImposter: boolean | null;
    votes: Array<{ voterId: string; targetId: string }>;
  }>;
  evidenceEvents?: Array<{
    eventType: string;
    payload: Record<string, unknown>;
  }>;
}

export async function persistMatchToPostgres(data: MatchRecordInput): Promise<number | null> {
  if (!pool || !isConnected) return null;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const matchRes = await client.query(
        `INSERT INTO matches (room_code, language, skill_level, winner, duration_ms, final_progress, started_at, ended_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          data.roomCode,
          data.language,
          data.skillLevel || 'beginner',
          data.winner,
          data.durationMs,
          data.finalProgress,
          data.startedAt || new Date(),
          data.endedAt || new Date(),
          JSON.stringify({ totalPlayers: data.players.length, meetingsCount: data.meetings?.length || 0 }),
        ]
      );

      const matchId = matchRes.rows[0].id as number;

      // Persist participants
      for (const p of data.players) {
        await client.query(
          `INSERT INTO match_participants (match_id, user_id, display_name, role, is_alive, is_winner, tasks_completed, xp_earned)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [matchId, p.userId, p.displayName, p.role, p.isAlive, p.isWinner, p.tasksCompleted, p.xpEarned]
        );

        // Update player statistics
        await client.query(
          `INSERT INTO users (user_id, display_name, games_played, games_won, times_imposter, tasks_completed, xp)
           VALUES ($1, $2, 1, $3, $4, $5, $6)
           ON CONFLICT (user_id) DO UPDATE SET
             games_played = users.games_played + 1,
             games_won = users.games_won + $3,
             times_imposter = users.times_imposter + $4,
             tasks_completed = users.tasks_completed + $5,
             xp = users.xp + $6,
             updated_at = NOW()`,
          [
            p.userId,
            p.displayName,
            p.isWinner ? 1 : 0,
            p.role === 'imposter' ? 1 : 0,
            p.tasksCompleted,
            p.xpEarned,
          ]
        );
      }

      // Persist meeting votes
      if (data.meetings) {
        for (const m of data.meetings) {
          for (const v of m.votes) {
            await client.query(
              `INSERT INTO match_votes (match_id, meeting_id, voter_id, target_id)
               VALUES ($1, $2, $3, $4)`,
              [matchId, m.meetingId, v.voterId, v.targetId]
            );
          }
        }
      }

      // Persist evidence events
      if (data.evidenceEvents) {
        for (const ev of data.evidenceEvents) {
          await client.query(
            `INSERT INTO match_events (match_id, event_type, payload)
             VALUES ($1, $2, $3)`,
            [matchId, ev.eventType, JSON.stringify(ev.payload)]
          );
        }
      }

      await client.query('COMMIT');
      logger.info(`[PostgreSQL] Match ${matchId} durably persisted for room ${data.roomCode}`);
      return matchId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('[PostgreSQL] Failed to persist match record', { error: (err as Error).message });
    return null;
  }
}

export async function disconnectPostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    isConnected = false;
    logger.info('[PostgreSQL] Connection pool ended');
  }
}
