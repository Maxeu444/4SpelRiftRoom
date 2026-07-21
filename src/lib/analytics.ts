import type { CoachingInsight, Role } from "./types";

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

export type TeamSummary = NonNullable<ReturnType<typeof summarizeTeamMatches>>;

export type PlayerAnalysis = {
  puuid: string;
  displayName: string;
  riotId: string;
  role: Role;
  games: number;
  winRate: number;
  kda: number;
  goldPerMinute: number;
  csPerMinute: number;
  visionPerMinute: number;
};

export type PlayerRoleAnalysis = {
  playerPuuid: string;
  role: Role;
  games: number;
  winRate: number;
  kda: number;
  goldPerMinute: number;
  csPerMinute: number;
  visionPerMinute: number;
};

export type ChampionAnalysis = {
  playerPuuid: string;
  champion: string;
  role: Role;
  games: number;
  winRate: number;
  kda: number;
};

export type TeamAnalysis = {
  summary: TeamSummary | null;
  players: PlayerAnalysis[];
  playerRoles: PlayerRoleAnalysis[];
  champions: ChampionAnalysis[];
  insights: CoachingInsight[];
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

function round(value: number, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function displayName(player: RiotParticipant) {
  return player.riotIdGameName || player.summonerName;
}

function riotId(player: RiotParticipant) {
  return player.riotIdGameName && player.riotIdTagline ? `${player.riotIdGameName}#${player.riotIdTagline}` : player.summonerName;
}

function deriveInsights(summary: TeamSummary | null): CoachingInsight[] {
  if (!summary) return [];

  const winRateInsight: CoachingInsight = summary.teamWinRate >= 50
    ? {
        type: "success",
        title: "Bilan collectif positif",
        detail: `${summary.teamWinRate} % de victoires sur ${summary.games} parties jouées ensemble.`,
        action: "Conservez les drafts et associations qui reviennent dans ces victoires."
      }
    : {
        type: "priority",
        title: "Bilan collectif à stabiliser",
        detail: `${summary.teamWinRate} % de victoires sur ${summary.games} parties jouées ensemble.`,
        action: "Sélectionnez une défaite récente et travaillez un seul objectif d’équipe en VOD."
      };

  const visionInsight: CoachingInsight = summary.averageVisionPerMinute >= 1.3
    ? {
        type: "success",
        title: "Vision active",
        detail: `${summary.averageVisionPerMinute} de vision/minute sur les parties synchronisées.`,
        action: "Gardez ce rythme lors des setups d’objectifs."
      }
    : {
        type: "watch",
        title: "Vision à renforcer",
        detail: `${summary.averageVisionPerMinute} de vision/minute sur les parties synchronisées.`,
        action: "Planifiez un reset collectif avant chaque objectif majeur."
      };

  return [
    winRateInsight,
    visionInsight,
    {
      type: "watch",
      title: "Tempo des parties",
      detail: `Durée moyenne observée : ${summary.averageDurationMinutes} minutes.`,
      action: "Comparez les fins de partie longues avec vos décisions autour de Baron et des objectifs."
    }
  ];
}

export function analyzeTeamMatches(matches: SyncedMatch[]): TeamAnalysis {
  const summary = summarizeTeamMatches(matches);
  const playerTotals = new Map<string, {
    player: RiotParticipant;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    gold: number;
    cs: number;
    vision: number;
    minutes: number;
  }>();
  const championTotals = new Map<string, {
    playerPuuid: string;
    champion: string;
    role: Role;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  }>();
  const playerRoleTotals = new Map<string, {
    playerPuuid: string;
    role: Role;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    gold: number;
    cs: number;
    vision: number;
    minutes: number;
  }>();

  for (const match of matches) {
    const minutes = Math.max(match.gameDurationSeconds / 60, 1);
    for (const player of match.teamParticipants) {
      const existingPlayer = playerTotals.get(player.puuid) ?? {
        player,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        gold: 0,
        cs: 0,
        vision: 0,
        minutes: 0
      };
      existingPlayer.player = player;
      existingPlayer.games += 1;
      existingPlayer.wins += Number(player.win);
      existingPlayer.kills += player.kills;
      existingPlayer.deaths += player.deaths;
      existingPlayer.assists += player.assists;
      existingPlayer.gold += player.goldEarned;
      existingPlayer.cs += player.totalMinionsKilled + player.neutralMinionsKilled;
      existingPlayer.vision += player.visionScore;
      existingPlayer.minutes += minutes;
      playerTotals.set(player.puuid, existingPlayer);

      const role = normalizeRole(player.teamPosition ?? player.individualPosition);
      const playerRoleKey = `${player.puuid}:${role}`;
      const existingPlayerRole = playerRoleTotals.get(playerRoleKey) ?? {
        playerPuuid: player.puuid,
        role,
        games: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        gold: 0,
        cs: 0,
        vision: 0,
        minutes: 0
      };
      existingPlayerRole.games += 1;
      existingPlayerRole.wins += Number(player.win);
      existingPlayerRole.kills += player.kills;
      existingPlayerRole.deaths += player.deaths;
      existingPlayerRole.assists += player.assists;
      existingPlayerRole.gold += player.goldEarned;
      existingPlayerRole.cs += player.totalMinionsKilled + player.neutralMinionsKilled;
      existingPlayerRole.vision += player.visionScore;
      existingPlayerRole.minutes += minutes;
      playerRoleTotals.set(playerRoleKey, existingPlayerRole);

      const championKey = `${player.puuid}:${role}:${player.championName}`;
      const existingChampion = championTotals.get(championKey) ?? { playerPuuid: player.puuid, champion: player.championName, role, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      existingChampion.games += 1;
      existingChampion.wins += Number(player.win);
      existingChampion.kills += player.kills;
      existingChampion.deaths += player.deaths;
      existingChampion.assists += player.assists;
      championTotals.set(championKey, existingChampion);
    }
  }

  const playerRoles = [...playerRoleTotals.values()]
    .map(({ playerPuuid, role, games, wins, kills, deaths, assists, gold, cs, vision, minutes }) => ({
      playerPuuid,
      role,
      games,
      winRate: round((wins / games) * 100),
      kda: round((kills + assists) / Math.max(deaths, 1)),
      goldPerMinute: Math.round(gold / minutes),
      csPerMinute: round(cs / minutes),
      visionPerMinute: round(vision / minutes, 2)
    }))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
  const dominantRoleByPlayer = new Map<string, Role>();
  for (const playerRole of playerRoles) {
    if (!dominantRoleByPlayer.has(playerRole.playerPuuid)) dominantRoleByPlayer.set(playerRole.playerPuuid, playerRole.role);
  }

  const players = [...playerTotals.values()]
    .map(({ player, games, wins, kills, deaths, assists, gold, cs, vision, minutes }) => ({
      puuid: player.puuid,
      displayName: displayName(player),
      riotId: riotId(player),
      role: dominantRoleByPlayer.get(player.puuid) ?? "FILL",
      games,
      winRate: round((wins / games) * 100),
      kda: round((kills + assists) / Math.max(deaths, 1)),
      goldPerMinute: Math.round(gold / minutes),
      csPerMinute: round(cs / minutes),
      visionPerMinute: round(vision / minutes, 2)
    }))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
  const champions = [...championTotals.values()]
    .map(({ playerPuuid, champion, role, games, wins, kills, deaths, assists }) => ({
      playerPuuid,
      champion,
      role,
      games,
      winRate: round((wins / games) * 100),
      kda: round((kills + assists) / Math.max(deaths, 1))
    }))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);

  return { summary, players, playerRoles, champions, insights: deriveInsights(summary) };
}
