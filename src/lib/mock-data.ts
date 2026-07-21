import type { DashboardData } from "./types";

export const dashboardData: DashboardData = {
  teamName: "4Spel",
  periodLabel: "30 derniers jours",
  members: [
    { id: "top", summoner: "Aery", riotId: "Aery#EUW", role: "TOP", champion: "Gnar", rank: "Emerald II", color: "#a78bfa" },
    { id: "jungle", summoner: "Kiro", riotId: "Kiro#EUW", role: "JUNGLE", champion: "Viego", rank: "Emerald I", color: "#34d399" },
    { id: "mid", summoner: "Nox", riotId: "Nox#EUW", role: "MIDDLE", champion: "Ahri", rank: "Diamond IV", color: "#f472b6" },
    { id: "bot", summoner: "Luma", riotId: "Luma#EUW", role: "BOTTOM", champion: "Jinx", rank: "Emerald I", color: "#fb923c" },
    { id: "support", summoner: "Venn", riotId: "Venn#EUW", role: "UTILITY", champion: "Rakan", rank: "Platinum I", color: "#60a5fa" }
  ],
  teamStats: {
    matches: 34,
    winRate: 61.8,
    averageDuration: 31.4,
    goldPerMinute: 398,
    csPerMinute: 5.7,
    visionPerMinute: 1.42,
    trend: 12.4
  },
  players: [
    { memberId: "top", games: 26, winRate: 57.7, kda: 2.6, goldPerMinute: 391, csPerMinute: 6.7, visionPerMinute: 0.58, trend: 5.2 },
    { memberId: "jungle", games: 34, winRate: 61.8, kda: 3.2, goldPerMinute: 381, csPerMinute: 4.5, visionPerMinute: 1.34, trend: 14.1 },
    { memberId: "mid", games: 30, winRate: 63.3, kda: 3.8, goldPerMinute: 412, csPerMinute: 7.4, visionPerMinute: 0.77, trend: 10.8 },
    { memberId: "bot", games: 29, winRate: 58.6, kda: 3.5, goldPerMinute: 425, csPerMinute: 7.1, visionPerMinute: 0.71, trend: -3.4 },
    { memberId: "support", games: 33, winRate: 60.6, kda: 3.9, goldPerMinute: 278, csPerMinute: 1.1, visionPerMinute: 3.69, trend: 18.8 }
  ],
  champions: [
    { champion: "Ahri", role: "MIDDLE", games: 10, winRate: 80, kda: 4.7, score: 92 },
    { champion: "Viego", role: "JUNGLE", games: 11, winRate: 72.7, kda: 3.8, score: 88 },
    { champion: "Rakan", role: "UTILITY", games: 12, winRate: 66.7, kda: 4.1, score: 84 },
    { champion: "Gnar", role: "TOP", games: 9, winRate: 55.6, kda: 2.4, score: 69 },
    { champion: "Jinx", role: "BOTTOM", games: 11, winRate: 54.5, kda: 3.1, score: 66 }
  ],
  matches: [
    { id: "EUW1_742819304", result: "Victoire", duration: "28:47", lineup: ["Aery", "Kiro", "Nox", "Luma", "Venn"], composition: "Gnar · Viego · Ahri · Jinx · Rakan", playedAt: "Hier, 22:14" },
    { id: "EUW1_742795028", result: "Victoire", duration: "34:12", lineup: ["Aery", "Kiro", "Nox", "Luma", "Venn"], composition: "Ornn · Sejuani · Syndra · Kai'Sa · Nautilus", playedAt: "Hier, 21:31" },
    { id: "EUW1_742760921", result: "Défaite", duration: "37:03", lineup: ["Aery", "Kiro", "Nox", "Luma"], composition: "Renekton · Viego · Ahri · Aphelios", playedAt: "Samedi, 23:05" },
    { id: "EUW1_742732880", result: "Victoire", duration: "26:38", lineup: ["Kiro", "Nox", "Luma", "Venn"], composition: "Maokai · Taliyah · Xayah · Rakan", playedAt: "Samedi, 22:18" }
  ],
  insights: [
    { type: "success", title: "Votre noyau engage convertit bien", detail: "Avec Rakan + Viego, vous gagnez 8 parties sur 11 et terminez 4 min 38 plus vite que votre moyenne.", action: "Préparez deux drafts autour de cette entrée de fight pour le Clash." },
    { type: "priority", title: "La vision chute après 20 minutes", detail: "Votre vision/min descend de 1,42 à 1,07 dans les défaites longues. Les objectifs tardifs sont votre premier point de rupture.", action: "À 18 min, placez un timer collectif : reset, wards profondes, puis setup du prochain objectif." },
    { type: "watch", title: "Le bot perd en rendement sur les 5 dernières", detail: "CS/min de Luma : 7,1 sur 30 jours, 5,9 sur les 5 dernières. L'écart apparaît dès la 14e minute.", action: "Revoir 2 VODs : gestion de vague avant dragon et recall synchronisé avec le support." }
  ]
};
