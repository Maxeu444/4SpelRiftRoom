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
};

const timelineWindowLabels = {
  early: "0–10 min",
  setup: "10–20 min",
  throw: "20–25 min",
  late: "25+ min"
} as const;

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
  const wardEvents = events.filter((event) => event.type === "WARD_PLACED" && event.creatorId && playerByParticipantId.has(event.creatorId));
  for (const ward of wardEvents) {
    const player = playerByParticipantId.get(ward.creatorId!);
    if (player) metrics.get(player.puuid)!.wards += 1;
  }

  let teamDeaths = 0;
  let riskyDeaths = 0;
  const deathWindows = emptyDeathWindows();
  for (const event of events) {
    if (event.type !== "CHAMPION_KILL" || !event.victimId) continue;
    const victim = playerByParticipantId.get(event.victimId);
    if (!victim?.participantId) continue;
    const metric = metrics.get(victim.puuid)!;
    metric.deaths += 1;
    teamDeaths += 1;
    deathWindows[deathWindow(event.timestamp)] += 1;
    const frame = closestFrame(frames, event.timestamp);
    const victimPosition = participantFrame(frame, victim.participantId)?.position;
    const nearbyTeammate = [...playerByParticipantId.entries()].some(([participantId, player]) => {
      if (player.puuid === victim.puuid) return false;
      const teammatePosition = participantFrame(frame, participantId)?.position;
      const teammateDistance = distance(victimPosition, teammatePosition);
      return teammateDistance !== null && teammateDistance <= 2_500;
    });
    const nearbyWard = wardEvents.some((ward) => {
      if (ward.timestamp < event.timestamp - 90_000 || ward.timestamp > event.timestamp) return false;
      const wardDistance = distance(victimPosition, ward.position);
      return wardDistance !== null && wardDistance <= 2_500;
    });
    const objectiveSoon = objectives.some((objective) => objective.timestamp >= event.timestamp && objective.timestamp <= event.timestamp + 90_000);
    if ((!nearbyTeammate && !nearbyWard) || (!nearbyTeammate && objectiveSoon)) {
      metric.riskyDeaths += 1;
      riskyDeaths += 1;
    }
  }

  let objectivesSecured = 0;
  let objectivesWithVision = 0;
  let objectivesWithFullRoster = 0;
  let rosterSlotsPresent = 0;
  let rosterSlotsPossible = 0;
  const objectiveSetups: ObjectiveSetup[] = [];
  const creditedWards = new Set<string>();
  const teamId = match.teamParticipants[0]?.teamId;
  for (const objective of objectives) {
    if (!objective.position) continue;
    const frame = closestFrame(frames, objective.timestamp);
    const nearbyWards = wardEvents.filter((ward) => {
      if (ward.timestamp < objective.timestamp - 90_000 || ward.timestamp > objective.timestamp) return false;
      const wardDistance = distance(ward.position, objective.position);
      return wardDistance !== null && wardDistance <= 2_500;
    });
    if (nearbyWards.length) objectivesWithVision += 1;
    for (const ward of nearbyWards) {
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
    if (objective.killerTeamId === teamId || (objective.killerId && playerByParticipantId.has(objective.killerId))) objectivesSecured += 1;
    const deathsBefore = events.filter((event) => event.type === "CHAMPION_KILL" && event.victimId && playerByParticipantId.has(event.victimId) && event.timestamp >= objective.timestamp - 60_000 && event.timestamp <= objective.timestamp).length;
    const label = objectiveLabel(objective);
    if (label) {
      const requiredPresence = Math.min(4, playerByParticipantId.size);
      objectiveSetups.push({
        matchId: match.id,
        gameStartedAt: match.gameStartedAt,
        gameDurationSeconds: match.gameDurationSeconds,
        teamWon: Boolean(match.teamParticipants[0]?.win),
        objective: label,
        gameTimestampSeconds: Math.round(objective.timestamp / 1_000),
        wardsBefore: nearbyWards.length,
        presentPlayers,
        rosterPlayers: playerByParticipantId.size,
        deathsBefore,
        ready: nearbyWards.length > 0 && presentPlayers >= requiredPresence && deathsBefore === 0
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
    objectiveSetups
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
    objectiveSetups: []
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
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    gold: number;
    cs: number;
    vision: number;
    minutes: number;
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
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    gold: number;
    cs: number;
    vision: number;
    minutes: number;
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
    }
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
        minutes: 0,
        timeline: emptyTimelineTotals()
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
      const metric = timelineResult?.players.get(player.puuid);
      if (metric) addTimelineMetric(existingPlayer.timeline, metric);
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
        minutes: 0,
        timeline: emptyTimelineTotals()
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
    objectiveSetups: objectiveSetups.sort((left, right) => (right.gameStartedAt ?? 0) - (left.gameStartedAt ?? 0) || left.gameTimestampSeconds - right.gameTimestampSeconds)
  } : emptyTimelineSummary();

  const playerRoles = [...playerRoleTotals.values()]
    .map(({ playerPuuid, role, games, wins, kills, deaths, assists, gold, cs, vision, minutes, timeline: timelineTotals }) => ({
      playerPuuid,
      role,
      games,
      winRate: round((wins / games) * 100),
      kda: round((kills + assists) / Math.max(deaths, 1)),
      goldPerMinute: Math.round(gold / minutes),
      csPerMinute: round(cs / minutes),
      visionPerMinute: round(vision / minutes, 2),
      timeline: timelinePlayerStats(timelineTotals)
    }))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
  const dominantRoleByPlayer = new Map<string, Role>();
  for (const playerRole of playerRoles) {
    if (!dominantRoleByPlayer.has(playerRole.playerPuuid)) dominantRoleByPlayer.set(playerRole.playerPuuid, playerRole.role);
  }

  const players = [...playerTotals.values()]
    .map(({ player, games, wins, kills, deaths, assists, gold, cs, vision, minutes, timeline: timelineTotals }) => ({
      puuid: player.puuid,
      displayName: displayName(player),
      riotId: riotId(player),
      role: dominantRoleByPlayer.get(player.puuid) ?? "FILL",
      games,
      winRate: round((wins / games) * 100),
      kda: round((kills + assists) / Math.max(deaths, 1)),
      goldPerMinute: Math.round(gold / minutes),
      csPerMinute: round(cs / minutes),
      visionPerMinute: round(vision / minutes, 2),
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

export { timelineWindowLabels };
