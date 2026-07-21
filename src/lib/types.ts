export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "FILL";

export type Member = {
  id: string;
  summoner: string;
  riotId: string;
  role: Role;
  champion: string;
  rank: string;
  color: string;
};

export type TeamStats = {
  matches: number;
  winRate: number;
  averageDuration: number;
  goldPerMinute: number;
  csPerMinute: number;
  visionPerMinute: number;
  trend: number;
};

export type PlayerStat = {
  memberId: string;
  games: number;
  winRate: number;
  kda: number;
  goldPerMinute: number;
  csPerMinute: number;
  visionPerMinute: number;
  trend: number;
};

export type ChampionStat = {
  champion: string;
  role: Role;
  games: number;
  winRate: number;
  kda: number;
  score: number;
};

export type MatchRow = {
  id: string;
  result: "Victoire" | "Défaite";
  duration: string;
  lineup: string[];
  composition: string;
  playedAt: string;
};

export type CoachingInsight = {
  type: "priority" | "success" | "watch";
  title: string;
  detail: string;
  action: string;
};

export type DashboardData = {
  teamName: string;
  periodLabel: string;
  members: Member[];
  teamStats: TeamStats;
  players: PlayerStat[];
  champions: ChampionStat[];
  matches: MatchRow[];
  insights: CoachingInsight[];
};

