import { normalizeRole, type RiotMatch, type RiotParticipant } from "./analytics";
import type { Role } from "./types";

export type ScoutingAccount = { puuid: string; gameName: string; tagLine: string };

export type ScoutedChampion = {
  champion: string;
  role: Role;
  games: number;
  winRate: number;
  kda: number;
};

export type OpponentScout = {
  puuid: string;
  displayName: string;
  riotId: string;
  games: number;
  primaryRole: Role;
  championPool: ScoutedChampion[];
};

export type ScoutingReport = {
  sampledMatchesPerOpponent: number;
  opponents: OpponentScout[];
};

type PlayerTotals = {
  participant?: RiotParticipant;
  games: number;
  wins: number;
  champions: Map<string, { champion: string; role: Role; games: number; wins: number; kills: number; deaths: number; assists: number }>;
};

function round(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function displayName(account: ScoutingAccount, participant?: RiotParticipant) {
  return participant?.riotIdGameName || participant?.summonerName || account.gameName;
}

export function analyzeOpponentScouting(entries: { account: ScoutingAccount; matches: RiotMatch[] }[], sampledMatchesPerOpponent: number): ScoutingReport {
  const totals = new Map<string, PlayerTotals>();

  for (const { account, matches } of entries) {
    const playerTotals: PlayerTotals = totals.get(account.puuid) ?? { games: 0, wins: 0, champions: new Map() };
    for (const match of matches) {
      const participant = match.info.participants.find((candidate) => candidate.puuid === account.puuid);
      if (!participant) continue;
      const role = normalizeRole(participant.teamPosition ?? participant.individualPosition);
      const championKey = `${role}:${participant.championName}`;
      const champion = playerTotals.champions.get(championKey) ?? { champion: participant.championName, role, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      playerTotals.participant = participant;
      playerTotals.games += 1;
      playerTotals.wins += Number(participant.win);
      champion.games += 1;
      champion.wins += Number(participant.win);
      champion.kills += participant.kills;
      champion.deaths += participant.deaths;
      champion.assists += participant.assists;
      playerTotals.champions.set(championKey, champion);
    }
    totals.set(account.puuid, playerTotals);
  }

  return {
    sampledMatchesPerOpponent,
    opponents: entries.map(({ account }) => {
      const total: PlayerTotals = totals.get(account.puuid) ?? { participant: undefined, games: 0, wins: 0, champions: new Map() };
      const championPool = [...total.champions.values()]
        .map((champion) => ({
          champion: champion.champion,
          role: champion.role,
          games: champion.games,
          winRate: round((champion.wins / champion.games) * 100),
          kda: round((champion.kills + champion.assists) / Math.max(champion.deaths, 1))
        }))
        .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
      return {
        puuid: account.puuid,
        displayName: displayName(account, total.participant),
        riotId: `${account.gameName}#${account.tagLine}`,
        games: total.games,
        primaryRole: championPool[0]?.role ?? "FILL",
        championPool
      };
    })
  };
}
