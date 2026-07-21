import type { Role } from "./types";

export type RiotParticipant = {
  puuid: string;
  summonerName: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  teamId: number;
  win: boolean;
  teamPosition?: string;
  individualPosition?: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
};

export type RiotMatch = {
  metadata: { matchId: string };
  info: { gameDuration: number; gameEndTimestamp?: number; participants: RiotParticipant[] };
};

export type SyncedMatch = {
  id: string;
  gameDurationSeconds: number;
  playedAt?: number;
  teamParticipants: RiotParticipant[];
};

export function normalizeRole(position?: string): Role {
  if (position === "TOP" || position === "JUNGLE" || position === "MIDDLE" || position === "BOTTOM" || position === "UTILITY") return position;
  return "FILL";
}

export function findTeamMatches(matches: RiotMatch[], teamPuuids: Set<string>, minimumPlayers: number): SyncedMatch[] {
  return matches.flatMap((match) => {
    const bySide = new Map<number, RiotParticipant[]>();
    for (const participant of match.info.participants) {
      if (!teamPuuids.has(participant.puuid)) continue;
      bySide.set(participant.teamId, [...(bySide.get(participant.teamId) ?? []), participant]);
    }
    const teamParticipants = [...bySide.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    if (teamParticipants.length < minimumPlayers) return [];
    return [{
      id: match.metadata.matchId,
      gameDurationSeconds: match.info.gameDuration,
      playedAt: match.info.gameEndTimestamp,
      teamParticipants
    }];
  });
}

export function summarizeTeamMatches(matches: SyncedMatch[]) {
  const games = matches.length;
  if (!games) return null;

  let wins = 0;
  let duration = 0;
  let gold = 0;
  let cs = 0;
  let vision = 0;
  let playerGames = 0;

  for (const match of matches) {
    duration += match.gameDurationSeconds;
    for (const player of match.teamParticipants) {
      playerGames += 1;
      if (player.win) wins += 1;
      gold += player.goldEarned;
      cs += player.totalMinionsKilled + player.neutralMinionsKilled;
      vision += player.visionScore;
    }
  }

  const durationMinutes = duration / 60;
  return {
    games,
    teamWinRate: Math.round((wins / playerGames) * 1000) / 10,
    averageDurationMinutes: Math.round((duration / games / 60) * 10) / 10,
    averageGoldPerMinute: Math.round(gold / durationMinutes / (playerGames / games)),
    averageCsPerMinute: Math.round((cs / durationMinutes / (playerGames / games)) * 10) / 10,
    averageVisionPerMinute: Math.round((vision / durationMinutes / (playerGames / games)) * 100) / 100
  };
}

