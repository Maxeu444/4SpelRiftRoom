import type { CoachingInsight, Role } from "./types";

export type RiotPosition = { x: number; y: number };

export type RiotParticipant = {
  participantId?: number;
  puuid: string;
  summonerName: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  teamId: number;
  win: boolean;
  teamPosition?: string;
  individualPosition?: string;
  championName: string;
  championId?: number;
  kills: number;
  deaths: number;
  assists: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  totalDamageDealtToChampions?: number;
  damageDealtToObjectives?: number;
  totalDamageTaken?: number;
  timeCCingOthers?: number;
  turretTakedowns?: number;
  wardsKilled?: number;
  visionWardsBoughtInGame?: number;
};

export type RiotTeam = {
  teamId: number;
  win?: boolean;
  bans?: Array<{ championId: number; pickTurn?: number }>;
};

export type RiotMatch = {
  metadata: { matchId: string };
  info: {
    gameDuration: number;
    gameStartTimestamp?: number;
    gameEndTimestamp?: number;
    gameVersion?: string;
    queueId?: number;
    participants: RiotParticipant[];
    teams?: RiotTeam[];
  };
};

export type RiotTimelineParticipantFrame = {
  participantId: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  position?: RiotPosition;
};

export type RiotTimelineEvent = {
  type: string;
  timestamp: number;
  killerId?: number;
  killerTeamId?: number;
  victimId?: number;
  creatorId?: number;
  wardType?: string;
  monsterType?: string;
  monsterSubType?: string;
  position?: RiotPosition;
};

export type RiotMatchTimeline = {
  metadata: { matchId: string };
  info: {
    frames: Array<{
      timestamp: number;
      participantFrames?: Record<string, RiotTimelineParticipantFrame>;
      events?: RiotTimelineEvent[];
    }>;
  };
};

export type SyncedMatch = {
  id: string;
  gameDurationSeconds: number;
  playedAt?: number;
  gameStartedAt?: number;
  teamParticipants: RiotParticipant[];
  opponentParticipants: RiotParticipant[];
  teamKills: number;
  opponentBans: number[];
};

export type TeamSummary = NonNullable<ReturnType<typeof summarizeTeamMatches>>;

export type TimelinePlayerStats = {
  timelineGames: number;
  deathsPerGame: number | null;
  riskyDeathsPerGame: number | null;
  laneCsAt10: number | null;
  laneCsAt15: number | null;
  farmAt10: number | null;
  farmAt15: number | null;
  wardsPerGame: number | null;
  wardsBeforeObjectivesPerGame: number | null;
  objectiveParticipationRate: number | null;
};

export type IndividualMatchStats = {
  killsPerGame: number;
  deathsPerGame: number;
  assistsPerGame: number;
  killParticipation: number | null;
  visionScorePerGame: number;
  damageToChampionsPerMinute: number;
  objectiveDamagePerMinute: number;
  damageTakenPerMinute: number;
  ccSecondsPerMinute: number;
  turretTakedownsPerGame: number;
  wardsKilledPerGame: number;
  controlWardsPerGame: number;
};

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
  matchStats: IndividualMatchStats;
  timeline: TimelinePlayerStats;
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
  matchStats: IndividualMatchStats;
  timeline: TimelinePlayerStats;
};

export type ChampionAnalysis = {
  playerPuuid: string;
  champion: string;
  role: Role;
  games: number;
  winRate: number;
  kda: number;
};

export type DeathWindows = {
  early: number;
  setup: number;
  throw: number;
  late: number;
};

export type TeamTimelineSummary = {
  games: number;
  teamDeathsPerGame: number | null;
  riskyDeathsPerGame: number | null;
  deathWindows: DeathWindows;
  objectivesObserved: number;
  objectivesSecured: number;
  objectiveVisionRate: number | null;
  fullRosterPresenceRate: number | null;
  averageRosterPresenceRate: number | null;
  objectiveSetups: ObjectiveSetup[];
  mapEvents: MapReviewEvent[];
};

export type MapReviewEventType = "objective" | "ward" | "death" | "kill";

export type MapReviewEvent = {
  id: string;
  matchId: string;
  gameStartedAt?: number;
  gameDurationSeconds: number;
  teamWon: boolean;
  timestampSeconds: number;
  type: MapReviewEventType;
  label: string;
  detail: string;
  position: RiotPosition;
};

export type ObjectiveSetup = {
  matchId: string;
  gameStartedAt?: number;
  gameDurationSeconds: number;
  teamWon: boolean;
  objective: "Dragon" | "Baron" | "Héraut";
  gameTimestampSeconds: number;
  wardsBefore: number;
  presentPlayers: number;
  rosterPlayers: number;
  deathsBefore: number;
  ready: boolean;
};

export type PlaybookMilestone = {
  id: "survival" | "vision" | "fights" | "draft";
  title: string;
  status: "on-track" | "watch" | "review";
  evidence: string;
  action: string;
  automated: boolean;
};

export type DraftComposition = {
  label: string;
  games: number;
  winRate: number;
};

export type DraftBan = {
  champion: string;
  bans: number;
};

export type DraftAnalysis = {
  fullFiveGames: number;
  compositions: DraftComposition[];
  opponentBans: DraftBan[];
};

export type SessionReview = {
  title: string;
  evidence: string;
  nextAction: string;
};

export type ObjectiveSetupEvent = {
  matchId: string;
  objective: "Dragon" | "Herald" | "Baron";
  timestampSeconds: number;
  wardsBefore: number;
  playersPresent: number;
  deathsBefore: number;
  ready: boolean;
};

export type ObjectiveSetupAnalysis = {
  sampledMatches: number;
  objectives: number;
  setupRate: number;
  averageWardsBefore: number;
  averagePlayersPresent: number;
  averageDeathsBefore: number;
  recentObjectives: ObjectiveSetupEvent[];
};

export type IndividualAnalysis = {
  players: PlayerAnalysis[];
  playerRoles: PlayerRoleAnalysis[];
  champions: ChampionAnalysis[];
};

export type DuoPairAnalysis = {
  playerPuuids: [string, string];
  playerNames: [string, string];
  roles: [Role, Role];
  lane: string;
  games: number;
  wins: number;
  winRate: number;
  averageDurationMinutes: number;
  combinedKda: number;
  killParticipation: number | null;
  damagePerMinute: number;
  objectiveDamagePerMinute: number;
  visionPerMinute: number;
  controlWardsPerGame: number;
  turretTakedownsPerGame: number;
  contextualMetrics: DuoContextualMetric[];
};

export type DuoContextualMetric = {
  label: string;
  value: number;
  unit: string;
  detail: string;
};

export type DuoAnalysis = {
  summary: TeamSummary | null;
  players: PlayerAnalysis[];
  playerRoles: PlayerRoleAnalysis[];
  champions: ChampionAnalysis[];
  pairs: DuoPairAnalysis[];
};

export type TeamAnalysis = {
  summary: TeamSummary | null;
  players: PlayerAnalysis[];
  playerRoles: PlayerRoleAnalysis[];
  champions: ChampionAnalysis[];
  timeline: TeamTimelineSummary;
  objectiveSetup: ObjectiveSetupAnalysis | null;
  milestones: PlaybookMilestone[];
  draft: DraftAnalysis;
  sessionReview: SessionReview | null;
  insights: CoachingInsight[];
  individual?: IndividualAnalysis;
  duo?: DuoAnalysis;
};

type TimelineTotals = {
  games: number;
  deaths: number;
  riskyDeaths: number;
  laneCsAt10: number;
  laneCsAt10Samples: number;
  laneCsAt15: number;
  laneCsAt15Samples: number;
  farmAt10: number;
  farmAt10Samples: number;
  farmAt15: number;
  farmAt15Samples: number;
  wards: number;
  wardsBeforeObjectives: number;
  objectivePresent: number;
  objectiveOpportunities: number;
};

type MatchStatsTotals = {
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  teamKills: number;
  gold: number;
  cs: number;
  vision: number;
  minutes: number;
  damageToChampions: number;
  objectiveDamage: number;
  damageTaken: number;
  ccSeconds: number;
  turretTakedowns: number;
  wardsKilled: number;
  controlWards: number;
};

type MatchTimelineMetric = {
  deaths: number;
  riskyDeaths: number;
  laneCsAt10?: number;
  laneCsAt15?: number;
  farmAt10?: number;
  farmAt15?: number;
  wards: number;
  wardsBeforeObjectives: number;
  objectivePresent: number;
  objectiveOpportunities: number;
};

type MatchTimelineResult = {
  players: Map<string, MatchTimelineMetric>;
  teamDeaths: number;
  riskyDeaths: number;
  deathWindows: DeathWindows;
  objectivesObserved: number;
  objectivesSecured: number;
  objectivesWithVision: number;
  objectivesWithFullRoster: number;
  rosterSlotsPresent: number;
  rosterSlotsPossible: number;
  objectiveSetups: ObjectiveSetup[];
  mapEvents: MapReviewEvent[];
};

const timelineWindowLabels = {
  early: "0–10 min",
  setup: "10–20 min",
  throw: "20–25 min",
  late: "25+ min"
} as const;

// Les événements WARD_PLACED de Match-V5 donnent le créateur et l'horodatage,
// mais leur position n'est pas systématiquement disponible. Pour estimer leur
// emplacement, on utilise la position du poseur sur la frame Timeline la plus
// proche. La préparation reste mesurée dans une fenêtre temporelle explicite.
const objectiveWardWindowMs = 90_000;

const engageChampions = new Set([
  "Alistar", "Amumu", "Azir", "Diana", "Galio", "Gragas", "JarvanIV", "Kennen", "Leona", "Maokai", "Malphite", "Nautilus", "Neeko", "Nocturne", "Ornn", "Rakan", "Rell", "Sejuani", "Sion", "Skarner", "Wukong", "Zac"
]);
const pickChampions = new Set([
  "Ahri", "Blitzcrank", "Elise", "Evelynn", "LeBlanc", "Nidalee", "Pyke", "Thresh", "TwistedFate", "Vi", "Vex", "Zoe"
]);
const scalingChampions = new Set([
  "Azir", "Corki", "Jinx", "Kassadin", "Kayle", "KogMaw", "Smolder", "Vayne", "Veigar", "Viktor"
]);

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
    const teamParticipants = [...bySide.values()].sort((left, right) => right.length - left.length)[0] ?? [];
    if (teamParticipants.length < minimumPlayers) return [];
    const teamId = teamParticipants[0]?.teamId;
    const opponentParticipants = match.info.participants.filter((participant) => participant.teamId !== teamId);
    const teamKills = match.info.participants.filter((participant) => participant.teamId === teamId).reduce((total, participant) => total + participant.kills, 0);
    const opponentBans = match.info.teams
      ?.find((team) => team.teamId !== teamId)
      ?.bans
      ?.map((ban) => ban.championId)
      .filter((championId) => championId > 0) ?? [];
    return [{
      id: match.metadata.matchId,
      gameDurationSeconds: match.info.gameDuration,
      playedAt: match.info.gameEndTimestamp,
      gameStartedAt: match.info.gameStartTimestamp ?? (match.info.gameEndTimestamp ? match.info.gameEndTimestamp - match.info.gameDuration * 1_000 : undefined),
      teamParticipants,
      opponentParticipants,
      teamKills,
      opponentBans
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

function emptyDeathWindows(): DeathWindows {
  return { early: 0, setup: 0, throw: 0, late: 0 };
}

function emptyTimelineTotals(): TimelineTotals {
  return {
    games: 0,
    deaths: 0,
    riskyDeaths: 0,
    laneCsAt10: 0,
    laneCsAt10Samples: 0,
    laneCsAt15: 0,
    laneCsAt15Samples: 0,
    farmAt10: 0,
    farmAt10Samples: 0,
    farmAt15: 0,
    farmAt15Samples: 0,
    wards: 0,
    wardsBeforeObjectives: 0,
    objectivePresent: 0,
    objectiveOpportunities: 0
  };
}

function addTimelineMetric(totals: TimelineTotals, metric: MatchTimelineMetric) {
  totals.games += 1;
  totals.deaths += metric.deaths;
  totals.riskyDeaths += metric.riskyDeaths;
  totals.wards += metric.wards;
  totals.wardsBeforeObjectives += metric.wardsBeforeObjectives;
  totals.objectivePresent += metric.objectivePresent;
  totals.objectiveOpportunities += metric.objectiveOpportunities;
  if (metric.laneCsAt10 !== undefined) {
    totals.laneCsAt10 += metric.laneCsAt10;
    totals.laneCsAt10Samples += 1;
  }
  if (metric.laneCsAt15 !== undefined) {
    totals.laneCsAt15 += metric.laneCsAt15;
    totals.laneCsAt15Samples += 1;
  }
  if (metric.farmAt10 !== undefined) {
    totals.farmAt10 += metric.farmAt10;
    totals.farmAt10Samples += 1;
  }
  if (metric.farmAt15 !== undefined) {
    totals.farmAt15 += metric.farmAt15;
    totals.farmAt15Samples += 1;
  }
}

function timelinePlayerStats(totals: TimelineTotals): TimelinePlayerStats {
  const perGame = (value: number) => totals.games ? round(value / totals.games, 2) : null;
  const average = (value: number, samples: number) => samples ? round(value / samples) : null;
  return {
    timelineGames: totals.games,
    deathsPerGame: perGame(totals.deaths),
    riskyDeathsPerGame: perGame(totals.riskyDeaths),
    laneCsAt10: average(totals.laneCsAt10, totals.laneCsAt10Samples),
    laneCsAt15: average(totals.laneCsAt15, totals.laneCsAt15Samples),
    farmAt10: average(totals.farmAt10, totals.farmAt10Samples),
    farmAt15: average(totals.farmAt15, totals.farmAt15Samples),
    wardsPerGame: perGame(totals.wards),
    wardsBeforeObjectivesPerGame: perGame(totals.wardsBeforeObjectives),
    objectiveParticipationRate: totals.objectiveOpportunities ? round((totals.objectivePresent / totals.objectiveOpportunities) * 100) : null
  };
}

export function findDuoMatches(matches: RiotMatch[], teamPuuids: Set<string>): SyncedMatch[] {
  return findTeamMatches(matches, teamPuuids, 2).filter((match) => match.teamParticipants.length === 2);
}

function emptyTimelinePlayerStats(): TimelinePlayerStats {
  return {
    timelineGames: 0,
    deathsPerGame: null,
    riskyDeathsPerGame: null,
    laneCsAt10: null,
    laneCsAt15: null,
    farmAt10: null,
    farmAt15: null,
    wardsPerGame: null,
    wardsBeforeObjectivesPerGame: null,
    objectiveParticipationRate: null
  };
}

function emptyMatchStatsTotals(): MatchStatsTotals {
  return {
    games: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    teamKills: 0,
    gold: 0,
    cs: 0,
    vision: 0,
    minutes: 0,
    damageToChampions: 0,
    objectiveDamage: 0,
    damageTaken: 0,
    ccSeconds: 0,
    turretTakedowns: 0,
    wardsKilled: 0,
    controlWards: 0
  };
}

function valueOrZero(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function addMatchStats(totals: MatchStatsTotals, player: RiotParticipant, teamKills: number, minutes: number) {
  totals.games += 1;
  totals.wins += Number(player.win);
  totals.kills += player.kills;
  totals.deaths += player.deaths;
  totals.assists += player.assists;
  totals.teamKills += teamKills;
  totals.gold += player.goldEarned;
  totals.cs += player.totalMinionsKilled + player.neutralMinionsKilled;
  totals.vision += player.visionScore;
  totals.minutes += minutes;
  totals.damageToChampions += valueOrZero(player.totalDamageDealtToChampions);
  totals.objectiveDamage += valueOrZero(player.damageDealtToObjectives);
  totals.damageTaken += valueOrZero(player.totalDamageTaken);
  totals.ccSeconds += valueOrZero(player.timeCCingOthers);
  totals.turretTakedowns += valueOrZero(player.turretTakedowns);
  totals.wardsKilled += valueOrZero(player.wardsKilled);
  totals.controlWards += valueOrZero(player.visionWardsBoughtInGame);
}

function individualMatchStats(totals: MatchStatsTotals): IndividualMatchStats {
  const perGame = (value: number) => round(value / Math.max(totals.games, 1), 2);
  const perMinute = (value: number) => round(value / Math.max(totals.minutes, 1), 1);
  return {
    killsPerGame: perGame(totals.kills),
    deathsPerGame: perGame(totals.deaths),
    assistsPerGame: perGame(totals.assists),
    killParticipation: totals.teamKills ? round(((totals.kills + totals.assists) / totals.teamKills) * 100) : null,
    visionScorePerGame: perGame(totals.vision),
    damageToChampionsPerMinute: perMinute(totals.damageToChampions),
    objectiveDamagePerMinute: perMinute(totals.objectiveDamage),
    damageTakenPerMinute: perMinute(totals.damageTaken),
    ccSecondsPerMinute: perMinute(totals.ccSeconds),
    turretTakedownsPerGame: perGame(totals.turretTakedowns),
    wardsKilledPerGame: perGame(totals.wardsKilled),
    controlWardsPerGame: perGame(totals.controlWards)
  };
}

function closestFrame(frames: RiotMatchTimeline["info"]["frames"], timestamp: number) {
  return frames.reduce<(typeof frames)[number] | undefined>((closest, frame) => {
    if (!closest || Math.abs(frame.timestamp - timestamp) < Math.abs(closest.timestamp - timestamp)) return frame;
    return closest;
  }, undefined);
}

function participantFrame(frame: RiotMatchTimeline["info"]["frames"][number] | undefined, participantId: number) {
  if (!frame?.participantFrames) return undefined;
  return frame.participantFrames[String(participantId)] ?? Object.values(frame.participantFrames).find((candidate) => candidate.participantId === participantId);
}

function distance(left?: RiotPosition, right?: RiotPosition) {
  if (!left || !right) return null;
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function objectiveLabel(event: RiotTimelineEvent) {
  if (event.monsterType === "DRAGON") return "Dragon";
  if (event.monsterType === "BARON_NASHOR") return "Baron";
  if (event.monsterType === "RIFTHERALD") return "Héraut";
  return null;
}

function hasMapPosition(position?: RiotPosition): position is RiotPosition {
  return Boolean(position && Number.isFinite(position.x) && Number.isFinite(position.y) && position.x >= 0 && position.x <= 15_000 && position.y >= 0 && position.y <= 15_000);
}

function timelinePlayerName(player?: RiotParticipant) {
  return player?.riotIdGameName || player?.summonerName || "4Spel";
}

function deathWindow(timestamp: number): keyof DeathWindows {
  if (timestamp < 10 * 60_000) return "early";
  if (timestamp < 20 * 60_000) return "setup";
  if (timestamp < 25 * 60_000) return "throw";
  return "late";
}

function computeMatchTimeline(match: SyncedMatch, timeline: RiotMatchTimeline): MatchTimelineResult {
  const frames = timeline.info.frames;
  const events = frames.flatMap((frame) => frame.events ?? []).sort((left, right) => left.timestamp - right.timestamp);
  const playerByParticipantId = new Map<number, RiotParticipant>();
  for (const player of match.teamParticipants) {
    if (player.participantId) playerByParticipantId.set(player.participantId, player);
  }
  const metrics = new Map<string, MatchTimelineMetric>();
  for (const player of match.teamParticipants) {
    metrics.set(player.puuid, { deaths: 0, riskyDeaths: 0, wards: 0, wardsBeforeObjectives: 0, objectivePresent: 0, objectiveOpportunities: 0 });
    if (!player.participantId) continue;
    const tenMinuteFrame = closestFrame(frames, 10 * 60_000);
    const fifteenMinuteFrame = closestFrame(frames, 15 * 60_000);
    const tenMinuteStats = participantFrame(tenMinuteFrame, player.participantId);
    const fifteenMinuteStats = participantFrame(fifteenMinuteFrame, player.participantId);
    const metric = metrics.get(player.puuid)!;
    if (tenMinuteStats) {
      metric.laneCsAt10 = tenMinuteStats.minionsKilled;
      metric.farmAt10 = tenMinuteStats.minionsKilled + tenMinuteStats.jungleMinionsKilled;
    }
    if (fifteenMinuteStats) {
      metric.laneCsAt15 = fifteenMinuteStats.minionsKilled;
      metric.farmAt15 = fifteenMinuteStats.minionsKilled + fifteenMinuteStats.jungleMinionsKilled;
    }
  }

  const objectives = events.filter((event) => event.type === "ELITE_MONSTER_KILL" && objectiveLabel(event));
  const wardEvents = events
    .filter((event) => event.type === "WARD_PLACED" && event.creatorId && playerByParticipantId.has(event.creatorId))
    .map((ward) => {
      const player = playerByParticipantId.get(ward.creatorId!);
      const snapshotPosition = player?.participantId ? participantFrame(closestFrame(frames, ward.timestamp), player.participantId)?.position : undefined;
      return { ...ward, position: ward.position ?? snapshotPosition, positionIsEstimated: !ward.position && Boolean(snapshotPosition) };
    });
  const mapEvents: MapReviewEvent[] = [];
  const teamId = match.teamParticipants[0]?.teamId;
  const baseMapEvent = {
    matchId: match.id,
    gameStartedAt: match.gameStartedAt,
    gameDurationSeconds: match.gameDurationSeconds,
    teamWon: Boolean(match.teamParticipants[0]?.win)
  };
  for (const ward of wardEvents) {
    const player = playerByParticipantId.get(ward.creatorId!);
    if (player) metrics.get(player.puuid)!.wards += 1;
    if (player && hasMapPosition(ward.position)) {
      mapEvents.push({
        ...baseMapEvent,
        id: `${match.id}:ward:${ward.timestamp}:${ward.creatorId}`,
        timestampSeconds: Math.round(ward.timestamp / 1_000),
        type: "ward",
        label: `Ward · ${timelinePlayerName(player)}`,
        detail: ward.wardType ? `Ward posée (${ward.wardType})` : "Ward posée",
        position: ward.position
      });
    }
  }

  let teamDeaths = 0;
  let riskyDeaths = 0;
  const deathWindows = emptyDeathWindows();
  for (const event of events) {
    if (event.type !== "CHAMPION_KILL" || !event.victimId) continue;
    const victim = playerByParticipantId.get(event.victimId);
    const killer = event.killerId ? playerByParticipantId.get(event.killerId) : undefined;
    const frame = closestFrame(frames, event.timestamp);
    if (victim?.participantId) {
      const metric = metrics.get(victim.puuid)!;
      metric.deaths += 1;
      teamDeaths += 1;
      deathWindows[deathWindow(event.timestamp)] += 1;
      const victimPosition = participantFrame(frame, victim.participantId)?.position;
      const markerPosition = event.position ?? victimPosition;
      if (hasMapPosition(markerPosition)) {
        mapEvents.push({
          ...baseMapEvent,
          id: `${match.id}:death:${event.timestamp}:${event.victimId}`,
          timestampSeconds: Math.round(event.timestamp / 1_000),
          type: "death",
          label: `Mort · ${timelinePlayerName(victim)}`,
          detail: "Mort de l'équipe",
          position: markerPosition
        });
      }
      const nearbyTeammate = [...playerByParticipantId.entries()].some(([participantId, player]) => {
        if (player.puuid === victim.puuid) return false;
        const teammatePosition = participantFrame(frame, participantId)?.position;
        const teammateDistance = distance(victimPosition, teammatePosition);
        return teammateDistance !== null && teammateDistance <= 2_500;
      });
      // Ne pas utiliser une position estimée pour déclarer une mort « couverte » :
      // l'incertitude est acceptable en coaching objectif, pas pour juger une mort.
      const wardPositionsAvailable = wardEvents.some((ward) => Boolean(ward.position) && !ward.positionIsEstimated);
      const nearbyWard = !wardPositionsAvailable || wardEvents.some((ward) => {
        if (ward.timestamp < event.timestamp - objectiveWardWindowMs || ward.timestamp > event.timestamp) return false;
        const wardDistance = distance(victimPosition, ward.position);
        return wardDistance !== null && wardDistance <= 2_500;
      });
      const objectiveSoon = objectives.some((objective) => objective.timestamp >= event.timestamp && objective.timestamp <= event.timestamp + 90_000);
      if ((!nearbyTeammate && !nearbyWard) || (!nearbyTeammate && objectiveSoon)) {
        metric.riskyDeaths += 1;
        riskyDeaths += 1;
      }
    } else if (killer && hasMapPosition(event.position)) {
      mapEvents.push({
        ...baseMapEvent,
        id: `${match.id}:kill:${event.timestamp}:${event.killerId}`,
        timestampSeconds: Math.round(event.timestamp / 1_000),
        type: "kill",
        label: `Kill · ${timelinePlayerName(killer)}`,
        detail: "Élimination de l'équipe",
        position: event.position
      });
    }
  }

  let objectivesSecured = 0;
  let objectivesWithVision = 0;
  let objectivesWithFullRoster = 0;
  let rosterSlotsPresent = 0;
  let rosterSlotsPossible = 0;
  const objectiveSetups: ObjectiveSetup[] = [];
  const creditedWards = new Set<string>();
  for (const objective of objectives) {
    if (!objective.position) continue;
    const frame = closestFrame(frames, objective.timestamp);
    const wardsBeforeObjective = wardEvents.filter((ward) => ward.timestamp >= objective.timestamp - objectiveWardWindowMs && ward.timestamp <= objective.timestamp);
    const estimatedNearbyWards = wardsBeforeObjective.filter((ward) => {
      const wardDistance = distance(ward.position, objective.position);
      return wardDistance !== null && wardDistance <= 2_500;
    });
    // En l'absence d'une position exploitable, la pose dans la fenêtre reste un
    // signal de préparation ; lorsqu'une position est estimée, on la resserre
    // autour du point de mort de l'objectif.
    const creditedObjectiveWards = estimatedNearbyWards.length ? estimatedNearbyWards : wardsBeforeObjective;
    if (creditedObjectiveWards.length) objectivesWithVision += 1;
    for (const ward of creditedObjectiveWards) {
      const player = playerByParticipantId.get(ward.creatorId!);
      if (!player) continue;
      const wardKey = `${player.puuid}:${ward.timestamp}`;
      if (creditedWards.has(wardKey)) continue;
      creditedWards.add(wardKey);
      metrics.get(player.puuid)!.wardsBeforeObjectives += 1;
    }

    let presentPlayers = 0;
    let positionedPlayers = 0;
    for (const [participantId, player] of playerByParticipantId) {
      const position = participantFrame(frame, participantId)?.position;
      if (!position) continue;
      positionedPlayers += 1;
      rosterSlotsPossible += 1;
      const playerDistance = distance(position, objective.position);
      const metric = metrics.get(player.puuid)!;
      metric.objectiveOpportunities += 1;
      if (playerDistance !== null && playerDistance <= 3_500) {
        presentPlayers += 1;
        rosterSlotsPresent += 1;
        metric.objectivePresent += 1;
      }
    }
    if (positionedPlayers === playerByParticipantId.size && presentPlayers === playerByParticipantId.size) objectivesWithFullRoster += 1;
    const securedByTeam = objective.killerTeamId === teamId || (objective.killerId && playerByParticipantId.has(objective.killerId));
    if (securedByTeam) objectivesSecured += 1;
    const deathsBefore = events.filter((event) => event.type === "CHAMPION_KILL" && event.victimId && playerByParticipantId.has(event.victimId) && event.timestamp >= objective.timestamp - 60_000 && event.timestamp <= objective.timestamp).length;
    const label = objectiveLabel(objective);
    if (label) {
      mapEvents.push({
        ...baseMapEvent,
        id: `${match.id}:objective:${objective.timestamp}:${objective.monsterType}`,
        timestampSeconds: Math.round(objective.timestamp / 1_000),
        type: "objective",
        label,
        detail: securedByTeam ? "Objectif sécurisé par 4Spel" : "Objectif sécurisé par l'adversaire",
        position: objective.position
      });
      const requiredPresence = Math.min(4, playerByParticipantId.size);
      objectiveSetups.push({
        matchId: match.id,
        gameStartedAt: match.gameStartedAt,
        gameDurationSeconds: match.gameDurationSeconds,
        teamWon: Boolean(match.teamParticipants[0]?.win),
        objective: label,
        gameTimestampSeconds: Math.round(objective.timestamp / 1_000),
        wardsBefore: creditedObjectiveWards.length,
        presentPlayers,
        rosterPlayers: playerByParticipantId.size,
        deathsBefore,
        ready: creditedObjectiveWards.length > 0 && presentPlayers >= requiredPresence && deathsBefore === 0
      });
    }
  }

  return {
    players: metrics,
    teamDeaths,
    riskyDeaths,
    deathWindows,
    objectivesObserved: objectives.filter((objective) => Boolean(objective.position)).length,
    objectivesSecured,
    objectivesWithVision,
    objectivesWithFullRoster,
    rosterSlotsPresent,
    rosterSlotsPossible,
    objectiveSetups,
    mapEvents
  };
}

function compositionLabel(players: RiotParticipant[]) {
  const champions = players.map((player) => player.championName);
  const count = (pool: Set<string>) => champions.filter((champion) => pool.has(champion)).length;
  if (count(engageChampions) >= 2) return "Engage";
  if (count(pickChampions) >= 2) return "Pick";
  if (count(scalingChampions) >= 2) return "Scaling";
  return "Hybride";
}

function analyzeDraft(matches: SyncedMatch[], championNames: Record<number, string>, rosterSize: number): DraftAnalysis {
  const compositionTotals = new Map<string, { games: number; wins: number }>();
  const bans = new Map<number, number>();
  let fullFiveGames = 0;
  for (const match of matches) {
    for (const ban of match.opponentBans) bans.set(ban, (bans.get(ban) ?? 0) + 1);
    if (rosterSize !== 5 || match.teamParticipants.length !== 5) continue;
    fullFiveGames += 1;
    const label = compositionLabel(match.teamParticipants);
    const existing = compositionTotals.get(label) ?? { games: 0, wins: 0 };
    existing.games += 1;
    existing.wins += Number(match.teamParticipants[0]?.win);
    compositionTotals.set(label, existing);
  }
  return {
    fullFiveGames,
    compositions: [...compositionTotals.entries()]
      .map(([label, total]) => ({ label, games: total.games, winRate: round((total.wins / total.games) * 100) }))
      .sort((left, right) => right.games - left.games || right.winRate - left.winRate),
    opponentBans: [...bans.entries()]
      .map(([championId, count]) => ({ champion: championNames[championId] ?? `Champion #${championId}`, bans: count }))
      .sort((left, right) => right.bans - left.bans || left.champion.localeCompare(right.champion))
      .slice(0, 5)
  };
}

function deriveInsights(summary: TeamSummary | null, timeline: TeamTimelineSummary): CoachingInsight[] {
  if (!summary) return [];
  const candidates: Array<{ score: number; insight: CoachingInsight }> = [];
  if (timeline.games >= 3 && timeline.deathWindows.throw >= 1) {
    candidates.push({ score: timeline.deathWindows.throw * 3, insight: {
      type: "priority",
      title: "La fenêtre 20–25 min est fragile",
      detail: `${timeline.deathWindows.throw} morts par partie en moyenne entre 20 et 25 minutes, sur ${timeline.games} timelines analysées.`,
      action: "Avant chaque objectif de cette fenêtre : reset, pose de vision et déplacement groupé."
    } });
  }
  if (timeline.games >= 3 && (timeline.riskyDeathsPerGame ?? 0) >= 0.8) {
    candidates.push({ score: (timeline.riskyDeathsPerGame ?? 0) * 2.5, insight: {
      type: "priority",
      title: "Morts à risque à réduire",
      detail: `${timeline.riskyDeathsPerGame} mort(s) à risque par partie : isolé(e) sans allié proche ni ward alliée récente.`,
      action: "Avant de facecheck ou de side, annoncez l'information manquante et attendez un binôme."
    } });
  }
  if (timeline.objectivesObserved >= 3 && (timeline.objectiveVisionRate ?? 1) < 65) {
    candidates.push({ score: (65 - (timeline.objectiveVisionRate ?? 0)) / 10 + 2, insight: {
      type: "priority",
      title: "Vision d'objectif insuffisante",
      detail: `Une ward alliée a été posée dans les 90 s avant seulement ${timeline.objectiveVisionRate} % des objectifs observés.`,
      action: "Désignez le joueur qui pose la première ward et le timing de reset 75 secondes avant l'objectif."
    } });
  }
  if (timeline.objectivesObserved >= 3 && (timeline.fullRosterPresenceRate ?? 100) < 65) {
    candidates.push({ score: (65 - (timeline.fullRosterPresenceRate ?? 0)) / 12 + 1.5, insight: {
      type: "watch",
      title: "Présence collective inconstante",
      detail: `Le roster complet n'est dans le rayon de l'objectif que sur ${timeline.fullRosterPresenceRate} % des objectifs mesurables.`,
      action: "Posez un appel unique : push la vague, reset, puis entrée ensemble côté vision."
    } });
  }
  if (summary.teamWinRate < 50) {
    candidates.push({ score: 1, insight: {
      type: "watch",
      title: "Bilan collectif à stabiliser",
      detail: `${summary.teamWinRate} % de victoires sur ${summary.games} parties jouées ensemble.`,
      action: "En review, reliez une défaite à une seule séquence décisive plutôt qu'à la partie entière."
    } });
  } else {
    candidates.push({ score: 0.5, insight: {
      type: "success",
      title: "Bilan collectif positif",
      detail: `${summary.teamWinRate} % de victoires sur ${summary.games} parties jouées ensemble.`,
      action: "Conservez les drafts et associations qui reviennent dans ces victoires."
    } });
  }
  return candidates.sort((left, right) => right.score - left.score).slice(0, 2).map((candidate) => candidate.insight);
}

function milestoneStatus(value: number | null, good: number, watch: number, inverse = false): "on-track" | "watch" | "review" {
  if (value === null) return "review";
  const score = inverse ? -value : value;
  const goodScore = inverse ? -good : good;
  const watchScore = inverse ? -watch : watch;
  if (score >= goodScore) return "on-track";
  if (score >= watchScore) return "watch";
  return "review";
}

function deriveMilestones(timeline: TeamTimelineSummary, draft: DraftAnalysis): PlaybookMilestone[] {
  const survivalStatus = milestoneStatus(timeline.riskyDeathsPerGame, 0.5, 1, true);
  const visionStatus = milestoneStatus(timeline.objectiveVisionRate, 70, 50);
  const fightStatus = milestoneStatus(timeline.fullRosterPresenceRate, 70, 50);
  return [
    {
      id: "survival",
      title: "Ne plus throw",
      status: survivalStatus,
      evidence: timeline.riskyDeathsPerGame === null ? "Pas assez de timelines pour estimer les morts à risque." : `${timeline.riskyDeathsPerGame} mort(s) à risque par partie.`,
      action: "Transformer chaque facecheck en appel d'information + binôme.",
      automated: true
    },
    {
      id: "vision",
      title: "Vision drake",
      status: visionStatus,
      evidence: timeline.objectiveVisionRate === null ? "Pas assez d'objectifs mesurables." : `${timeline.objectiveVisionRate} % des objectifs avec ward alliée dans les 90 s avant.`,
      action: "Reset et première ward à T−75 s.",
      automated: true
    },
    {
      id: "fights",
      title: "Teamfights engagés",
      status: fightStatus,
      evidence: timeline.fullRosterPresenceRate === null ? "Présence aux objectifs non mesurable." : `${timeline.fullRosterPresenceRate} % de présence roster complète autour des objectifs.`,
      action: "Utiliser ce proxy pour revoir les entrées groupées ; la qualité du fight reste à valider en VOD.",
      automated: false
    },
    {
      id: "draft",
      title: "Draft avec intention",
      status: draft.fullFiveGames >= 3 ? "watch" : "review",
      evidence: draft.fullFiveGames ? `${draft.fullFiveGames} parties avec les cinq joueurs du roster ont une composition classifiée.` : "Aucune partie à cinq joueurs du roster pour classer une composition.",
      action: "Avant la prochaine session, annoncez le plan de composition : engage, pick, scaling ou hybride.",
      automated: false
    }
  ];
}

function emptyTimelineSummary(): TeamTimelineSummary {
  return {
    games: 0,
    teamDeathsPerGame: null,
    riskyDeathsPerGame: null,
    deathWindows: emptyDeathWindows(),
    objectivesObserved: 0,
    objectivesSecured: 0,
    objectiveVisionRate: null,
    fullRosterPresenceRate: null,
    averageRosterPresenceRate: null,
    objectiveSetups: [],
    mapEvents: []
  };
}

function toObjectiveSetupAnalysis(timeline: TeamTimelineSummary): ObjectiveSetupAnalysis | null {
  if (!timeline.games || !timeline.objectiveSetups.length) return null;
  const recentObjectives: ObjectiveSetupEvent[] = timeline.objectiveSetups.map((setup) => ({
    matchId: setup.matchId,
    objective: setup.objective === "Héraut" ? "Herald" : setup.objective,
    timestampSeconds: setup.gameTimestampSeconds,
    wardsBefore: setup.wardsBefore,
    playersPresent: setup.presentPlayers,
    deathsBefore: setup.deathsBefore,
    ready: setup.ready
  }));
  return {
    sampledMatches: timeline.games,
    objectives: timeline.objectivesObserved,
    setupRate: timeline.objectiveVisionRate ?? 0,
    averageWardsBefore: round(recentObjectives.reduce((total, objective) => total + objective.wardsBefore, 0) / recentObjectives.length, 2),
    averagePlayersPresent: round(recentObjectives.reduce((total, objective) => total + objective.playersPresent, 0) / recentObjectives.length, 1),
    averageDeathsBefore: round(recentObjectives.reduce((total, objective) => total + objective.deathsBefore, 0) / recentObjectives.length, 2),
    recentObjectives
  };
}

export function analyzeTeamMatches(
  matches: SyncedMatch[],
  timelines: Map<string, RiotMatchTimeline> = new Map(),
  championNames: Record<number, string> = {},
  rosterSize = 5
): TeamAnalysis {
  const summary = summarizeTeamMatches(matches);
  const playerTotals = new Map<string, {
    player: RiotParticipant;
    stats: MatchStatsTotals;
    timeline: TimelineTotals;
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
    stats: MatchStatsTotals;
    timeline: TimelineTotals;
  }>();

  let timelineGames = 0;
  let teamDeaths = 0;
  let riskyDeaths = 0;
  const deathWindows = emptyDeathWindows();
  let objectivesObserved = 0;
  let objectivesSecured = 0;
  let objectivesWithVision = 0;
  let objectivesWithFullRoster = 0;
  let rosterSlotsPresent = 0;
  let rosterSlotsPossible = 0;
  const objectiveSetups: ObjectiveSetup[] = [];
  const mapEvents: MapReviewEvent[] = [];

  for (const match of matches) {
    const minutes = Math.max(match.gameDurationSeconds / 60, 1);
    const matchTimeline = timelines.get(match.id);
    const timelineResult = matchTimeline ? computeMatchTimeline(match, matchTimeline) : null;
    if (timelineResult) {
      timelineGames += 1;
      teamDeaths += timelineResult.teamDeaths;
      riskyDeaths += timelineResult.riskyDeaths;
      for (const window of Object.keys(deathWindows) as Array<keyof DeathWindows>) deathWindows[window] += timelineResult.deathWindows[window];
      objectivesObserved += timelineResult.objectivesObserved;
      objectivesSecured += timelineResult.objectivesSecured;
      objectivesWithVision += timelineResult.objectivesWithVision;
      objectivesWithFullRoster += timelineResult.objectivesWithFullRoster;
      rosterSlotsPresent += timelineResult.rosterSlotsPresent;
      rosterSlotsPossible += timelineResult.rosterSlotsPossible;
      objectiveSetups.push(...timelineResult.objectiveSetups);
      mapEvents.push(...timelineResult.mapEvents);
    }
    for (const player of match.teamParticipants) {
      const existingPlayer = playerTotals.get(player.puuid) ?? {
        player,
        stats: emptyMatchStatsTotals(),
        timeline: emptyTimelineTotals()
      };
      existingPlayer.player = player;
      addMatchStats(existingPlayer.stats, player, match.teamKills, minutes);
      const metric = timelineResult?.players.get(player.puuid);
      if (metric) addTimelineMetric(existingPlayer.timeline, metric);
      playerTotals.set(player.puuid, existingPlayer);

      const role = normalizeRole(player.teamPosition ?? player.individualPosition);
      const playerRoleKey = `${player.puuid}:${role}`;
      const existingPlayerRole = playerRoleTotals.get(playerRoleKey) ?? {
        playerPuuid: player.puuid,
        role,
        stats: emptyMatchStatsTotals(),
        timeline: emptyTimelineTotals()
      };
      addMatchStats(existingPlayerRole.stats, player, match.teamKills, minutes);
      if (metric) addTimelineMetric(existingPlayerRole.timeline, metric);
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

  const timeline: TeamTimelineSummary = timelineGames ? {
    games: timelineGames,
    teamDeathsPerGame: round(teamDeaths / timelineGames, 2),
    riskyDeathsPerGame: round(riskyDeaths / timelineGames, 2),
    deathWindows: {
      early: round(deathWindows.early / timelineGames, 2),
      setup: round(deathWindows.setup / timelineGames, 2),
      throw: round(deathWindows.throw / timelineGames, 2),
      late: round(deathWindows.late / timelineGames, 2)
    },
    objectivesObserved,
    objectivesSecured,
    objectiveVisionRate: objectivesObserved ? round((objectivesWithVision / objectivesObserved) * 100) : null,
    fullRosterPresenceRate: objectivesObserved ? round((objectivesWithFullRoster / objectivesObserved) * 100) : null,
    averageRosterPresenceRate: rosterSlotsPossible ? round((rosterSlotsPresent / rosterSlotsPossible) * 100) : null,
    objectiveSetups: objectiveSetups.sort((left, right) => (right.gameStartedAt ?? 0) - (left.gameStartedAt ?? 0) || left.gameTimestampSeconds - right.gameTimestampSeconds),
    mapEvents: mapEvents.sort((left, right) => (right.gameStartedAt ?? 0) - (left.gameStartedAt ?? 0) || left.timestampSeconds - right.timestampSeconds)
  } : emptyTimelineSummary();

  const playerRoles = [...playerRoleTotals.values()]
    .map(({ playerPuuid, role, stats, timeline: timelineTotals }) => ({
      playerPuuid,
      role,
      games: stats.games,
      winRate: round((stats.wins / stats.games) * 100),
      kda: round((stats.kills + stats.assists) / Math.max(stats.deaths, 1)),
      goldPerMinute: Math.round(stats.gold / stats.minutes),
      csPerMinute: round(stats.cs / stats.minutes),
      visionPerMinute: round(stats.vision / stats.minutes, 2),
      matchStats: individualMatchStats(stats),
      timeline: timelinePlayerStats(timelineTotals)
    }))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
  const dominantRoleByPlayer = new Map<string, Role>();
  for (const playerRole of playerRoles) {
    if (!dominantRoleByPlayer.has(playerRole.playerPuuid)) dominantRoleByPlayer.set(playerRole.playerPuuid, playerRole.role);
  }

  const players = [...playerTotals.values()]
    .map(({ player, stats, timeline: timelineTotals }) => ({
      puuid: player.puuid,
      displayName: displayName(player),
      riotId: riotId(player),
      role: dominantRoleByPlayer.get(player.puuid) ?? "FILL",
      games: stats.games,
      winRate: round((stats.wins / stats.games) * 100),
      kda: round((stats.kills + stats.assists) / Math.max(stats.deaths, 1)),
      goldPerMinute: Math.round(stats.gold / stats.minutes),
      csPerMinute: round(stats.cs / stats.minutes),
      visionPerMinute: round(stats.vision / stats.minutes, 2),
      matchStats: individualMatchStats(stats),
      timeline: timelinePlayerStats(timelineTotals)
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
  const draft = analyzeDraft(matches, championNames, rosterSize);
  const milestones = deriveMilestones(timeline, draft);
  const insights = deriveInsights(summary, timeline);
  const priority = insights.find((insight) => insight.type === "priority") ?? insights[0];
  const sessionReview = priority ? { title: priority.title, evidence: priority.detail, nextAction: priority.action } : null;

  return { summary, players, playerRoles, champions, timeline, objectiveSetup: toObjectiveSetupAnalysis(timeline), milestones, draft, sessionReview, insights };
}

export function analyzeIndividualMatches(rawMatches: RiotMatch[], rosterPuuids: Set<string>, teamAnalysis: TeamAnalysis): IndividualAnalysis {
  const playerTotals = new Map<string, { player: RiotParticipant; stats: MatchStatsTotals }>();
  const playerRoleTotals = new Map<string, { playerPuuid: string; role: Role; stats: MatchStatsTotals }>();
  const championTotals = new Map<string, { playerPuuid: string; champion: string; role: Role; games: number; wins: number; kills: number; deaths: number; assists: number }>();

  for (const match of rawMatches) {
    const minutes = Math.max(match.info.gameDuration / 60, 1);
    for (const player of match.info.participants) {
      if (!rosterPuuids.has(player.puuid)) continue;
      const teamKills = match.info.participants.filter((participant) => participant.teamId === player.teamId).reduce((total, participant) => total + participant.kills, 0);
      const playerTotal = playerTotals.get(player.puuid) ?? { player, stats: emptyMatchStatsTotals() };
      playerTotal.player = player;
      addMatchStats(playerTotal.stats, player, teamKills, minutes);
      playerTotals.set(player.puuid, playerTotal);

      const role = normalizeRole(player.teamPosition ?? player.individualPosition);
      const playerRoleKey = `${player.puuid}:${role}`;
      const roleTotal = playerRoleTotals.get(playerRoleKey) ?? { playerPuuid: player.puuid, role, stats: emptyMatchStatsTotals() };
      addMatchStats(roleTotal.stats, player, teamKills, minutes);
      playerRoleTotals.set(playerRoleKey, roleTotal);

      const championKey = `${player.puuid}:${role}:${player.championName}`;
      const championTotal = championTotals.get(championKey) ?? { playerPuuid: player.puuid, champion: player.championName, role, games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      championTotal.games += 1;
      championTotal.wins += Number(player.win);
      championTotal.kills += player.kills;
      championTotal.deaths += player.deaths;
      championTotal.assists += player.assists;
      championTotals.set(championKey, championTotal);
    }
  }

  const timelineByPlayer = new Map(teamAnalysis.players.map((player) => [player.puuid, player.timeline]));
  const timelineByPlayerRole = new Map(teamAnalysis.playerRoles.map((player) => [`${player.playerPuuid}:${player.role}`, player.timeline]));
  const playerRoles = [...playerRoleTotals.values()]
    .map(({ playerPuuid, role, stats }) => ({
      playerPuuid,
      role,
      games: stats.games,
      winRate: round((stats.wins / stats.games) * 100),
      kda: round((stats.kills + stats.assists) / Math.max(stats.deaths, 1)),
      goldPerMinute: Math.round(stats.gold / stats.minutes),
      csPerMinute: round(stats.cs / stats.minutes),
      visionPerMinute: round(stats.vision / stats.minutes, 2),
      matchStats: individualMatchStats(stats),
      timeline: timelineByPlayerRole.get(`${playerPuuid}:${role}`) ?? emptyTimelinePlayerStats()
    }))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
  const dominantRoleByPlayer = new Map<string, Role>();
  for (const playerRole of playerRoles) {
    if (!dominantRoleByPlayer.has(playerRole.playerPuuid)) dominantRoleByPlayer.set(playerRole.playerPuuid, playerRole.role);
  }

  const players = [...playerTotals.values()]
    .map(({ player, stats }) => ({
      puuid: player.puuid,
      displayName: displayName(player),
      riotId: riotId(player),
      role: dominantRoleByPlayer.get(player.puuid) ?? "FILL",
      games: stats.games,
      winRate: round((stats.wins / stats.games) * 100),
      kda: round((stats.kills + stats.assists) / Math.max(stats.deaths, 1)),
      goldPerMinute: Math.round(stats.gold / stats.minutes),
      csPerMinute: round(stats.cs / stats.minutes),
      visionPerMinute: round(stats.vision / stats.minutes, 2),
      matchStats: individualMatchStats(stats),
      timeline: timelineByPlayer.get(player.puuid) ?? emptyTimelinePlayerStats()
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

  return { players, playerRoles, champions };
}

type DuoRoleTotals = {
  games: number;
  minutes: number;
  laneCs: number;
  jungleCs: number;
  vision: number;
};

type DuoPairTotals = {
  playerPuuids: [string, string];
  playerNames: [string, string];
  games: number;
  wins: number;
  durationSeconds: number;
  kills: number;
  deaths: number;
  assists: number;
  teamKills: number;
  damage: number;
  objectiveDamage: number;
  vision: number;
  controlWards: number;
  turretTakedowns: number;
  roleCombinations: Map<string, number>;
  roleTotals: Map<Role, DuoRoleTotals>;
};

const duoRoleOrder: Role[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY", "FILL"];

function duoRolesFromKey(key: string): [Role, Role] {
  const roles = key.split(":") as Role[];
  return [roles[0] ?? "FILL", roles[1] ?? "FILL"];
}

function duoLaneLabel(roles: [Role, Role]) {
  const [first, second] = roles;
  const has = (role: Role) => first === role || second === role;
  if (has("BOTTOM") && has("UTILITY")) return "Botlane · ADC + Support";
  if (has("TOP") && has("JUNGLE")) return "Topside · Top + Jungle";
  if (has("MIDDLE") && has("JUNGLE")) return "Mid/Jungle · tempo & roaming";
  return `${first === "FILL" ? "Flex" : first} + ${second === "FILL" ? "Flex" : second}`;
}

function duoContextualMetrics(pair: DuoPairTotals, roles: [Role, Role]): DuoContextualMetric[] {
  const minutes = Math.max(pair.durationSeconds / 60, 1);
  const byRole = (role: Role) => pair.roleTotals.get(role);
  const rolePerMinute = (role: Role, metric: "laneCs" | "jungleCs" | "vision") => {
    const totals = byRole(role);
    return totals ? round(totals[metric] / Math.max(totals.minutes, 1), 2) : 0;
  };
  const has = (role: Role) => roles.includes(role);
  const objectiveDamagePerMinute = round(pair.objectiveDamage / minutes);
  const damagePerMinute = round(pair.damage / minutes);
  const killParticipation = pair.teamKills ? round(((pair.kills + pair.assists) / pair.teamKills) * 100) : 0;

  if (has("BOTTOM") && has("UTILITY")) return [
    { label: "Farm ADC", value: rolePerMinute("BOTTOM", "laneCs"), unit: " CS/min", detail: "CS du joueur Bottom" },
    { label: "Vision Support", value: rolePerMinute("UTILITY", "vision"), unit: " / min", detail: "score de vision du Support" },
    { label: "Pression tours", value: round(pair.turretTakedowns / pair.games, 1), unit: " / game", detail: "tours prises par le duo" }
  ];
  if (has("TOP") && has("JUNGLE")) return [
    { label: "Farm Top", value: rolePerMinute("TOP", "laneCs"), unit: " CS/min", detail: "CS du joueur Top" },
    { label: "Farm Jungle", value: rolePerMinute("JUNGLE", "jungleCs"), unit: " CS jungle/min", detail: "monstres du Jungler" },
    { label: "Dégâts objectifs", value: objectiveDamagePerMinute, unit: " / min", detail: "pression Topside cumulée" }
  ];
  if (has("MIDDLE") && has("JUNGLE")) return [
    { label: "Farm Mid", value: rolePerMinute("MIDDLE", "laneCs"), unit: " CS/min", detail: "CS du joueur Mid" },
    { label: "Farm Jungle", value: rolePerMinute("JUNGLE", "jungleCs"), unit: " CS jungle/min", detail: "monstres du Jungler" },
    { label: "Pression combat", value: damagePerMinute, unit: " dégâts/min", detail: "dégâts champions cumulés" }
  ];
  return [
    { label: "Implication kills", value: killParticipation, unit: " %", detail: "kills + assists du duo" },
    { label: "Dégâts objectifs", value: objectiveDamagePerMinute, unit: " / min", detail: "dégâts cumulés aux objectifs" },
    { label: "Vision cumulée", value: round(pair.vision / minutes, 2), unit: " / min", detail: "score de vision des deux joueurs" }
  ];
}

export function analyzeDuoMatches(matches: SyncedMatch[], championNames: Record<number, string> = {}): DuoAnalysis {
  const analysis = analyzeTeamMatches(matches, new Map(), championNames, 2);
  const pairTotals = new Map<string, DuoPairTotals>();
  for (const match of matches) {
    const pair = [...match.teamParticipants].sort((left, right) => left.puuid.localeCompare(right.puuid));
    if (pair.length !== 2) continue;
    const key = `${pair[0]!.puuid}:${pair[1]!.puuid}`;
    const total = pairTotals.get(key) ?? {
      playerPuuids: [pair[0]!.puuid, pair[1]!.puuid],
      playerNames: [displayName(pair[0]!), displayName(pair[1]!)],
      games: 0,
      wins: 0,
      durationSeconds: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      teamKills: 0,
      damage: 0,
      objectiveDamage: 0,
      vision: 0,
      controlWards: 0,
      turretTakedowns: 0,
      roleCombinations: new Map(),
      roleTotals: new Map()
    };
    total.games += 1;
    total.wins += Number(pair[0]!.win);
    total.durationSeconds += match.gameDurationSeconds;
    total.teamKills += match.teamKills;
    const minutes = Math.max(match.gameDurationSeconds / 60, 1);
    const roles = pair
      .map((player) => normalizeRole(player.teamPosition ?? player.individualPosition))
      .sort((left, right) => duoRoleOrder.indexOf(left) - duoRoleOrder.indexOf(right)) as [Role, Role];
    const roleKey = roles.join(":");
    total.roleCombinations.set(roleKey, (total.roleCombinations.get(roleKey) ?? 0) + 1);
    for (const player of pair) {
      total.kills += player.kills;
      total.deaths += player.deaths;
      total.assists += player.assists;
      total.damage += player.totalDamageDealtToChampions ?? 0;
      total.objectiveDamage += player.damageDealtToObjectives ?? 0;
      total.vision += player.visionScore;
      total.controlWards += player.visionWardsBoughtInGame ?? 0;
      total.turretTakedowns += player.turretTakedowns ?? 0;
      const role = normalizeRole(player.teamPosition ?? player.individualPosition);
      const roleTotal = total.roleTotals.get(role) ?? { games: 0, minutes: 0, laneCs: 0, jungleCs: 0, vision: 0 };
      roleTotal.games += 1;
      roleTotal.minutes += minutes;
      roleTotal.laneCs += player.totalMinionsKilled;
      roleTotal.jungleCs += player.neutralMinionsKilled;
      roleTotal.vision += player.visionScore;
      total.roleTotals.set(role, roleTotal);
    }
    pairTotals.set(key, total);
  }
  const pairs = [...pairTotals.values()]
    .map((pair) => {
      const roleKey = [...pair.roleCombinations.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? "FILL:FILL";
      const roles = duoRolesFromKey(roleKey);
      const minutes = Math.max(pair.durationSeconds / 60, 1);
      return {
        playerPuuids: pair.playerPuuids,
        playerNames: pair.playerNames,
        roles,
        lane: duoLaneLabel(roles),
        games: pair.games,
        wins: pair.wins,
        winRate: round((pair.wins / pair.games) * 100),
        averageDurationMinutes: round(pair.durationSeconds / pair.games / 60),
        combinedKda: round((pair.kills + pair.assists) / Math.max(pair.deaths, 1)),
        killParticipation: pair.teamKills ? round(((pair.kills + pair.assists) / pair.teamKills) * 100) : null,
        damagePerMinute: round(pair.damage / minutes),
        objectiveDamagePerMinute: round(pair.objectiveDamage / minutes),
        visionPerMinute: round(pair.vision / minutes, 2),
        controlWardsPerGame: round(pair.controlWards / pair.games, 1),
        turretTakedownsPerGame: round(pair.turretTakedowns / pair.games, 1),
        contextualMetrics: duoContextualMetrics(pair, roles)
      };
    })
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
  return { summary: analysis.summary, players: analysis.players, playerRoles: analysis.playerRoles, champions: analysis.champions, pairs };
}

export { timelineWindowLabels };
