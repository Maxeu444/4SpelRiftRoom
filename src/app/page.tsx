"use client";

import { useMemo, useState } from "react";
import type { ChampionAnalysis, ObjectiveSetup, PlayerAnalysis, SyncedMatch, TeamAnalysis, TimelinePlayerStats } from "@/lib/analytics";
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
          <article><span>Vision objectif</span><strong>{formatMetric(timeline.objectiveVisionRate, "%")}</strong><small>ward alliée 90 s avant, rayon 2 500</small></article>
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
  return (
    <section className="coaching-view">
      <div className="member-tabs">{analysis.players.map((player) => { const role = roleAssignments[player.puuid] ?? player.role; return <button type="button" className={player.puuid === selectedPlayer.puuid ? "active" : ""} key={player.puuid} onClick={() => onSelect(player.puuid)}>{player.displayName}<small>{roleLabels[role]}</small></button>; })}</div>
      <section className="focus-card"><div className="focus-profile"><span className="large-orb" style={{ background: roleColors[selectedRole] }}>{selectedPlayer.displayName.slice(0, 1)}</span><div><p className="eyebrow">Profil Riot synchronisé · {roleLabels[selectedRole]}</p><h2>{selectedPlayer.displayName}</h2><p>{selectedPlayer.riotId}</p></div></div><div className="focus-score"><small>Win rate sur ce rôle</small><strong>{selectedRoleStats.winRate} %</strong><span>{selectedRoleStats.games} partie{selectedRoleStats.games > 1 ? "s" : ""} de groupe</span></div></section>
      <RolePicker player={selectedPlayer} role={selectedRole} onRoleChange={(role) => onRoleChange(selectedPlayer.puuid, role)} />
      <section className="stat-grid individual compact-grid"><article className="stat-card"><p>Win rate</p><strong>{selectedRoleStats.winRate} %</strong><small>{selectedRoleStats.games} parties sur ce rôle</small></article><article className="stat-card"><p>Morts / partie</p><strong>{formatMetric(selectedRoleStats.timeline.deathsPerGame, "", 1)}</strong><small>{selectedRoleStats.timeline.timelineGames} timelines</small></article><article className="stat-card"><p>Morts à risque</p><strong>{formatMetric(selectedRoleStats.timeline.riskyDeathsPerGame, "", 1)}</strong><small>piste de review</small></article><article className="stat-card"><p>{farm.tenLabel}</p><strong>{formatMetric(farm.ten)}</strong><small>{farm.fifteenLabel} : {formatMetric(farm.fifteen)}</small></article><article className="stat-card"><p>Wards / partie</p><strong>{formatMetric(selectedRoleStats.timeline.wardsPerGame, "", 1)}</strong><small>{formatMetric(selectedRoleStats.timeline.wardsBeforeObjectivesPerGame, "", 1)} avant objectifs</small></article><article className="stat-card"><p>Présence objectif</p><strong>{formatMetric(selectedRoleStats.timeline.objectiveParticipationRate, "%")}</strong><small>rayon Timeline autour des objectifs</small></article></section>
      <section className="dashboard-grid coaching-detail"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Champions réellement joués</p><h2>Champion pool · {roleLabels[selectedRole]}</h2></div></div>{selectedChampions.length ? selectedChampions.map((champion: ChampionAnalysis) => <div className="champion-row" key={`${champion.role}:${champion.champion}`}><span className="champ-icon">{champion.champion.slice(0, 1)}</span><div><strong>{champion.champion}</strong><small>{roleLabels[champion.role]} · {champion.games} partie{champion.games > 1 ? "s" : ""} · {champion.kda} KDA</small></div><div className="champ-score"><strong>{champion.winRate} %</strong><small>win rate</small></div><div className="meter"><i style={{ width: `${champion.winRate}%` }} /></div></div>) : <p className="empty-state">Aucun champion analysable sur les parties synchronisées.</p>}</article><article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Repères de jeu</p><h2>Mesures · {roleLabels[selectedRole]}</h2></div></div><div className="training"><span>01</span><div><h3>Sécurité</h3><p>{formatMetric(selectedRoleStats.timeline.riskyDeathsPerGame, "", 1)} mort(s) à risque par partie Timeline. Utilisez-les comme points de départ pour la VOD.</p></div></div><div className="training"><span>02</span><div><h3>Lane & tempo</h3><p>{farm.tenLabel} {formatMetric(farm.ten)} puis {farm.fifteenLabel} {formatMetric(farm.fifteen)} sur les parties de groupe jouées à ce rôle.</p></div></div><div className="training"><span>03</span><div><h3>Objectifs</h3><p>{formatMetric(selectedRoleStats.timeline.wardsBeforeObjectivesPerGame, "", 1)} ward(s) posée(s) autour des objectifs et {formatMetric(selectedRoleStats.timeline.objectiveParticipationRate, "%")} de présence.</p></div></div></article></section>
      <section className="panel all-insights"><div className="panel-head"><div><p className="eyebrow">Diagnostic calculé</p><h2>Conseils fondés sur les données synchronisées</h2></div></div><div className="insight-list">{analysis.insights.map((insight) => <Insight key={insight.title} insight={insight} />)}</div></section>
    </section>
  );
}

function ReviewDashboard({ analysis, onSync }: { analysis: TeamAnalysis | null; onSync: () => void }) {
  if (!analysis) return <EmptyDashboard onSync={onSync} coaching />;
  const review = analysis.sessionReview;
  const statusLabel = { "on-track": "Dans le bon sens", watch: "À stabiliser", review: "À valider" };
  return <section className="review-view"><section className="review-hero"><div><p className="eyebrow">Bilan de session · instantané</p><h2>{review?.title ?? "Synchronisez des parties pour lancer la review"}</h2><p>{review?.evidence ?? "Rift Room produira une priorité lorsque les données de groupe seront disponibles."}</p></div>{review && <div className="review-action"><span>Une seule action suivante</span><strong>{review.nextAction}</strong></div>}</section><section className="panel milestones"><div className="panel-head"><div><p className="eyebrow">Playbook 4Spel</p><h2>Les quatre paliers, à cette session</h2></div><span className="pill">Non sauvegardé</span></div><p className="session-note">Sans base de données, ce suivi est recalculé à la synchronisation et ne trace pas encore votre progression dans le temps.</p><div className="milestone-grid">{analysis.milestones.map((milestone) => <article className={`milestone ${milestone.status}`} key={milestone.id}><div><span className="milestone-status">{statusLabel[milestone.status]}</span><h3>{milestone.title}</h3><p>{milestone.evidence}</p></div><div className="milestone-action">↗ {milestone.action}</div>{!milestone.automated && <small>Validation humaine recommandée</small>}</article>)}</div></section><section className="dashboard-grid review-grid"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Draft · cinq joueurs du roster</p><h2>Résultats par plan de compo</h2></div></div>{analysis.draft.compositions.length ? <div className="draft-list">{analysis.draft.compositions.map((composition) => <div className="draft-row" key={composition.label}><span>{composition.label}</span><small>{composition.games} partie{composition.games > 1 ? "s" : ""}</small><strong>{composition.winRate} %</strong></div>)}</div> : <p className="empty-state">Il faut une partie où les cinq joueurs renseignés ont joué ensemble. La classification est volontairement simple : engage, pick, scaling ou hybride.</p>}</article><article className="panel"><div className="panel-head"><div><p className="eyebrow">Bans rencontris</p><h2>Ce que les adversaires retirent</h2></div></div>{analysis.draft.opponentBans.length ? <div className="draft-list bans-list">{analysis.draft.opponentBans.map((ban) => <div className="draft-row" key={ban.champion}><span>{ban.champion}</span><strong>{ban.bans} ban{ban.bans > 1 ? "s" : ""}</strong></div>)}</div> : <p className="empty-state">Aucun ban adverse exploitable n'a été retourné par les parties synchronisées.</p>}</article></section><section className="panel methodology"><p className="eyebrow">Méthode</p><h2>Ce que le tableau mesure — et ce qu'il ne prétend pas savoir</h2><p>Les wards et les événements d'objectif sont issus de la Timeline. Les positions sont des instantanés : la présence d'équipe est donc un proxy. Les paliers « teamfights » et « draft avec intention » doivent être confirmés pendant votre review, pas délégués aveuglément à une formule.</p></section></section>;
}

export default function Home() {
  const [section, setSection] = useState<"team" | "coaching" | "review">("team");
  const [selectedId, setSelectedId] = useState("");
  const [roleAssignments, setRoleAssignments] = useState<Record<string, Role>>({});
  const [syncOpen, setSyncOpen] = useState(false);
  const [riotIds, setRiotIds] = useState(defaultRoster);
  const [syncState, setSyncState] = useState<"idle" | "loading" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const analysis = syncResult?.analysis ?? null;
  const selectedPlayer = analysis?.players.find((player) => player.puuid === selectedId) ?? analysis?.players[0];
  const selectedRole = selectedPlayer ? roleAssignments[selectedPlayer.puuid] ?? selectedPlayer.role : "FILL";

  function updatePlayerRole(playerId: string, role: Role) {
    setRoleAssignments((current) => ({ ...current, [playerId]: role }));
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
      const response = await fetch("/api/team/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ players, minTeammates: 3, matchCount: 80 }) });
      const data = (await response.json()) as SyncResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "La synchronisation a échoué.");
      setSyncResult(data);
      setSelectedId(data.analysis.players[0]?.puuid ?? "");
      setRoleAssignments((current) => Object.fromEntries(data.analysis.players.map((player) => [player.puuid, current[player.puuid] ?? player.role])));
      setSyncState("idle");
      setSyncOpen(false);
      setSection("team");
    } catch (error) {
      setSyncState("error");
      setSyncError(error instanceof Error ? error.message : "La synchronisation a échoué.");
    }
  }

  const heading = section === "team" ? "La salle de coaching" : section === "review" ? "Review de session" : selectedPlayer ? `${selectedPlayer.displayName}, ${roleLabels[selectedRole]}` : "Coaching individuel";
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">4</span><span className="brand-copy"><strong>4SPEL</strong><small>Rift Room · LoL Coaching</small></span></div>
        <div className="team-switch"><span className="team-avatar">4S</span><div><strong>{syncResult ? "Roster synchronisé" : "Roster 4Spel"}</strong><small>{syncResult ? `${syncResult.roster.length} joueurs Riot` : "Prêt à analyser"}</small></div><span className="chevron">⌄</span></div>
        <nav><button className={section === "team" ? "active" : ""} onClick={() => setSection("team")}><span>◫</span>Vue d'équipe</button><button className={section === "coaching" ? "active" : ""} onClick={() => setSection("coaching")}><span>◇</span>Coaching</button><button className={section === "review" ? "active" : ""} onClick={() => setSection("review")}><span>✦</span>Review & draft</button></nav>
        <div className="sidebar-bottom"><div className="sync"><span className="pulse" />{syncResult ? "Données Riot en session" : "Aucune donnée affichée"}</div><button className="settings" type="button" onClick={() => setSyncOpen(true)}>⚙ Synchroniser</button></div>
      </aside>
      <section className="content">
        <header className="topbar"><div><p className="eyebrow">{section === "team" ? "4SPEL · RIFT ROOM" : section === "review" ? "4SPEL · PLAYBOOK & REVIEW" : "RIFT ROOM · COACHING INDIVIDUEL"}</p><h1>{heading}</h1></div><div className="header-actions"><button className="sync-button" onClick={() => setSyncOpen(true)}>↻ Synchroniser</button></div></header>
        {section === "team" ? (syncResult ? <TeamDashboard result={syncResult} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelectPlayer={setSelectedId} onShowCoaching={() => setSection("coaching")} onSync={() => setSyncOpen(true)} /> : <EmptyDashboard onSync={() => setSyncOpen(true)} />) : section === "coaching" ? <CoachingDashboard analysis={analysis} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelect={setSelectedId} onSync={() => setSyncOpen(true)} /> : <ReviewDashboard analysis={analysis} onSync={() => setSyncOpen(true)} />}
      </section>
      {syncOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => syncState !== "loading" && setSyncOpen(false)}><section className="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Fermer" onClick={() => syncState !== "loading" && setSyncOpen(false)}>×</button><p className="eyebrow">Connexion Riot</p><h2 id="sync-title">Synchroniser les parties de l'équipe</h2><p className="modal-copy">Entrez 3 à 5 Riot ID. Rift Room ne montre aucune donnée fictive : les statistiques et événements viennent uniquement des parties Riot trouvées pour ce roster.</p><label className="riot-label">Riot ID <span>un par ligne</span><textarea value={riotIds} onChange={(event) => { setRiotIds(event.target.value); setSyncState("idle"); }} placeholder={defaultRoster} rows={6} autoFocus /></label>{syncState === "error" && <p className="form-error">{syncError}</p>}<div className="modal-footer"><small>Les timelines demandent des appels Riot supplémentaires. Avec une clé de développement, l'analyse peut prendre une à deux minutes.</small><button className="sync-button" type="button" onClick={syncTeam} disabled={syncState === "loading"}>{syncState === "loading" ? "Analyse Riot en cours…" : "Lancer l'analyse"}</button></div></section></div>}
    </main>
  );
}
