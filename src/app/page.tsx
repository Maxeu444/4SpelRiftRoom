"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChampionAnalysis, ObjectiveSetup, ObjectiveSetupAnalysis, PlayerAnalysis, SyncedMatch, TeamAnalysis, TimelinePlayerStats } from "@/lib/analytics";
import type { ScoutingReport } from "@/lib/scouting";
import type { CoachingInsight, Role } from "@/lib/types";

const defaultRoster = `Maxeu444#EUW
Roadagain#Jojo
Meteor#HOLY
Tasodo#RELL
shinyakoo#EUW`;

const roleLabels: Record<Role, string> = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support", FILL: "Flex"
};

const roleColors: Record<Role, string> = {
  TOP: "#e17845", JUNGLE: "#dfe13b", MIDDLE: "#514fe1", BOTTOM: "#69cad2", UTILITY: "#b5a9ff", FILL: "#dedbea"
};

type SyncRosterPlayer = { puuid: string; gameName: string; tagLine: string };

type SyncResult = {
  roster: SyncRosterPlayer[];
  matches: SyncedMatch[];
  analysis: TeamAnalysis;
  scanned: { requestedMatchesPerPlayer: number; candidateMatches: number; retainedMatches: number; retainedTimelines: number };
};

const sessionFocusAreas = [
  { id: "communication", label: "N1", title: "Communication", detail: "Comms courtes : cooldowns, information utile et une seule voix pendant le fight." },
  { id: "vision", label: "N2", title: "Vision avant objectifs", detail: "Arriver sur la zone 30 à 45 secondes avant le spawn et nettoyer la vision adverse." },
  { id: "waves", label: "N3", title: "État des waves", detail: "Préparer push, recall et roam avant de quitter une lane." },
  { id: "setup", label: "N4", title: "Setup d'objectifs", detail: "Vision, présence des cinq joueurs, puis objectif ou fight favorable." },
  { id: "teamfight", label: "N5", title: "Teamfight de compo", detail: "Identifier l'engage, le follow-up et la cible prioritaire." },
  { id: "draft", label: "N6", title: "Draft & scouting", detail: "Préparer une compo cohérente, les bans ciblés et un plan B." }
] as const;

type SessionFocusId = (typeof sessionFocusAreas)[number]["id"];
type CallerDomain = "macro" | "engage" | "draft";
type CallerAssignments = Partial<Record<CallerDomain, string>>;
type ChampionTrack = "unclassified" | "competition" | "progression";
type ChampionTrackAssignments = Record<string, ChampionTrack>;
type PlayerDevelopmentAxes = Record<string, string>;
type TrainingStepId = "checkin" | "warmup" | "games" | "review" | "close";
type TrainingChecklist = Record<TrainingStepId, boolean>;
type TrainingSessionStatus = "planning" | "running" | "closed";
type TeamMilestoneId = "foundation" | "vision" | "teamfight" | "draft";
type TeamMilestoneProgress = Record<TeamMilestoneId, boolean>;
type ReviewDraft = { source: string; pattern: string; action: string };
type ReviewEntry = ReviewDraft & { id: number };
type DraftPlan = { planA: string; planB: string; notes: string };
type WorkspaceState = {
  roleAssignments: Record<string, Role>;
  callerAssignments: CallerAssignments;
  sessionFocus: SessionFocusId | "";
  playbookPlayerId: string;
  championTracks: ChampionTrackAssignments;
  playerAxes: PlayerDevelopmentAxes;
  trainingStatus: TrainingSessionStatus;
  trainingGoal: string;
  trainingChecklist: TrainingChecklist;
  milestoneProgress: TeamMilestoneProgress;
  reviews: ReviewEntry[];
  targetBans: string[];
  draftPlan: DraftPlan;
};

const callerDomains: { id: CallerDomain; label: string; description: string; preferredRoles: Role[] }[] = [
  { id: "macro", label: "Objectifs & tempo", description: "Décide du drake, héraut ou Baron à préparer.", preferredRoles: ["JUNGLE", "UTILITY", "MIDDLE"] },
  { id: "engage", label: "Engage & fights", description: "Une voix tranche le déclenchement du combat.", preferredRoles: ["UTILITY", "JUNGLE", "TOP"] },
  { id: "draft", label: "Draft", description: "Tient le fil de la sélection et les plans B.", preferredRoles: ["MIDDLE", "JUNGLE", "UTILITY"] }
];

const DEFAULT_RIOT_IDS = "Maxeu444#EUW\nRoadagain#Jojo\nMeteor#HOLY\nTasodo#RELL\nshinyakoo#EUW";
const REQUESTED_MATCH_HISTORY = 100;

const trainingTemplate: { id: TrainingStepId; label: string; duration: string; detail: string }[] = [
  { id: "checkin", label: "Check-in", duration: "10 min", detail: "Présences, énergie et un seul focus." },
  { id: "warmup", label: "Warm-up", duration: "1 game", detail: "Se dérouiller avant le bloc d'équipe." },
  { id: "games", label: "Bloc de jeu", duration: "60-90 min", detail: "Scrim ou full stack avec le chantier choisi." },
  { id: "review", label: "Review à chaud", duration: "15 min", detail: "Un schéma collectif, pas une liste de fautes." },
  { id: "close", label: "Clôture", duration: "2 min", detail: "Décider le prochain objectif." }
];

const emptyTrainingChecklist: TrainingChecklist = { checkin: false, warmup: false, games: false, review: false, close: false };
const emptyTeamMilestones: TeamMilestoneProgress = { foundation: false, vision: false, teamfight: false, draft: false };
const emptyReviewDraft: ReviewDraft = { source: "", pattern: "", action: "" };
const emptyDraftPlan: DraftPlan = { planA: "", planB: "", notes: "" };

const teamMilestones: { id: TeamMilestoneId; label: string; title: string; detail: string }[] = [
  { id: "foundation", label: "Palier 1", title: "Fondations stables", detail: "Les comms sont propres et l'équipe ne rend plus ses avances gratuitement." },
  { id: "vision", label: "Palier 2", title: "Vision avant drake", detail: "La routine de setup est respectée autour des objectifs." },
  { id: "teamfight", label: "Palier 3", title: "Teamfights maîtrisés", detail: "L'engage est suivi et l'équipe gagne les fights préparés." },
  { id: "draft", label: "Palier 4", title: "Draft avec intention", detail: "Les bans, la compo et les plans B sont préparés." }
];

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function formatPlayedAt(timestamp?: number) {
  if (!timestamp) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(timestamp));
}

function formatGameDateTime(timestamp?: number) {
  if (!timestamp) return "Date de partie indisponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(timestamp));
}

function formatGameClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function displayName(matchPlayer: SyncedMatch["teamParticipants"][number]) {
  return matchPlayer.riotIdGameName || matchPlayer.summonerName;
}

function formatMetric(value: number | null, suffix = "", digits = 0) {
  if (value === null) return "—";
  return `${value.toFixed(digits)}${suffix}`;
}

function farmLabels(timeline: TimelinePlayerStats, role: Role) {
  const jungle = role === "JUNGLE";
  return {
    tenLabel: jungle ? "Farm@10" : "CS@10",
    fifteenLabel: jungle ? "Farm@15" : "CS@15",
    ten: jungle ? timeline.farmAt10 : timeline.laneCsAt10,
    fifteen: jungle ? timeline.farmAt15 : timeline.laneCsAt15
  };
}

function riotPlayersFromText(text: string) {
  return text
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.lastIndexOf("#");
      return separator > 0 ? { gameName: entry.slice(0, separator).trim(), tagLine: entry.slice(separator + 1).trim() } : null;
    })
    .filter((player): player is { gameName: string; tagLine: string } => Boolean(player?.gameName && player.tagLine));
}

function PlayerCard({ player, role, active, onSelect }: { player: PlayerAnalysis; role: Role; active: boolean; onSelect: () => void }) {
  return (
    <button className={`player-card ${active ? "is-active" : ""}`} onClick={onSelect} type="button">
      <span className="member-orb" style={{ background: roleColors[role] }}>{player.displayName.slice(0, 1)}</span>
      <span className="player-info"><strong>{player.displayName}</strong><small>{roleLabels[role]} · {player.games} partie{player.games > 1 ? "s" : ""}</small></span>
      <span className="up">{player.kda} KDA</span>
    </button>
  );
}

function Insight({ insight }: { insight: CoachingInsight }) {
  const labels = { priority: "Priorité observée", success: "Point fort observé", watch: "Point à suivre" };
  return (
    <article className={`insight ${insight.type}`}>
      <span className="insight-dot" />
      <div><p className="eyebrow">{labels[insight.type]}</p><h3>{insight.title}</h3><p>{insight.detail}</p><div className="action">↗ {insight.action}</div></div>
    </article>
  );
}

function EmptyDashboard({ onSync, coaching = false }: { onSync: () => void; coaching?: boolean }) {
  return (
    <section className="panel empty-dashboard">
      <span className="empty-mark">4S</span>
      <div><p className="eyebrow">Rift Room attend vos données Riot</p><h2>{coaching ? "Synchronisez une équipe avant d'ouvrir le coaching" : "Aucune donnée d'équipe affichée"}</h2><p>Ajoutez 3 à 5 Riot ID. Rift Room analysera uniquement les parties réellement jouées ensemble, puis enrichira la session avec leurs timelines post-game.</p><button className="sync-button" type="button" onClick={onSync}>Synchroniser l'équipe</button></div>
    </section>
  );
}

function RolePicker({ player, role, onRoleChange }: { player: PlayerAnalysis; role: Role; onRoleChange: (role: Role) => void }) {
  return <section className="panel role-picker-panel"><div><p className="eyebrow">Rôle de référence</p><h2>Analyser {player.displayName} comme {roleLabels[role]}</h2><p>Les statistiques sont filtrées sur ce rôle, y compris les repères Timeline quand une timeline a été chargée.</p></div><label><span>Rôle analysé</span><select value={role} onChange={(event) => onRoleChange(event.target.value as Role)}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section>;
}

function RosterSelector({ players, selectedId, onSelectPlayer, onSync }: { players: PlayerAnalysis[]; selectedId: string; onSelectPlayer: (playerId: string) => void; onSync: () => void }) {
  const [open, setOpen] = useState(false);
  const selectedPlayer = players.find((player) => player.puuid === selectedId);
  return <div className="roster-selector"><button className="team-switch" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span className="team-avatar">4S</span><div><strong>{players.length ? selectedPlayer?.displayName ?? "Roster synchronisé" : "Roster 4Spel"}</strong><small>{players.length ? `${players.length} profils disponibles` : "Synchroniser pour analyser"}</small></div><span className="chevron">{open ? "⌃" : "⌄"}</span></button>{open && <div className="roster-dropdown">{players.length ? <><p>Profils joueur</p>{players.map((player) => <button className={player.puuid === selectedId ? "active" : ""} type="button" key={player.puuid} onClick={() => { onSelectPlayer(player.puuid); setOpen(false); }}><span className="roster-orb" style={{ background: roleColors[player.role] }}>{player.displayName.slice(0, 1)}</span><span><strong>{player.displayName}</strong><small>{roleLabels[player.role]} · {player.games} partie{player.games > 1 ? "s" : ""}</small></span><b>{player.winRate} %</b></button>)}</> : <><p>Profil individuel</p><span className="roster-empty">Synchronise le roster pour accéder aux statistiques de chaque joueur.</span><button className="roster-sync" type="button" onClick={() => { setOpen(false); onSync(); }}>Synchroniser le roster</button></>}</div>}</div>;
}

function ObjectiveSetupList({ setups }: { setups: ObjectiveSetup[] }) {
  const groups = new Map<string, ObjectiveSetup[]>();
  for (const setup of setups) groups.set(setup.matchId, [...(groups.get(setup.matchId) ?? []), setup]);
  if (!setups.length) return null;
  return <section className="objective-setups"><div className="objective-setups-head"><div><p className="eyebrow">Préparation par partie</p><h3>Revoir les setups dans leur contexte</h3></div><span>{groups.size} game{groups.size > 1 ? "s" : ""}</span></div><div className="objective-game-list">{[...groups.entries()].map(([matchId, gameSetups]) => { const game = gameSetups[0]!; return <article className="objective-game" key={matchId}><header><div><strong>{formatGameDateTime(game.gameStartedAt)}</strong><small>Partie {game.teamWon ? "gagnée" : "perdue"} · {formatDuration(game.gameDurationSeconds)}</small></div><span className={game.teamWon ? "game-win" : "game-loss"}>{game.teamWon ? "Victoire" : "Défaite"}</span></header><div className="objective-events">{gameSetups.map((setup, index) => <div className={`objective-event ${setup.ready ? "ready" : "needs-work"}`} key={`${setup.objective}-${setup.gameTimestampSeconds}-${index}`}><span className="objective-icon">{setup.objective === "Dragon" ? "D" : setup.objective === "Baron" ? "B" : "H"}</span><div><strong>{setup.objective} · {formatGameClock(setup.gameTimestampSeconds)}</strong><small>{setup.wardsBefore} ward{setup.wardsBefore > 1 ? "s" : ""} · {setup.presentPlayers}/{setup.rosterPlayers} présents · {setup.deathsBefore} mort{setup.deathsBefore > 1 ? "s" : ""} avant</small></div><span className="setup-status">{setup.ready ? "Prêt" : "À préparer"}</span></div>)}</div></article>; })}</div></section>;
}

function TeamTimelinePanel({ analysis }: { analysis: TeamAnalysis }) {
  const timeline = analysis.timeline;
  const windows = [
    ["0–10", timeline.deathWindows.early],
    ["10–20", timeline.deathWindows.setup],
    ["20–25", timeline.deathWindows.throw],
    ["25+", timeline.deathWindows.late]
  ] as const;
  const maxWindow = Math.max(...windows.map(([, value]) => value), 1);
  return (
    <section className="panel timeline-team">
      <div className="panel-head"><div><p className="eyebrow">Timeline · lecture collective</p><h2>Les fondamentaux avant le résultat</h2></div><span className="pill">{timeline.games} timeline{timeline.games > 1 ? "s" : ""}</span></div>
      {timeline.games ? <>
        <div className="timeline-cards">
          <article><span>Morts / partie</span><strong>{formatMetric(timeline.teamDeathsPerGame, "", 1)}</strong><small>tous membres du roster confondus</small></article>
          <article><span>Morts à risque</span><strong>{formatMetric(timeline.riskyDeathsPerGame, "", 1)}</strong><small>heuristique : isolement + information absente</small></article>
          <article><span>Vision objectif</span><strong>{formatMetric(timeline.objectiveVisionRate, "%")}</strong><small>position estimée du poseur · 90 s avant</small></article>
          <article><span>Roster complet</span><strong>{formatMetric(timeline.fullRosterPresenceRate, "%")}</strong><small>présent dans le rayon d'objectif</small></article>
        </div>
        <div className="death-windows"><div><strong>Fenêtres de morts</strong><small>moyenne par partie · ce n'est pas un verdict sur une mort individuelle</small></div><div className="window-bars">{windows.map(([label, value]) => <div className={`window-bar ${label === "20–25" ? "focus" : ""}`} key={label}><span>{label}</span><i><b style={{ width: `${Math.max((value / maxWindow) * 100, value ? 7 : 0)}%` }} /></i><strong>{value.toFixed(1)}</strong></div>)}</div></div>
        <p className="timeline-note">{timeline.objectivesSecured}/{timeline.objectivesObserved} objectifs majeurs ont été sécurisés. La présence provient de la dernière position Timeline disponible autour de l'événement.</p>
        <ObjectiveSetupList setups={timeline.objectiveSetups} />
      </> : <p className="empty-state">Aucune Timeline n'a pu être chargée pour cette synchronisation. Les statistiques Match restent disponibles ; relancez plus tard pour enrichir la lecture coaching.</p>}
    </section>
  );
}

function PlayerTimelineTable({ analysis, roleAssignments }: { analysis: TeamAnalysis; roleAssignments: Record<string, Role> }) {
  return <section className="panel player-timeline-table"><div className="panel-head"><div><p className="eyebrow">Par joueur · preuves Timeline</p><h2>Lane, vision et présence aux objectifs</h2></div><span className="pill">Post-game</span></div><div className="timeline-table-scroll"><div className="timeline-row timeline-label"><span>Joueur</span><span>Morts</span><span>À risque</span><span>CS@10</span><span>CS@15</span><span>Wards</span><span>Obj.</span></div>{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; const farm = farmLabels(player.timeline, role); return <div className="timeline-row" key={player.puuid}><span><strong>{player.displayName}</strong><small>{roleLabels[role]} · {player.timeline.timelineGames || "—"} timelines</small></span><span>{formatMetric(player.timeline.deathsPerGame, "", 1)}</span><span className={player.timeline.riskyDeathsPerGame !== null && player.timeline.riskyDeathsPerGame >= 1 ? "risk" : ""}>{formatMetric(player.timeline.riskyDeathsPerGame, "", 1)}</span><span><small className="mobile-label">{farm.tenLabel} </small>{formatMetric(farm.ten)}</span><span><small className="mobile-label">{farm.fifteenLabel} </small>{formatMetric(farm.fifteen)}</span><span>{formatMetric(player.timeline.wardsPerGame, "", 1)}</span><span>{formatMetric(player.timeline.objectiveParticipationRate, "%")}</span></div>; })}</div><p className="timeline-legend">« À risque » = mort avec joueur isolé et sans ward alliée proche récente, ou isolé juste avant un objectif. C'est une piste de review, pas une attribution automatique de faute.</p></section>;
}

function suggestedCaller(players: PlayerAnalysis[], roleAssignments: Record<string, Role>, preferredRoles: Role[]) {
  return players.find((player) => preferredRoles.includes(roleAssignments[player.puuid] ?? player.role))?.puuid ?? players[0]?.puuid ?? "";
}

function championTrackKey(champion: ChampionAnalysis) {
  return `${champion.playerPuuid}:${champion.role}:${champion.champion}`;
}

function PlayerPathway({ analysis, roleAssignments, selectedPlayerId, championTracks, playerAxes, onSelectPlayer, onChampionTrackChange, onAxisChange }: { analysis: TeamAnalysis; roleAssignments: Record<string, Role>; selectedPlayerId: string; championTracks: ChampionTrackAssignments; playerAxes: PlayerDevelopmentAxes; onSelectPlayer: (playerId: string) => void; onChampionTrackChange: (champion: ChampionAnalysis, track: ChampionTrack) => void; onAxisChange: (playerId: string, axis: string) => void }) {
  const player = analysis.players.find((candidate) => candidate.puuid === selectedPlayerId) ?? analysis.players[0];
  const role = roleAssignments[player.puuid] ?? player.role;
  const roleStats = analysis.playerRoles.find((stat) => stat.playerPuuid === player.puuid && stat.role === role);
  const champions = analysis.champions.filter((champion) => champion.playerPuuid === player.puuid && champion.role === role);
  const trackCounts = champions.reduce<Record<ChampionTrack, number>>((counts, champion) => {
    counts[championTracks[championTrackKey(champion)] ?? "unclassified"] += 1;
    return counts;
  }, { unclassified: 0, competition: 0, progression: 0 });

  return <section className="panel player-pathway">
    <div className="panel-head"><div><p className="eyebrow">Parcours joueur</p><h2>Compétition vs progression</h2></div><span className="pill">Picks Riot observés</span></div>
    <p className="pathway-copy">Un champion fiable est réservé au Clash. Un champion de progression sert à travailler un défaut précis, puis rejoint le pool compétition quand il est prêt.</p>
    <div className="pathway-tabs">{analysis.players.map((candidate) => { const candidateRole = roleAssignments[candidate.puuid] ?? candidate.role; return <button type="button" className={candidate.puuid === player.puuid ? "is-active" : ""} key={candidate.puuid} onClick={() => onSelectPlayer(candidate.puuid)}><span>{candidate.displayName.slice(0, 1)}</span><strong>{candidate.displayName}</strong><small>{roleLabels[candidateRole]}</small></button>; })}</div>
    <div className="pathway-grid">
      <section className="pathway-profile"><div className="pathway-heading"><span className="pathway-orb" style={{ background: roleColors[role] }}>{player.displayName.slice(0, 1)}</span><div><p className="eyebrow">{roleLabels[role]} · données Riot</p><h3>{player.displayName}</h3><p>{roleStats ? `${roleStats.games} partie${roleStats.games > 1 ? "s" : ""} · ${roleStats.winRate} % de victoire` : "Aucune partie retenue sur ce rôle"}</p></div></div><label className="axis-field"><span>Axe de progression</span><input value={playerAxes[player.puuid] ?? ""} onChange={(event) => onAxisChange(player.puuid, event.target.value)} placeholder="Ex. positionnement, vision, initiative…" /></label><div className="track-counts"><span><strong>{trackCounts.competition}</strong> compétition</span><span><strong>{trackCounts.progression}</strong> progression</span><span><strong>{trackCounts.unclassified}</strong> à classer</span></div></section>
      <section className="champion-paths"><div className="champion-paths-head"><div><p className="eyebrow">Pool réel · {roleLabels[role]}</p><h3>Qualifier les champions</h3></div><span>{champions.length} observé{champions.length > 1 ? "s" : ""}</span></div>{champions.length ? <div className="track-list">{champions.map((champion) => { const track = championTracks[championTrackKey(champion)] ?? "unclassified"; return <div className={`track-row ${track}`} key={championTrackKey(champion)}><span className="track-icon">{champion.champion.slice(0, 1)}</span><div><strong>{champion.champion}</strong><small>{champion.games} partie{champion.games > 1 ? "s" : ""} · {champion.winRate} % WR · {champion.kda} KDA</small></div><label><span>Statut</span><select value={track} onChange={(event) => onChampionTrackChange(champion, event.target.value as ChampionTrack)}><option value="unclassified">À classer</option><option value="competition">Compétition · Clash</option><option value="progression">Progression · entraînement</option></select></label></div>; })}</div> : <p className="pathway-empty">Aucun champion réel n'a été trouvé pour ce rôle dans les parties de groupe synchronisées. Modifiez le rôle de référence ou synchronisez davantage de parties.</p>}</section>
    </div>
  </section>;
}

function TrainingSession({ activeFocus, status, goal, checklist, onGoalChange, onToggleStep, onSessionAction }: { activeFocus?: (typeof sessionFocusAreas)[number]; status: TrainingSessionStatus; goal: string; checklist: TrainingChecklist; onGoalChange: (goal: string) => void; onToggleStep: (step: TrainingStepId) => void; onSessionAction: (action: "start" | "close" | "reset") => void }) {
  const completedSteps = trainingTemplate.filter((step) => checklist[step.id]).length;
  const action = status === "planning" ? "start" : status === "running" ? "close" : "reset";
  const actionLabel = status === "planning" ? "Démarrer la session" : status === "running" ? "Clôturer la session" : "Préparer la suivante";
  const statusLabel = status === "planning" ? "À préparer" : status === "running" ? "En cours" : "Terminée";

  return <section className="panel training-session">
    <div className="panel-head"><div><p className="eyebrow">Rituel d'entraînement</p><h2>La session, du brief à la review</h2></div><span className={`session-status ${status}`}>{statusLabel}</span></div>
    <div className="session-intent"><span>{activeFocus?.label ?? "00"}</span><div><p className="eyebrow">Chantier de cette session</p><h3>{activeFocus?.title ?? "Choisissez un focus ci-dessus"}</h3><input value={goal} onChange={(event) => onGoalChange(event.target.value)} placeholder="Objectif concret : ex. arriver 45 s avant chaque drake" /></div></div>
    <div className="session-checklist">{trainingTemplate.map((step, index) => <button type="button" aria-pressed={checklist[step.id]} className={checklist[step.id] ? "is-done" : ""} key={step.id} onClick={() => onToggleStep(step.id)}><span>{checklist[step.id] ? "✓" : String(index + 1).padStart(2, "0")}</span><div><strong>{step.label}</strong><small>{step.duration} · {step.detail}</small></div></button>)}</div>
    <div className="session-footer"><small>{completedSteps}/5 étapes cochées · les réglages de session ne sont pas encore sauvegardés.</small><button className="sync-button" type="button" disabled={action === "start" && !activeFocus} onClick={() => onSessionAction(action)}>{actionLabel}</button></div>
  </section>;
}

function TeamMilestoneTracker({ progress, onToggle }: { progress: TeamMilestoneProgress; onToggle: (milestone: TeamMilestoneId) => void }) {
  const completedCount = teamMilestones.filter((milestone) => progress[milestone.id]).length;
  return <section className="panel milestones-panel">
    <div className="panel-head"><div><p className="eyebrow">Progression d'équipe</p><h2>Les paliers à tenir dans la durée</h2></div><span className="pill">{completedCount}/4 validés</span></div>
    <p className="milestones-copy">Validez un palier seulement lorsqu'il tient sur plusieurs sessions. Le parcours reste séquentiel : les fondations avant la draft.</p>
    <div className="milestone-list">{teamMilestones.map((milestone, index) => { const complete = progress[milestone.id]; const unlocked = index === 0 || progress[teamMilestones[index - 1].id]; return <button type="button" aria-pressed={complete} className={`${complete ? "is-complete" : ""} ${!unlocked ? "is-locked" : ""}`} disabled={!unlocked} onClick={() => onToggle(milestone.id)} key={milestone.id}><span>{complete ? "✓" : String(index + 1)}</span><div><p className="eyebrow">{milestone.label}</p><h3>{milestone.title}</h3><p>{milestone.detail}</p></div><small>{complete ? "Validé" : unlocked ? "À travailler" : "Palier précédent requis"}</small></button>; })}</div>
  </section>;
}

function ReviewJournal({ draft, reviews, onDraftChange, onAdd, onRemove }: { draft: ReviewDraft; reviews: ReviewEntry[]; onDraftChange: (field: keyof ReviewDraft, value: string) => void; onAdd: () => void; onRemove: (id: number) => void }) {
  const canAdd = draft.pattern.trim().length > 0 && draft.action.trim().length > 0;
  return <section className="panel review-journal">
    <div className="panel-head"><div><p className="eyebrow">Review VOD</p><h2>Un schéma. Une action.</h2></div><span className="pill">Sans blâme</span></div>
    <p className="review-copy">Cherchez un schéma collectif, surtout dans les défaites, puis choisissez l'unique amélioration à travailler à la prochaine session.</p>
    <div className="review-form"><label><span>Partie / VOD <em>facultatif</em></span><input value={draft.source} onChange={(event) => onDraftChange("source", event.target.value)} placeholder="Ex. Clash 1, 21 juillet" /></label><label><span>Schéma observé</span><textarea value={draft.pattern} onChange={(event) => onDraftChange("pattern", event.target.value)} placeholder="Ex. nous arrivons séparés autour du drake" rows={3} /></label><label><span>Action suivante</span><textarea value={draft.action} onChange={(event) => onDraftChange("action", event.target.value)} placeholder="Ex. reset collectif 60 s avant le prochain objectif" rows={3} /></label><button className="full-button" type="button" disabled={!canAdd} onClick={onAdd}>Ajouter à la review</button></div>
    <div className="review-entries">{reviews.length ? reviews.map((review) => <article key={review.id}><div><p className="eyebrow">{review.source || "Review d'équipe"}</p><h3>{review.pattern}</h3><p><strong>À travailler :</strong> {review.action}</p></div><button type="button" aria-label="Supprimer cette review" onClick={() => onRemove(review.id)}>×</button></article>) : <p className="review-empty">Aucune review enregistrée pour cette session.</p>}</div>
  </section>;
}

function ObjectiveTimelinePanel({ objectiveSetup }: { objectiveSetup: ObjectiveSetupAnalysis | null }) {
  if (!objectiveSetup) return <section className="panel objective-timeline empty-timeline"><div><p className="eyebrow">Timeline Riot</p><h2>Pas encore de signal d'objectif</h2><p>La prochaine synchronisation lira les timelines des huit parties d'équipe les plus récentes pour mesurer les setups autour des drakes, hérauts et Barons.</p></div><span className="timeline-mark">T</span></section>;

  return <section className="panel objective-timeline">
    <div className="panel-head"><div><p className="eyebrow">Timeline Riot · {objectiveSetup.sampledMatches} parties</p><h2>Lecture des setups d'objectifs</h2></div><span className="pill">{objectiveSetup.setupRate} % prêts</span></div>
    <p className="timeline-copy">Un setup est considéré prêt lorsqu'une ward est posée, au moins quatre joueurs sont présents près de l'objectif et aucune mort d'équipe ne survient dans la minute précédente.</p>
    <div className="timeline-metrics"><span><strong>{objectiveSetup.objectives}</strong> objectifs lus</span><span><strong>{objectiveSetup.averagePlayersPresent}/5</strong> présence moyenne</span><span><strong>{objectiveSetup.averageWardsBefore}</strong> wards avant</span><span><strong>{objectiveSetup.averageDeathsBefore}</strong> morts avant</span></div>
    <div className="objective-events">{objectiveSetup.recentObjectives.map((objective, index) => <article className={objective.ready ? "is-ready" : ""} key={`${objective.matchId}:${objective.timestampSeconds}:${index}`}><span>{objective.objective === "Dragon" ? "D" : objective.objective === "Baron" ? "B" : "H"}</span><div><strong>{objective.objective} · {formatDuration(objective.timestampSeconds)}</strong><small>{objective.wardsBefore} ward{objective.wardsBefore > 1 ? "s" : ""} · {objective.playersPresent}/5 présents · {objective.deathsBefore} mort{objective.deathsBefore > 1 ? "s" : ""} avant</small></div><em>{objective.ready ? "Setup prêt" : "À préparer"}</em></article>)}</div>
  </section>;
}

function DraftScouting({ opponentIds, state, error, report, targetBans, draftPlan, onOpponentIdsChange, onScan, onToggleBan, onDraftPlanChange }: { opponentIds: string; state: "idle" | "loading" | "error"; error: string; report: ScoutingReport | null; targetBans: string[]; draftPlan: DraftPlan; onOpponentIdsChange: (value: string) => void; onScan: () => void; onToggleBan: (champion: string) => void; onDraftPlanChange: (field: keyof DraftPlan, value: string) => void }) {
  const opponentCount = riotPlayersFromText(opponentIds).length;
  return <section className="panel draft-scouting">
    <div className="panel-head"><div><p className="eyebrow">Draft & scouting</p><h2>Préparer le Clash avant la champ select</h2></div><span className="pill">Riot live</span></div>
    <p className="scouting-copy">Ajoutez un à cinq adversaires. Rift Room relève leurs champions réellement joués sur les huit dernières parties et vous aide à construire les bans et plans de draft.</p>
    <div className="scouting-form"><label><span>Riot ID adverses <em>un par ligne</em></span><textarea value={opponentIds} onChange={(event) => onOpponentIdsChange(event.target.value)} placeholder={"Adversaire 1#EUW\nAdversaire 2#EUW"} rows={4} /></label><button className="sync-button" type="button" disabled={state === "loading" || opponentCount < 1 || opponentCount > 5} onClick={onScan}>{state === "loading" ? "Scouting Riot en cours…" : "Analyser les adversaires"}</button></div>
    {state === "error" && <p className="form-error">{error}</p>}
    {report && <><div className="scout-summary"><span>{report.opponents.length} adversaire{report.opponents.length > 1 ? "s" : ""}</span><small>{report.sampledMatchesPerOpponent} parties Riot récentes par adversaire</small></div><div className="opponent-grid">{report.opponents.map((opponent) => <article className="opponent-card" key={opponent.puuid}><div className="opponent-head"><span>{opponent.displayName.slice(0, 1)}</span><div><strong>{opponent.displayName}</strong><small>{roleLabels[opponent.primaryRole]} · {opponent.games} partie{opponent.games > 1 ? "s" : ""}</small></div></div>{opponent.championPool.length ? <div className="scout-champions">{opponent.championPool.slice(0, 3).map((champion) => { const targeted = targetBans.includes(champion.champion); return <button className={targeted ? "is-targeted" : ""} type="button" key={`${opponent.puuid}:${champion.role}:${champion.champion}`} onClick={() => onToggleBan(champion.champion)}><span>{champion.champion.slice(0, 1)}</span><div><strong>{champion.champion}</strong><small>{champion.games} game{champion.games > 1 ? "s" : ""} · {champion.winRate} % WR</small></div><em>{targeted ? "Ban visé" : "Cibler"}</em></button>; })}</div> : <p className="scout-empty">Aucune partie exploitable dans cet échantillon.</p>}</article>)}</div><div className="draft-plan"><div><p className="eyebrow">Bans ciblés</p><div className="ban-list">{targetBans.length ? targetBans.map((champion) => <button type="button" key={champion} onClick={() => onToggleBan(champion)}>{champion} ×</button>) : <small>Sélectionnez des champions observés ci-dessus.</small>}</div></div><label><span>Plan A</span><textarea value={draftPlan.planA} onChange={(event) => onDraftPlanChange("planA", event.target.value)} placeholder="Compo, priorité de pick, condition de victoire…" rows={3} /></label><label><span>Plan B</span><textarea value={draftPlan.planB} onChange={(event) => onDraftPlanChange("planB", event.target.value)} placeholder="Réponse au ban ou au first pick adverse…" rows={3} /></label><label><span>Notes de champ select</span><textarea value={draftPlan.notes} onChange={(event) => onDraftPlanChange("notes", event.target.value)} placeholder="Informations à garder sous les yeux pendant la draft…" rows={3} /></label></div></>}
  </section>;
}

function PlaybookDashboard({ analysis, roleAssignments, callerAssignments, sessionFocus, selectedPlayerId, championTracks, playerAxes, trainingStatus, trainingGoal, trainingChecklist, milestoneProgress, reviewDraft, reviews, opponentIds, scoutingState, scoutingError, scoutingReport, targetBans, draftPlan, onCallerChange, onSessionFocusChange, onSelectPlayer, onChampionTrackChange, onAxisChange, onTrainingGoalChange, onToggleTrainingStep, onTrainingSessionAction, onToggleMilestone, onReviewDraftChange, onAddReview, onRemoveReview, onOpponentIdsChange, onScoutingScan, onToggleTargetBan, onDraftPlanChange, onSync }: { analysis: TeamAnalysis | null; roleAssignments: Record<string, Role>; callerAssignments: CallerAssignments; sessionFocus: SessionFocusId | ""; selectedPlayerId: string; championTracks: ChampionTrackAssignments; playerAxes: PlayerDevelopmentAxes; trainingStatus: TrainingSessionStatus; trainingGoal: string; trainingChecklist: TrainingChecklist; milestoneProgress: TeamMilestoneProgress; reviewDraft: ReviewDraft; reviews: ReviewEntry[]; opponentIds: string; scoutingState: "idle" | "loading" | "error"; scoutingError: string; scoutingReport: ScoutingReport | null; targetBans: string[]; draftPlan: DraftPlan; onCallerChange: (domain: CallerDomain, playerId: string) => void; onSessionFocusChange: (focus: SessionFocusId) => void; onSelectPlayer: (playerId: string) => void; onChampionTrackChange: (champion: ChampionAnalysis, track: ChampionTrack) => void; onAxisChange: (playerId: string, axis: string) => void; onTrainingGoalChange: (goal: string) => void; onToggleTrainingStep: (step: TrainingStepId) => void; onTrainingSessionAction: (action: "start" | "close" | "reset") => void; onToggleMilestone: (milestone: TeamMilestoneId) => void; onReviewDraftChange: (field: keyof ReviewDraft, value: string) => void; onAddReview: () => void; onRemoveReview: (id: number) => void; onOpponentIdsChange: (value: string) => void; onScoutingScan: () => void; onToggleTargetBan: (champion: string) => void; onDraftPlanChange: (field: keyof DraftPlan, value: string) => void; onSync: () => void }) {
  const players = analysis?.players ?? [];
  const activeFocus = sessionFocusAreas.find((focus) => focus.id === sessionFocus);

  return (
    <section className="playbook-view">
      <section className="playbook-hero">
        <div>
          <p className="eyebrow">4SPEL · PLAYBOOK COMPÉTITIF</p>
          <h2>Une équipe. <em>Un appel.</em><br />Un plan clair.</h2>
          <p>Notre identité : engager ensemble, préparer les objectifs et jouer les fights avec intention.</p>
        </div>
        <div className="playbook-badge"><span>IDENTITÉ</span><strong>ENGAGE<br />TEAMFIGHT</strong><small>RANKED · CLASH</small></div>
      </section>

      <section className="playbook-principles" aria-label="Principes directeurs">
        <div><span>01</span><p><strong>Un chantier à la fois</strong> pour chaque session.</p></div>
        <div><span>02</span><p><strong>L'information vient de tous,</strong> mais une seule voix tranche le fight.</p></div>
        <div><span>03</span><p><strong>La structure avant le résultat :</strong> setup propre, puis objectif.</p></div>
      </section>

      {!analysis || !players.length ? <section className="panel playbook-empty"><span className="empty-mark">4S</span><div><p className="eyebrow">Roster nécessaire</p><h2>Activez le playbook avec vos vrais joueurs</h2><p>Synchronisez l'équipe Riot afin d'attribuer les appels à votre roster, en tenant compte des rôles configurés.</p><button className="sync-button" type="button" onClick={onSync}>Synchroniser l'équipe</button></div></section> : <>
        <section className="panel session-focus">
          <div className="panel-head"><div><p className="eyebrow">Prochaine session</p><h2>Choisir le chantier du jour</h2></div><span className="pill">1 seul focus</span></div>
          <div className="focus-selection">
            <div className="focus-current"><span>{activeFocus?.label ?? "00"}</span><div><p className="eyebrow">Focus actif</p><h3>{activeFocus?.title ?? "À définir"}</h3><p>{activeFocus?.detail ?? "Sélectionnez le seul sujet que l'équipe travaillera à la prochaine session."}</p></div></div>
            <div className="focus-options">{sessionFocusAreas.map((focus) => <button type="button" aria-pressed={focus.id === sessionFocus} className={focus.id === sessionFocus ? "is-active" : ""} key={focus.id} onClick={() => onSessionFocusChange(focus.id)}><span>{focus.label}</span><strong>{focus.title}</strong></button>)}</div>
          </div>
        </section>

        <TrainingSession activeFocus={activeFocus} status={trainingStatus} goal={trainingGoal} checklist={trainingChecklist} onGoalChange={onTrainingGoalChange} onToggleStep={onToggleTrainingStep} onSessionAction={onTrainingSessionAction} />

        <section className="panel callers-panel">
          <div className="panel-head"><div><p className="eyebrow">Rôles & appels</p><h2>Décider à froid, exécuter simplement</h2></div><span className="pill">Roster Riot</span></div>
          <p className="callers-copy">Les suggestions suivent les rôles actuellement configurés. Elles restent modifiables : l'équipe choisit qui a la meilleure lecture dans chaque domaine.</p>
          <div className="caller-grid">{callerDomains.map((domain) => {
            const suggestion = suggestedCaller(players, roleAssignments, domain.preferredRoles);
            const assignedId = players.some((player) => player.puuid === callerAssignments[domain.id]) ? callerAssignments[domain.id] : suggestion;
            const assignedPlayer = players.find((player) => player.puuid === assignedId);
            const assignedRole = assignedPlayer ? roleAssignments[assignedPlayer.puuid] ?? assignedPlayer.role : "FILL";
            return <article className="caller-card" key={domain.id}><div><span className="caller-number">{domain.id === "macro" ? "01" : domain.id === "engage" ? "02" : "03"}</span><p className="eyebrow">{domain.label}</p><h3>{assignedPlayer?.displayName ?? "À attribuer"}</h3><p>{domain.description}</p></div><label><span>Responsable</span><select value={assignedId} onChange={(event) => onCallerChange(domain.id, event.target.value)}>{players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; return <option value={player.puuid} key={player.puuid}>{player.displayName} · {roleLabels[role]}</option>; })}</select></label><small>Suggestion rôle : {roleLabels[assignedRole]}</small></article>;
          })}</div>
        </section>

        <PlayerPathway analysis={analysis} roleAssignments={roleAssignments} selectedPlayerId={selectedPlayerId} championTracks={championTracks} playerAxes={playerAxes} onSelectPlayer={onSelectPlayer} onChampionTrackChange={onChampionTrackChange} onAxisChange={onAxisChange} />

        <section className="objective-routine">
          <div className="routine-heading"><p className="eyebrow">Routine d'objectif</p><h2>Le setup avant le combat</h2></div>
          <ol><li><span>1</span><div><strong>Nettoyer</strong><p>Retirer la vision adverse autour de l'objectif.</p></div></li><li><span>2</span><div><strong>Installer</strong><p>Poser votre vision et préparer l'angle d'engage.</p></div></li><li><span>3</span><div><strong>Regrouper</strong><p>Vérifier que les cinq joueurs peuvent arriver ensemble.</p></div></li><li><span>4</span><div><strong>Décider</strong><p>Prendre l'objectif ou forcer le fight favorable.</p></div></li></ol>
        </section>

        <ObjectiveTimelinePanel objectiveSetup={analysis.objectiveSetup} />
        <DraftScouting opponentIds={opponentIds} state={scoutingState} error={scoutingError} report={scoutingReport} targetBans={targetBans} draftPlan={draftPlan} onOpponentIdsChange={onOpponentIdsChange} onScan={onScoutingScan} onToggleBan={onToggleTargetBan} onDraftPlanChange={onDraftPlanChange} />

        <section className="playbook-followup-grid"><TeamMilestoneTracker progress={milestoneProgress} onToggle={onToggleMilestone} /><ReviewJournal draft={reviewDraft} reviews={reviews} onDraftChange={onReviewDraftChange} onAdd={onAddReview} onRemove={onRemoveReview} /></section>
      </>}
    </section>
  );
}

function TeamDashboard({ result, selectedId, roleAssignments, onRoleChange, onSelectPlayer, onShowCoaching, onSync }: { result: SyncResult; selectedId: string; roleAssignments: Record<string, Role>; onRoleChange: (playerId: string, role: Role) => void; onSelectPlayer: (id: string) => void; onShowCoaching: () => void; onSync: () => void }) {
  const { analysis, matches, scanned } = result;
  const summary = analysis.summary;
  if (!summary) return <EmptyDashboard onSync={onSync} />;

  return (
    <>
      <section className="live-summary"><span className="pulse" /><div><strong>Synchronisation Riot terminée</strong><p>{scanned.retainedMatches} parties de groupe réelles, dont {scanned.retainedTimelines} timelines enrichies.</p></div><div><strong>{summary.teamWinRate} %</strong><small>win rate</small></div><div><strong>{summary.averageDurationMinutes} min</strong><small>durée moyenne</small></div></section>
      <section className="hero"><div><p className="eyebrow">4SPEL RIFT ROOM · DONNÉES RIOT SYNCHRONISÉES</p><h2>Votre room. Votre rift.<br /><em>Vos vraies séquences.</em></h2><p className="hero-copy">Lecture des {summary.games} parties où au moins trois membres du roster ont joué ensemble, enrichie des événements Timeline disponibles.</p></div><div className="record"><span>Win rate d'équipe</span><strong>{summary.teamWinRate} %</strong><small>{summary.games} parties de groupe</small></div></section>
      <section className="stat-grid">
        <article className="stat-card"><p>Parties ensemble</p><strong>{summary.games}</strong><small>parties Riot retenues</small></article>
        <article className="stat-card featured"><p>Win rate d'équipe</p><strong>{summary.teamWinRate} %</strong><small>même camp, 3 membres minimum</small></article>
        <article className="stat-card"><p>Morts à risque</p><strong>{formatMetric(analysis.timeline.riskyDeathsPerGame, "", 1)}</strong><small>par partie Timeline</small></article>
        <article className="stat-card"><p>Vision objectif</p><strong>{formatMetric(analysis.timeline.objectiveVisionRate, "%")}</strong><small>ward posée avant l'objectif</small></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel performance"><div className="panel-head"><div><p className="eyebrow">Performances réelles</p><h2>Le roster synchronisé</h2></div><span className="legend"><i /> KDA observé</span></div><div className="player-list">{analysis.players.map((player) => <PlayerCard key={player.puuid} player={player} role={roleAssignments[player.puuid] ?? player.role} active={selectedId === player.puuid} onSelect={() => onSelectPlayer(player.puuid)} />)}</div></article>
        <article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Lecture coaching</p><h2>Les deux signaux utiles</h2></div><button className="text-button" onClick={onShowCoaching}>Détail →</button></div><div className="insight-list">{analysis.insights.map((insight) => <Insight key={insight.title} insight={insight} />)}</div></article>
      </section>
      <TeamTimelinePanel analysis={analysis} />
      <section className="panel role-manager"><div className="panel-head"><div><p className="eyebrow">Rôles de référence</p><h2>Configurer le roster</h2></div><span className="pill">Filtre coaching</span></div><p className="role-manager-copy">Le rôle choisi filtre les métriques individuelles et le champion pool sur les parties où le joueur a effectivement tenu ce rôle. Il détermine aussi si le tableau affiche le CS de lane ou le farm jungle.</p><div className="role-grid">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; const roleStats = analysis.playerRoles.find((stat) => stat.playerPuuid === player.puuid && stat.role === role); return <label className="role-control" key={player.puuid}><span><strong>{player.displayName}</strong><small>{roleStats ? `${roleStats.games} partie${roleStats.games > 1 ? "s" : ""} analysée${roleStats.games > 1 ? "s" : ""}` : "Aucune partie sur ce rôle"}</small></span><select value={role} onChange={(event) => onRoleChange(player.puuid, event.target.value as Role)}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>; })}</div></section>
      <PlayerTimelineTable analysis={analysis} roleAssignments={roleAssignments} />
      <section className="panel history"><div className="panel-head"><div><p className="eyebrow">Parties de groupe synchronisées</p><h2>Historique partagé</h2></div><span className="pill">≥ 3 membres</span></div><div className="table"><div className="row table-label"><span>Résultat</span><span>Line-up</span><span>Composition observée</span><span>Durée</span></div>{matches.map((match) => { const won = match.teamParticipants[0]?.win; const lineup = match.teamParticipants.map(displayName); return <div className="row" key={match.id}><span className={`result ${won ? "win" : "loss"}`}><i />{won ? "Victoire" : "Défaite"}<small>{formatPlayedAt(match.playedAt)}</small></span><span className="lineup">{lineup.map((name) => <b key={name}>{name.slice(0, 1)}</b>)}<small>{lineup.length} présents</small></span><span className="comp">{match.teamParticipants.map((player) => player.championName).join(" · ")}</span><span>{formatDuration(match.gameDurationSeconds)}</span></div>; })}</div></section>
    </>
  );
}

function CoachingDashboard({ analysis, selectedId, roleAssignments, onRoleChange, onSelect, onSync }: { analysis: TeamAnalysis | null; selectedId: string; roleAssignments: Record<string, Role>; onRoleChange: (playerId: string, role: Role) => void; onSelect: (id: string) => void; onSync: () => void }) {
  const selectedPlayer = analysis?.players.find((player) => player.puuid === selectedId) ?? analysis?.players[0];
  const selectedRole = selectedPlayer ? roleAssignments[selectedPlayer.puuid] ?? selectedPlayer.role : "FILL";
  const selectedRoleStats = analysis?.playerRoles.find((stat) => stat.playerPuuid === selectedPlayer?.puuid && stat.role === selectedRole);
  const selectedChampions = useMemo(() => analysis?.champions.filter((champion) => champion.playerPuuid === selectedPlayer?.puuid && champion.role === selectedRole) ?? [], [analysis, selectedPlayer?.puuid, selectedRole]);
  if (!analysis || !selectedPlayer) return <EmptyDashboard onSync={onSync} coaching />;
  if (!selectedRoleStats) return <section className="coaching-view"><div className="member-tabs">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; return <button type="button" className={player.puuid === selectedPlayer.puuid ? "active" : ""} key={player.puuid} onClick={() => onSelect(player.puuid)}>{player.displayName}<small>{roleLabels[role]}</small></button>; })}</div><RolePicker player={selectedPlayer} role={selectedRole} onRoleChange={(role) => onRoleChange(selectedPlayer.puuid, role)} /><section className="panel role-empty"><span className="empty-mark">?</span><div><p className="eyebrow">Aucune partie trouvée sur ce rôle</p><h2>Pas encore de donnée {roleLabels[selectedRole]}</h2><p>{selectedPlayer.displayName} n'a pas occupé ce rôle dans les parties de groupe retenues. Choisissez un autre rôle ou élargissez l'historique à une future synchronisation.</p></div></section></section>;

  const farm = farmLabels(selectedRoleStats.timeline, selectedRole);
  const matchStats = selectedRoleStats.matchStats;
  return (
    <section className="coaching-view">
      <div className="member-tabs">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; return <button type="button" className={player.puuid === selectedPlayer.puuid ? "active" : ""} key={player.puuid} onClick={() => onSelect(player.puuid)}>{player.displayName}<small>{roleLabels[role]}</small></button>; })}</div>
      <section className="focus-card"><div className="focus-profile"><span className="large-orb" style={{ background: roleColors[selectedRole] }}>{selectedPlayer.displayName.slice(0, 1)}</span><div><p className="eyebrow">Profil Riot synchronisé · {roleLabels[selectedRole]}</p><h2>{selectedPlayer.displayName}</h2><p>{selectedPlayer.riotId}</p></div></div><div className="focus-score"><small>Win rate sur ce rôle</small><strong>{selectedRoleStats.winRate} %</strong><span>{selectedRoleStats.games} partie{selectedRoleStats.games > 1 ? "s" : ""} de groupe</span></div></section>
      <RolePicker player={selectedPlayer} role={selectedRole} onRoleChange={(role) => onRoleChange(selectedPlayer.puuid, role)} />
      <section className="stat-grid individual-grid"><article className="stat-card featured"><p>Win rate</p><strong>{selectedRoleStats.winRate} %</strong><small>{selectedRoleStats.games} parties sur ce rôle</small></article><article className="stat-card"><p>KDA</p><strong>{selectedRoleStats.kda}</strong><small>{formatMetric(matchStats.killsPerGame, "", 1)} / {formatMetric(matchStats.deathsPerGame, "", 1)} / {formatMetric(matchStats.assistsPerGame, "", 1)}</small></article><article className="stat-card"><p>Participation kills</p><strong>{formatMetric(matchStats.killParticipation, "%")}</strong><small>kills + assists du joueur</small></article><article className="stat-card"><p>Or / minute</p><strong>{selectedRoleStats.goldPerMinute}</strong><small>économie sur ce rôle</small></article><article className="stat-card"><p>CS / minute</p><strong>{selectedRoleStats.csPerMinute}</strong><small>lane et jungle cumulés</small></article><article className="stat-card"><p>Vision / minute</p><strong>{selectedRoleStats.visionPerMinute}</strong><small>{formatMetric(matchStats.visionScorePerGame, "", 1)} score vision / partie</small></article><article className="stat-card"><p>{farm.tenLabel}</p><strong>{formatMetric(farm.ten)}</strong><small>{farm.fifteenLabel} : {formatMetric(farm.fifteen)}</small></article><article className="stat-card"><p>Morts à risque</p><strong>{formatMetric(selectedRoleStats.timeline.riskyDeathsPerGame, "", 1)}</strong><small>{formatMetric(selectedRoleStats.timeline.deathsPerGame, "", 1)} mort(s) / partie Timeline</small></article></section>
      <section className="dashboard-grid player-stat-details"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Combat & pression</p><h2>Impact dans la partie</h2></div></div><div className="metric-list"><div><span>Dégâts champions / min</span><strong>{formatMetric(matchStats.damageToChampionsPerMinute)}</strong></div><div><span>Dégâts objectifs / min</span><strong>{formatMetric(matchStats.objectiveDamagePerMinute)}</strong></div><div><span>Dégâts subis / min</span><strong>{formatMetric(matchStats.damageTakenPerMinute)}</strong></div><div><span>CC infligé / min</span><strong>{formatMetric(matchStats.ccSecondsPerMinute, " s", 1)}</strong></div><div><span>Tours participées / game</span><strong>{formatMetric(matchStats.turretTakedownsPerGame, "", 1)}</strong></div></div></article><article className="panel"><div className="panel-head"><div><p className="eyebrow">Vision & objectifs</p><h2>Utilité hors combat</h2></div></div><div className="metric-list"><div><span>Wards détruites / game</span><strong>{formatMetric(matchStats.wardsKilledPerGame, "", 1)}</strong></div><div><span>Control wards / game</span><strong>{formatMetric(matchStats.controlWardsPerGame, "", 1)}</strong></div><div><span>Wards posées / game</span><strong>{formatMetric(selectedRoleStats.timeline.wardsPerGame, "", 1)}</strong></div><div><span>Wards avant objectif</span><strong>{formatMetric(selectedRoleStats.timeline.wardsBeforeObjectivesPerGame, "", 1)}</strong></div><div><span>Présence aux objectifs</span><strong>{formatMetric(selectedRoleStats.timeline.objectiveParticipationRate, "%")}</strong></div></div></article></section>
      <section className="dashboard-grid coaching-detail"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Champions réellement joués</p><h2>Champion pool · {roleLabels[selectedRole]}</h2></div></div>{selectedChampions.length ? selectedChampions.map((champion: ChampionAnalysis) => <div className="champion-row" key={`${champion.role}:${champion.champion}`}><span className="champ-icon">{champion.champion.slice(0, 1)}</span><div><strong>{champion.champion}</strong><small>{roleLabels[champion.role]} · {champion.games} partie{champion.games > 1 ? "s" : ""} · {champion.kda} KDA</small></div><div className="champ-score"><strong>{champion.winRate} %</strong><small>win rate</small></div><div className="meter"><i style={{ width: `${champion.winRate}%` }} /></div></div>) : <p className="empty-state">Aucun champion analysable sur les parties synchronisées.</p>}</article><article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Repères de jeu</p><h2>Mesures · {roleLabels[selectedRole]}</h2></div></div><div className="training"><span>01</span><div><h3>Sécurité</h3><p>{formatMetric(selectedRoleStats.timeline.riskyDeathsPerGame, "", 1)} mort(s) à risque par partie Timeline. Utilisez-les comme points de départ pour la VOD.</p></div></div><div className="training"><span>02</span><div><h3>Lane & tempo</h3><p>{farm.tenLabel} {formatMetric(farm.ten)} puis {farm.fifteenLabel} {formatMetric(farm.fifteen)} sur les parties de groupe jouées à ce rôle.</p></div></div><div className="training"><span>03</span><div><h3>Objectifs</h3><p>{formatMetric(selectedRoleStats.timeline.wardsBeforeObjectivesPerGame, "", 1)} ward(s) posée(s) autour des objectifs et {formatMetric(selectedRoleStats.timeline.objectiveParticipationRate, "%")} de présence.</p></div></div></article></section>
      <section className="panel all-insights"><div className="panel-head"><div><p className="eyebrow">Diagnostic calculé</p><h2>Conseils fondés sur les données synchronisées</h2></div></div><div className="insight-list">{analysis.insights.map((insight) => <Insight key={insight.title} insight={insight} />)}</div></section>
    </section>
  );
}

function ReviewDashboard({ analysis, onSync }: { analysis: TeamAnalysis | null; onSync: () => void }) {
  if (!analysis) return <EmptyDashboard onSync={onSync} coaching />;
  const review = analysis.sessionReview;
  const statusLabel = { "on-track": "Dans le bon sens", watch: "À stabiliser", review: "À valider" };
  return <section className="review-view"><section className="review-hero"><div><p className="eyebrow">Bilan de session · instantané</p><h2>{review?.title ?? "Synchronisez des parties pour lancer la review"}</h2><p>{review?.evidence ?? "Rift Room produira une priorité lorsque les données de groupe seront disponibles."}</p></div>{review && <div className="review-action"><span>Une seule action suivante</span><strong>{review.nextAction}</strong></div>}</section><section className="panel milestones"><div className="panel-head"><div><p className="eyebrow">Playbook 4Spel</p><h2>Les quatre paliers, à cette session</h2></div><span className="pill">Sauvegardé</span></div><p className="session-note">La configuration du playbook et vos reviews sont enregistrées avec l'équipe. Les mesures Riot restent recalculées à chaque synchronisation.</p><div className="milestone-grid">{analysis.milestones.map((milestone) => <article className={`milestone ${milestone.status}`} key={milestone.id}><div><span className="milestone-status">{statusLabel[milestone.status]}</span><h3>{milestone.title}</h3><p>{milestone.evidence}</p></div><div className="milestone-action">↗ {milestone.action}</div>{!milestone.automated && <small>Validation humaine recommandée</small>}</article>)}</div></section><section className="dashboard-grid review-grid"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Draft · cinq joueurs du roster</p><h2>Résultats par plan de compo</h2></div></div>{analysis.draft.compositions.length ? <div className="draft-list">{analysis.draft.compositions.map((composition) => <div className="draft-row" key={composition.label}><span>{composition.label}</span><small>{composition.games} partie{composition.games > 1 ? "s" : ""}</small><strong>{composition.winRate} %</strong></div>)}</div> : <p className="empty-state">Il faut une partie où les cinq joueurs renseignés ont joué ensemble. La classification est volontairement simple : engage, pick, scaling ou hybride.</p>}</article><article className="panel"><div className="panel-head"><div><p className="eyebrow">Bans rencontris</p><h2>Ce que les adversaires retirent</h2></div></div>{analysis.draft.opponentBans.length ? <div className="draft-list bans-list">{analysis.draft.opponentBans.map((ban) => <div className="draft-row" key={ban.champion}><span>{ban.champion}</span><strong>{ban.bans} ban{ban.bans > 1 ? "s" : ""}</strong></div>)}</div> : <p className="empty-state">Aucun ban adverse exploitable n'a été retourné par les parties synchronisées.</p>}</article></section><section className="panel methodology"><p className="eyebrow">Méthode</p><h2>Ce que le tableau mesure — et ce qu'il ne prétend pas savoir</h2><p>Les wards et les événements d'objectif sont issus de la Timeline. Les positions sont des instantanés : la présence d'équipe est donc un proxy. Les paliers « teamfights » et « draft avec intention » doivent être confirmés pendant votre review, pas délégués aveuglément à une formule.</p></section></section>;
}

export default function Home() {
  const [section, setSection] = useState<"team" | "coaching" | "playbook" | "review">("team");
  const [selectedId, setSelectedId] = useState("");
  const [roleAssignments, setRoleAssignments] = useState<Record<string, Role>>({});
  const [callerAssignments, setCallerAssignments] = useState<CallerAssignments>({});
  const [sessionFocus, setSessionFocus] = useState<SessionFocusId | "">("");
  const [playbookPlayerId, setPlaybookPlayerId] = useState("");
  const [championTracks, setChampionTracks] = useState<ChampionTrackAssignments>({});
  const [playerAxes, setPlayerAxes] = useState<PlayerDevelopmentAxes>({});
  const [trainingStatus, setTrainingStatus] = useState<TrainingSessionStatus>("planning");
  const [trainingGoal, setTrainingGoal] = useState("");
  const [trainingChecklist, setTrainingChecklist] = useState<TrainingChecklist>({ ...emptyTrainingChecklist });
  const [milestoneProgress, setMilestoneProgress] = useState<TeamMilestoneProgress>({ ...emptyTeamMilestones });
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({ ...emptyReviewDraft });
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [opponentIds, setOpponentIds] = useState("");
  const [scoutingState, setScoutingState] = useState<"idle" | "loading" | "error">("idle");
  const [scoutingError, setScoutingError] = useState("");
  const [scoutingReport, setScoutingReport] = useState<ScoutingReport | null>(null);
  const [targetBans, setTargetBans] = useState<string[]>([]);
  const [draftPlan, setDraftPlan] = useState<DraftPlan>({ ...emptyDraftPlan });
  const [syncOpen, setSyncOpen] = useState(false);
  const [riotIds, setRiotIds] = useState(DEFAULT_RIOT_IDS);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const analysis = syncResult?.analysis ?? null;
  const selectedPlayer = analysis?.players.find((player) => player.puuid === selectedId) ?? analysis?.players[0];
  const selectedRole = selectedPlayer ? roleAssignments[selectedPlayer.puuid] ?? selectedPlayer.role : "FILL";

  function applySyncResult(data: SyncResult) {
    setSyncResult(data);
    setSelectedId(data.analysis.players[0]?.puuid ?? "");
    setPlaybookPlayerId((current) => data.analysis.players.some((player) => player.puuid === current) ? current : data.analysis.players[0]?.puuid ?? "");
    setRoleAssignments((current) => Object.fromEntries(data.analysis.players.map((player) => [player.puuid, current[player.puuid] ?? player.role])));
  }

  function applyWorkspace(workspace: Partial<WorkspaceState>) {
    if (workspace.roleAssignments) setRoleAssignments(workspace.roleAssignments);
    if (workspace.callerAssignments) setCallerAssignments(workspace.callerAssignments);
    if (workspace.sessionFocus !== undefined) setSessionFocus(workspace.sessionFocus);
    if (workspace.playbookPlayerId) setPlaybookPlayerId(workspace.playbookPlayerId);
    if (workspace.championTracks) setChampionTracks(workspace.championTracks);
    if (workspace.playerAxes) setPlayerAxes(workspace.playerAxes);
    if (workspace.trainingStatus) setTrainingStatus(workspace.trainingStatus);
    if (workspace.trainingGoal !== undefined) setTrainingGoal(workspace.trainingGoal);
    if (workspace.trainingChecklist) setTrainingChecklist(workspace.trainingChecklist);
    if (workspace.milestoneProgress) setMilestoneProgress(workspace.milestoneProgress);
    if (workspace.reviews) setReviews(workspace.reviews);
    if (workspace.targetBans) setTargetBans(workspace.targetBans);
    if (workspace.draftPlan) setDraftPlan(workspace.draftPlan);
  }

  useEffect(() => {
    let active = true;
    async function restoreLatestScan() {
      try {
        const response = await fetch("/api/team/scan", { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = (await response.json()) as { result?: SyncResult | null; workspace?: Partial<WorkspaceState> };
        if (data.result) applySyncResult(data.result);
        if (data.workspace) applyWorkspace(data.workspace);
        setWorkspaceHydrated(true);
      } catch {
        // Une base non configurée ou momentanément indisponible ne bloque pas l'écran initial.
      }
    }
    void restoreLatestScan();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!workspaceHydrated || !syncResult) return;
    const workspace: WorkspaceState = { roleAssignments, callerAssignments, sessionFocus, playbookPlayerId, championTracks, playerAxes, trainingStatus, trainingGoal, trainingChecklist, milestoneProgress, reviews, targetBans, draftPlan };
    const timer = window.setTimeout(() => {
      void fetch("/api/team/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspace) });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspaceHydrated, syncResult, roleAssignments, callerAssignments, sessionFocus, playbookPlayerId, championTracks, playerAxes, trainingStatus, trainingGoal, trainingChecklist, milestoneProgress, reviews, targetBans, draftPlan]);

  function updatePlayerRole(playerId: string, role: Role) {
    setRoleAssignments((current) => ({ ...current, [playerId]: role }));
  }

  function updateCaller(domain: CallerDomain, playerId: string) {
    setCallerAssignments((current) => ({ ...current, [domain]: playerId }));
  }

  function updateChampionTrack(champion: ChampionAnalysis, track: ChampionTrack) {
    setChampionTracks((current) => ({ ...current, [championTrackKey(champion)]: track }));
  }

  function updatePlayerAxis(playerId: string, axis: string) {
    setPlayerAxes((current) => ({ ...current, [playerId]: axis }));
  }

  function updateTrainingSession(action: "start" | "close" | "reset") {
    if (action === "start") {
      setTrainingStatus("running");
      return;
    }
    if (action === "close") {
      setTrainingStatus("closed");
      return;
    }
    setTrainingStatus("planning");
    setTrainingGoal("");
    setTrainingChecklist({ ...emptyTrainingChecklist });
    setReviewDraft({ ...emptyReviewDraft });
    setReviews([]);
  }

  function toggleTrainingStep(step: TrainingStepId) {
    setTrainingChecklist((current) => ({ ...current, [step]: !current[step] }));
  }

  function toggleMilestone(milestone: TeamMilestoneId) {
    const milestoneIndex = teamMilestones.findIndex((item) => item.id === milestone);
    setMilestoneProgress((current) => {
      if (current[milestone]) {
        const next = { ...current };
        for (const item of teamMilestones.slice(milestoneIndex)) next[item.id] = false;
        return next;
      }
      if (milestoneIndex > 0 && !current[teamMilestones[milestoneIndex - 1].id]) return current;
      return { ...current, [milestone]: true };
    });
  }

  function updateReviewDraft(field: keyof ReviewDraft, value: string) {
    setReviewDraft((current) => ({ ...current, [field]: value }));
  }

  function addReview() {
    const pattern = reviewDraft.pattern.trim();
    const action = reviewDraft.action.trim();
    if (!pattern || !action) return;
    setReviews((current) => [{ id: Date.now(), source: reviewDraft.source.trim(), pattern, action }, ...current]);
    setReviewDraft({ ...emptyReviewDraft });
  }

  function removeReview(id: number) {
    setReviews((current) => current.filter((review) => review.id !== id));
  }

  function updateOpponentIds(value: string) {
    setOpponentIds(value);
    setScoutingState("idle");
    setScoutingError("");
    setScoutingReport(null);
    setTargetBans([]);
  }

  function toggleTargetBan(champion: string) {
    setTargetBans((current) => current.includes(champion) ? current.filter((item) => item !== champion) : [...current, champion]);
  }

  function updateDraftPlan(field: keyof DraftPlan, value: string) {
    setDraftPlan((current) => ({ ...current, [field]: value }));
  }

  async function scoutOpponents() {
    const players = riotPlayersFromText(opponentIds);
    if (players.length < 1 || players.length > 5) {
      setScoutingState("error");
      setScoutingError("Ajoute entre 1 et 5 Riot ID adverses, un par ligne, au format Pseudo#TAG.");
      return;
    }
    setScoutingState("loading");
    setScoutingError("");
    try {
      const response = await fetch("/api/scouting", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ players }) });
      const data = (await response.json()) as { report?: ScoutingReport; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error ?? "Le scouting Riot a échoué.");
      setScoutingReport(data.report);
      setTargetBans([]);
      setScoutingState("idle");
    } catch (error) {
      setScoutingState("error");
      setScoutingError(error instanceof Error ? error.message : "Le scouting Riot a échoué.");
    }
  }

  async function syncTeam() {
    const players = riotPlayersFromText(riotIds);
    if (players.length < 3 || players.length > 5) {
      setSyncState("error");
      setSyncError("Ajoute entre 3 et 5 Riot ID, un par ligne, au format Pseudo#TAG.");
      return;
    }
    setSyncState("loading");
    setSyncError("");
    try {
      const response = await fetch("/api/team/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ players, minTeammates: 3, matchCount: REQUESTED_MATCH_HISTORY }) });
      const data = (await response.json()) as SyncResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "La synchronisation a échoué.");
      applySyncResult(data);
      setWorkspaceHydrated(true);
      setSyncState("idle");
      setSyncOpen(false);
      setSection("team");
    } catch (error) {
      setSyncState("error");
      setSyncError(error instanceof Error ? error.message : "La synchronisation a échoué.");
    }
  }

  const heading = section === "team" ? "La salle de coaching" : section === "playbook" ? "Le playbook 4Spel" : section === "review" ? "Review de session" : selectedPlayer ? `${selectedPlayer.displayName}, ${roleLabels[selectedRole]}` : "Coaching individuel";
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">4</span><span className="brand-copy"><strong>4SPEL</strong><small>Rift Room · LoL Coaching</small></span></div>
        <RosterSelector players={analysis?.players ?? []} selectedId={selectedPlayer?.puuid ?? ""} onSelectPlayer={(playerId) => { setSelectedId(playerId); setSection("coaching"); }} onSync={() => setSyncOpen(true)} />
        <nav><button type="button" className={section === "team" ? "active" : ""} onClick={() => setSection("team")}><span>◫</span>Vue d’équipe</button><button type="button" className={section === "playbook" ? "active" : ""} onClick={() => setSection("playbook")}><span>≡</span>Playbook</button><button type="button" className={section === "coaching" ? "active" : ""} onClick={() => setSection("coaching")}><span>◇</span>Coaching</button><button type="button" className={section === "review" ? "active" : ""} onClick={() => setSection("review")}><span>✦</span>Review & draft</button></nav>
        <div className="sidebar-bottom"><div className="sync"><span className="pulse" />{syncResult ? "Données Riot en session" : "Aucune donnée affichée"}</div><button className="settings" type="button" onClick={() => setSyncOpen(true)}>⚙ Synchroniser</button></div>
      </aside>
      <section className="content">
        <header className="topbar"><div><p className="eyebrow">{section === "team" ? "4SPEL · RIFT ROOM" : section === "playbook" ? "4SPEL · CADRE D'ENTRAÎNEMENT" : section === "review" ? "4SPEL · PLAYBOOK & REVIEW" : "RIFT ROOM · COACHING INDIVIDUEL"}</p><h1>{section === "team" ? "La salle de coaching" : section === "playbook" ? "Le playbook 4Spel" : section === "review" ? "Review de session" : selectedPlayer ? `${selectedPlayer.displayName}, ${roleLabels[selectedRole]}` : "Coaching individuel"}</h1></div><div className="header-actions"><button className="sync-button" onClick={() => setSyncOpen(true)}>↻ Synchroniser</button></div></header>
        {section === "team" ? (syncResult ? <TeamDashboard result={syncResult} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelectPlayer={setSelectedId} onShowCoaching={() => setSection("coaching")} onSync={() => setSyncOpen(true)} /> : <EmptyDashboard onSync={() => setSyncOpen(true)} />) : section === "playbook" ? <PlaybookDashboard analysis={analysis} roleAssignments={roleAssignments} callerAssignments={callerAssignments} sessionFocus={sessionFocus} selectedPlayerId={playbookPlayerId} championTracks={championTracks} playerAxes={playerAxes} trainingStatus={trainingStatus} trainingGoal={trainingGoal} trainingChecklist={trainingChecklist} milestoneProgress={milestoneProgress} reviewDraft={reviewDraft} reviews={reviews} opponentIds={opponentIds} scoutingState={scoutingState} scoutingError={scoutingError} scoutingReport={scoutingReport} targetBans={targetBans} draftPlan={draftPlan} onCallerChange={updateCaller} onSessionFocusChange={setSessionFocus} onSelectPlayer={setPlaybookPlayerId} onChampionTrackChange={updateChampionTrack} onAxisChange={updatePlayerAxis} onTrainingGoalChange={setTrainingGoal} onToggleTrainingStep={toggleTrainingStep} onTrainingSessionAction={updateTrainingSession} onToggleMilestone={toggleMilestone} onReviewDraftChange={updateReviewDraft} onAddReview={addReview} onRemoveReview={removeReview} onOpponentIdsChange={updateOpponentIds} onScoutingScan={scoutOpponents} onToggleTargetBan={toggleTargetBan} onDraftPlanChange={updateDraftPlan} onSync={() => setSyncOpen(true)} /> : section === "coaching" ? <CoachingDashboard analysis={analysis} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelect={setSelectedId} onSync={() => setSyncOpen(true)} /> : <ReviewDashboard analysis={analysis} onSync={() => setSyncOpen(true)} />}
      </section>
      {syncOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => syncState !== "loading" && setSyncOpen(false)}><section className="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Fermer" onClick={() => syncState !== "loading" && setSyncOpen(false)}>×</button><p className="eyebrow">Connexion Riot</p><h2 id="sync-title">Synchroniser les parties de l’équipe</h2><p className="modal-copy">Les cinq Riot ID 4Spel sont préremplis. Rift Room parcourt jusqu’à 100 parties par joueur, conserve les 40 parties d’équipe les plus récentes et lit les timelines des 8 dernières.</p><label className="riot-label">Riot ID <span>un par ligne</span><textarea value={riotIds} onChange={(event) => { setRiotIds(event.target.value); setSyncState("idle"); }} placeholder={defaultRoster} rows={6} autoFocus /></label>{syncState === "error" && <p className="form-error">{syncError}</p>}<div className="modal-footer"><small>La clé API reste côté serveur. L’analyse peut dépasser une minute avec la lecture Timeline sur une clé de développement.</small><button className="sync-button" type="button" onClick={syncTeam} disabled={syncState === "loading"}>{syncState === "loading" ? "Analyse Riot en cours…" : "Lancer l’analyse"}</button></div></section></div>}
    </main>
  );
}
