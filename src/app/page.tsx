"use client";

import { useMemo, useState } from "react";
import type { ChampionAnalysis, ObjectiveSetupAnalysis, PlayerAnalysis, SyncedMatch, TeamAnalysis } from "@/lib/analytics";
import type { ScoutingReport } from "@/lib/scouting";
import type { CoachingInsight, Role } from "@/lib/types";

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
  scanned: { requestedMatchesPerPlayer: number; candidateMatches: number; retainedMatches: number };
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

function displayName(matchPlayer: SyncedMatch["teamParticipants"][number]) {
  return matchPlayer.riotIdGameName || matchPlayer.summonerName;
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
      <div><p className="eyebrow">Rift Room attend vos données Riot</p><h2>{coaching ? "Synchronisez une équipe avant d’ouvrir le coaching" : "Aucune donnée d’équipe affichée"}</h2><p>Ajoutez 3 à 5 Riot ID. Rift Room calculera ensuite uniquement les statistiques de leurs parties réellement jouées ensemble.</p><button className="sync-button" type="button" onClick={onSync}>Synchroniser l’équipe</button></div>
    </section>
  );
}

function RolePicker({ player, role, onRoleChange }: { player: PlayerAnalysis; role: Role; onRoleChange: (role: Role) => void }) {
  return <section className="panel role-picker-panel"><div><p className="eyebrow">Rôle de référence</p><h2>Analyser {player.displayName} comme {roleLabels[role]}</h2><p>Les statistiques ci-dessous sont filtrées sur ce rôle, à partir des positions Riot observées dans les parties de groupe.</p></div><label><span>Rôle analysé</span><select value={role} onChange={(event) => onRoleChange(event.target.value as Role)}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></section>;
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
      <section className="live-summary"><span className="pulse" /><div><strong>Synchronisation Riot terminée</strong><p>{scanned.retainedMatches} parties de groupe réelles retenues sur les {scanned.candidateMatches} candidates.</p></div><div><strong>{summary.teamWinRate} %</strong><small>win rate</small></div><div><strong>{summary.averageDurationMinutes} min</strong><small>durée moyenne</small></div></section>
      <section className="hero"><div><p className="eyebrow">4SPEL RIFT ROOM · DONNÉES RIOT SYNCHRONISÉES</p><h2>Votre room. Votre rift.<br /><em>Vos vraies données.</em></h2><p className="hero-copy">Lecture des {summary.games} parties où au moins trois membres de votre roster ont joué ensemble.</p></div><div className="record"><span>Win rate d’équipe</span><strong>{summary.teamWinRate} %</strong><small>{summary.games} parties de groupe</small></div></section>
      <section className="stat-grid">
        <article className="stat-card"><p>Parties ensemble</p><strong>{summary.games}</strong><small>parties Riot retenues</small></article>
        <article className="stat-card featured"><p>Win rate d’équipe</p><strong>{summary.teamWinRate} %</strong><small>même camp, 3 membres minimum</small></article>
        <article className="stat-card"><p>Or / minute</p><strong>{summary.averageGoldPerMinute}</strong><small>moyenne par joueur</small></article>
        <article className="stat-card"><p>Vision / minute</p><strong>{summary.averageVisionPerMinute}</strong><small>moyenne par joueur</small></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel performance"><div className="panel-head"><div><p className="eyebrow">Performances réelles</p><h2>Le roster synchronisé</h2></div><span className="legend"><i /> KDA observé</span></div><div className="player-list">{analysis.players.map((player) => <PlayerCard key={player.puuid} player={player} role={roleAssignments[player.puuid] ?? player.role} active={selectedId === player.puuid} onSelect={() => onSelectPlayer(player.puuid)} />)}</div></article>
        <article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Lecture coaching</p><h2>Ce que disent les parties</h2></div><button className="text-button" onClick={onShowCoaching}>Détail →</button></div><div className="insight-list">{analysis.insights.slice(0, 2).map((insight) => <Insight key={insight.title} insight={insight} />)}</div></article>
      </section>
      <section className="panel role-manager"><div className="panel-head"><div><p className="eyebrow">Rôles de référence</p><h2>Configurer le roster</h2></div><span className="pill">Filtre coaching</span></div><p className="role-manager-copy">Le rôle choisi filtre les métriques individuelles et le champion pool sur les parties où le joueur a effectivement tenu ce rôle.</p><div className="role-grid">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; const roleStats = analysis.playerRoles.find((stat) => stat.playerPuuid === player.puuid && stat.role === role); return <label className="role-control" key={player.puuid}><span><strong>{player.displayName}</strong><small>{roleStats ? `${roleStats.games} partie${roleStats.games > 1 ? "s" : ""} analysée${roleStats.games > 1 ? "s" : ""}` : "Aucune partie sur ce rôle"}</small></span><select value={role} onChange={(event) => onRoleChange(player.puuid, event.target.value as Role)}>{Object.entries(roleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>; })}</div></section>
      <section className="panel history"><div className="panel-head"><div><p className="eyebrow">Parties de groupe synchronisées</p><h2>Historique partagé</h2></div><span className="pill">≥ 3 membres</span></div><div className="table"><div className="row table-label"><span>Résultat</span><span>Line-up</span><span>Composition</span><span>Durée</span></div>{matches.map((match) => { const won = match.teamParticipants[0]?.win; const lineup = match.teamParticipants.map(displayName); return <div className="row" key={match.id}><span className={`result ${won ? "win" : "loss"}`}><i />{won ? "Victoire" : "Défaite"}<small>{formatPlayedAt(match.playedAt)}</small></span><span className="lineup">{lineup.map((name) => <b key={name}>{name.slice(0, 1)}</b>)}<small>{lineup.length} présents</small></span><span className="comp">{match.teamParticipants.map((player) => player.championName).join(" · ")}</span><span>{formatDuration(match.gameDurationSeconds)}</span></div>; })}</div></section>
    </>
  );
}

function CoachingDashboard({ analysis, selectedId, roleAssignments, onRoleChange, onSelect, onSync }: { analysis: TeamAnalysis | null; selectedId: string; roleAssignments: Record<string, Role>; onRoleChange: (playerId: string, role: Role) => void; onSelect: (id: string) => void; onSync: () => void }) {
  const selectedPlayer = analysis?.players.find((player) => player.puuid === selectedId) ?? analysis?.players[0];
  const selectedRole = selectedPlayer ? roleAssignments[selectedPlayer.puuid] ?? selectedPlayer.role : "FILL";
  const selectedRoleStats = analysis?.playerRoles.find((stat) => stat.playerPuuid === selectedPlayer?.puuid && stat.role === selectedRole);
  const selectedChampions = useMemo(() => analysis?.champions.filter((champion) => champion.playerPuuid === selectedPlayer?.puuid && champion.role === selectedRole) ?? [], [analysis, selectedPlayer?.puuid, selectedRole]);
  if (!analysis || !selectedPlayer) return <EmptyDashboard onSync={onSync} coaching />;
  if (!selectedRoleStats) return <section className="coaching-view"><div className="member-tabs">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; return <button type="button" className={player.puuid === selectedPlayer.puuid ? "active" : ""} key={player.puuid} onClick={() => onSelect(player.puuid)}>{player.displayName}<small>{roleLabels[role]}</small></button>; })}</div><RolePicker player={selectedPlayer} role={selectedRole} onRoleChange={(role) => onRoleChange(selectedPlayer.puuid, role)} /><section className="panel role-empty"><span className="empty-mark">?</span><div><p className="eyebrow">Aucune partie trouvée sur ce rôle</p><h2>Pas encore de donnée {roleLabels[selectedRole]}</h2><p>{selectedPlayer.displayName} n’a pas occupé ce rôle dans les parties de groupe retenues par la synchronisation. Choisissez un autre rôle ou élargissez l’historique lors d’une future synchronisation.</p></div></section></section>;

  return (
    <section className="coaching-view">
      <div className="member-tabs">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; return <button type="button" className={player.puuid === selectedPlayer.puuid ? "active" : ""} key={player.puuid} onClick={() => onSelect(player.puuid)}>{player.displayName}<small>{roleLabels[role]}</small></button>; })}</div>
      <section className="focus-card"><div className="focus-profile"><span className="large-orb" style={{ background: roleColors[selectedRole] }}>{selectedPlayer.displayName.slice(0, 1)}</span><div><p className="eyebrow">Profil Riot synchronisé · {roleLabels[selectedRole]}</p><h2>{selectedPlayer.displayName}</h2><p>{selectedPlayer.riotId}</p></div></div><div className="focus-score"><small>Win rate sur ce rôle</small><strong>{selectedRoleStats.winRate} %</strong><span>{selectedRoleStats.games} partie{selectedRoleStats.games > 1 ? "s" : ""} de groupe</span></div></section>
      <RolePicker player={selectedPlayer} role={selectedRole} onRoleChange={(role) => onRoleChange(selectedPlayer.puuid, role)} />
      <section className="stat-grid individual"><article className="stat-card"><p>Win rate</p><strong>{selectedRoleStats.winRate} %</strong><small>{selectedRoleStats.games} parties sur ce rôle</small></article><article className="stat-card"><p>KDA</p><strong>{selectedRoleStats.kda}</strong><small>kills + assists / deaths</small></article><article className="stat-card"><p>Or / minute</p><strong>{selectedRoleStats.goldPerMinute}</strong><small>parties de groupe</small></article><article className="stat-card"><p>CS / minute</p><strong>{selectedRoleStats.csPerMinute}</strong><small>lane + jungle</small></article></section>
      <section className="dashboard-grid coaching-detail"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Champions réellement joués</p><h2>Champion pool · {roleLabels[selectedRole]}</h2></div></div>{selectedChampions.length ? selectedChampions.map((champion: ChampionAnalysis) => <div className="champion-row" key={`${champion.role}:${champion.champion}`}><span className="champ-icon">{champion.champion.slice(0, 1)}</span><div><strong>{champion.champion}</strong><small>{roleLabels[champion.role]} · {champion.games} partie{champion.games > 1 ? "s" : ""} · {champion.kda} KDA</small></div><div className="champ-score"><strong>{champion.winRate} %</strong><small>win rate</small></div><div className="meter"><i style={{ width: `${champion.winRate}%` }} /></div></div>) : <p className="empty-state">Aucun champion analysable sur les parties synchronisées.</p>}</article><article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Repères de jeu</p><h2>Mesures · {roleLabels[selectedRole]}</h2></div></div><div className="training"><span>01</span><div><h3>Vision</h3><p>{selectedRoleStats.visionPerMinute} vision/minute sur les parties où {selectedPlayer.displayName} joue {roleLabels[selectedRole]} avec le roster.</p></div></div><div className="training"><span>02</span><div><h3>Farm</h3><p>{selectedRoleStats.csPerMinute} CS/minute, monstres de jungle inclus.</p></div></div><div className="training"><span>03</span><div><h3>Échantillon</h3><p>{selectedRoleStats.games} partie{selectedRoleStats.games > 1 ? "s" : ""} sur ce rôle exploitée{selectedRoleStats.games > 1 ? "s" : ""} pour ces mesures.</p></div></div></article></section>
      <section className="panel all-insights"><div className="panel-head"><div><p className="eyebrow">Diagnostic calculé</p><h2>Conseils fondés sur les données synchronisées</h2></div></div><div className="insight-list">{analysis.insights.map((insight) => <Insight key={insight.title} insight={insight} />)}</div></section>
    </section>
  );
}

export default function Home() {
  const [section, setSection] = useState<"team" | "coaching" | "playbook">("team");
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
  const analysis = syncResult?.analysis ?? null;
  const selectedPlayer = analysis?.players.find((player) => player.puuid === selectedId) ?? analysis?.players[0];
  const selectedRole = selectedPlayer ? roleAssignments[selectedPlayer.puuid] ?? selectedPlayer.role : "FILL";

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
      setSyncResult(data);
      setSelectedId(data.analysis.players[0]?.puuid ?? "");
      setPlaybookPlayerId((current) => data.analysis.players.some((player) => player.puuid === current) ? current : data.analysis.players[0]?.puuid ?? "");
      setRoleAssignments((current) => Object.fromEntries(data.analysis.players.map((player) => [player.puuid, current[player.puuid] ?? player.role])));
      setSyncState("idle");
      setSyncOpen(false);
      setSection("team");
    } catch (error) {
      setSyncState("error");
      setSyncError(error instanceof Error ? error.message : "La synchronisation a échoué.");
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">4</span><span className="brand-copy"><strong>4SPEL</strong><small>Rift Room · LoL Coaching</small></span></div>
        <div className="team-switch"><span className="team-avatar">4S</span><div><strong>{syncResult ? "Roster synchronisé" : "Aucun roster"}</strong><small>{syncResult ? `${syncResult.roster.length} joueurs Riot` : "Ajoutez votre équipe"}</small></div><span className="chevron">⌄</span></div>
        <nav><button type="button" className={section === "team" ? "active" : ""} onClick={() => setSection("team")}><span>◫</span>Vue d’équipe</button><button type="button" className={section === "playbook" ? "active" : ""} onClick={() => setSection("playbook")}><span>≡</span>Playbook</button><button type="button" className={section === "coaching" ? "active" : ""} onClick={() => setSection("coaching")}><span>◇</span>Coaching</button></nav>
        <div className="sidebar-bottom"><div className="sync"><span className="pulse" />{syncResult ? "Données Riot en session" : "Aucune donnée affichée"}</div><button className="settings" type="button" onClick={() => setSyncOpen(true)}>⚙ Synchroniser</button></div>
      </aside>
      <section className="content">
        <header className="topbar"><div><p className="eyebrow">{section === "team" ? "4SPEL · RIFT ROOM" : section === "playbook" ? "4SPEL · CADRE D'ENTRAÎNEMENT" : "RIFT ROOM · COACHING INDIVIDUEL"}</p><h1>{section === "team" ? "La salle de coaching" : section === "playbook" ? "Le playbook 4Spel" : selectedPlayer ? `${selectedPlayer.displayName}, ${roleLabels[selectedRole]}` : "Coaching individuel"}</h1></div><div className="header-actions"><button className="sync-button" onClick={() => setSyncOpen(true)}>↻ Synchroniser</button></div></header>
        {section === "team" ? (syncResult ? <TeamDashboard result={syncResult} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelectPlayer={setSelectedId} onShowCoaching={() => setSection("coaching")} onSync={() => setSyncOpen(true)} /> : <EmptyDashboard onSync={() => setSyncOpen(true)} />) : section === "playbook" ? <PlaybookDashboard analysis={analysis} roleAssignments={roleAssignments} callerAssignments={callerAssignments} sessionFocus={sessionFocus} selectedPlayerId={playbookPlayerId} championTracks={championTracks} playerAxes={playerAxes} trainingStatus={trainingStatus} trainingGoal={trainingGoal} trainingChecklist={trainingChecklist} milestoneProgress={milestoneProgress} reviewDraft={reviewDraft} reviews={reviews} opponentIds={opponentIds} scoutingState={scoutingState} scoutingError={scoutingError} scoutingReport={scoutingReport} targetBans={targetBans} draftPlan={draftPlan} onCallerChange={updateCaller} onSessionFocusChange={setSessionFocus} onSelectPlayer={setPlaybookPlayerId} onChampionTrackChange={updateChampionTrack} onAxisChange={updatePlayerAxis} onTrainingGoalChange={setTrainingGoal} onToggleTrainingStep={toggleTrainingStep} onTrainingSessionAction={updateTrainingSession} onToggleMilestone={toggleMilestone} onReviewDraftChange={updateReviewDraft} onAddReview={addReview} onRemoveReview={removeReview} onOpponentIdsChange={updateOpponentIds} onScoutingScan={scoutOpponents} onToggleTargetBan={toggleTargetBan} onDraftPlanChange={updateDraftPlan} onSync={() => setSyncOpen(true)} /> : <CoachingDashboard analysis={analysis} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelect={setSelectedId} onSync={() => setSyncOpen(true)} />}
      </section>
      {syncOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => syncState !== "loading" && setSyncOpen(false)}><section className="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Fermer" onClick={() => setSyncOpen(false)}>×</button><p className="eyebrow">Connexion Riot</p><h2 id="sync-title">Synchroniser les parties de l’équipe</h2><p className="modal-copy">Les cinq Riot ID 4Spel sont préremplis. Rift Room parcourt jusqu’à 100 parties par joueur, conserve les 40 parties d’équipe les plus récentes et lit les timelines des 8 dernières.</p><label className="riot-label">Riot ID <span>un par ligne</span><textarea value={riotIds} onChange={(event) => { setRiotIds(event.target.value); setSyncState("idle"); }} placeholder={"Joueur 1#EUW\nJoueur 2#EUW\nJoueur 3#EUW"} rows={6} autoFocus /></label>{syncState === "error" && <p className="form-error">{syncError}</p>}<div className="modal-footer"><small>La clé API reste côté serveur. L’analyse peut dépasser une minute avec la lecture Timeline sur une clé de développement.</small><button className="sync-button" type="button" onClick={syncTeam} disabled={syncState === "loading"}>{syncState === "loading" ? "Analyse Riot en cours…" : "Lancer l’analyse"}</button></div></section></div>}
    </main>
  );
}
