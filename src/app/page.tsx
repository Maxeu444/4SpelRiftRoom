"use client";

import { useMemo, useState } from "react";
import type { ChampionAnalysis, PlayerAnalysis, SyncedMatch, TeamAnalysis } from "@/lib/analytics";
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
  const [section, setSection] = useState<"team" | "coaching">("team");
  const [selectedId, setSelectedId] = useState("");
  const [roleAssignments, setRoleAssignments] = useState<Record<string, Role>>({});
  const [syncOpen, setSyncOpen] = useState(false);
  const [riotIds, setRiotIds] = useState("");
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

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">4</span><span className="brand-copy"><strong>4SPEL</strong><small>Rift Room · LoL Coaching</small></span></div>
        <div className="team-switch"><span className="team-avatar">4S</span><div><strong>{syncResult ? "Roster synchronisé" : "Aucun roster"}</strong><small>{syncResult ? `${syncResult.roster.length} joueurs Riot` : "Ajoutez votre équipe"}</small></div><span className="chevron">⌄</span></div>
        <nav><button className={section === "team" ? "active" : ""} onClick={() => setSection("team")}><span>◫</span>Vue d’équipe</button><button className={section === "coaching" ? "active" : ""} onClick={() => setSection("coaching")}><span>◇</span>Coaching</button></nav>
        <div className="sidebar-bottom"><div className="sync"><span className="pulse" />{syncResult ? "Données Riot en session" : "Aucune donnée affichée"}</div><button className="settings" type="button" onClick={() => setSyncOpen(true)}>⚙ Synchroniser</button></div>
      </aside>
      <section className="content">
        <header className="topbar"><div><p className="eyebrow">{section === "team" ? "4SPEL · RIFT ROOM" : "RIFT ROOM · COACHING INDIVIDUEL"}</p><h1>{section === "team" ? "La salle de coaching" : selectedPlayer ? `${selectedPlayer.displayName}, ${roleLabels[selectedRole]}` : "Coaching individuel"}</h1></div><div className="header-actions"><button className="sync-button" onClick={() => setSyncOpen(true)}>↻ Synchroniser</button></div></header>
        {section === "team" ? (syncResult ? <TeamDashboard result={syncResult} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelectPlayer={setSelectedId} onShowCoaching={() => setSection("coaching")} onSync={() => setSyncOpen(true)} /> : <EmptyDashboard onSync={() => setSyncOpen(true)} />) : <CoachingDashboard analysis={analysis} selectedId={selectedPlayer?.puuid ?? ""} roleAssignments={roleAssignments} onRoleChange={updatePlayerRole} onSelect={setSelectedId} onSync={() => setSyncOpen(true)} />}
      </section>
      {syncOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => syncState !== "loading" && setSyncOpen(false)}><section className="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Fermer" onClick={() => setSyncOpen(false)}>×</button><p className="eyebrow">Connexion Riot</p><h2 id="sync-title">Synchroniser les parties de l’équipe</h2><p className="modal-copy">Entrez 3 à 5 Riot ID. Aucun résultat fictif ne sera affiché : Rift Room utilise uniquement les parties Riot trouvées pour votre roster.</p><label className="riot-label">Riot ID <span>un par ligne</span><textarea value={riotIds} onChange={(event) => { setRiotIds(event.target.value); setSyncState("idle"); }} placeholder={"Joueur 1#EUW\nJoueur 2#EUW\nJoueur 3#EUW"} rows={6} autoFocus /></label>{syncState === "error" && <p className="form-error">{syncError}</p>}<div className="modal-footer"><small>La clé API reste côté serveur. L’analyse peut durer jusqu’à une minute avec une clé de développement.</small><button className="sync-button" type="button" onClick={syncTeam} disabled={syncState === "loading"}>{syncState === "loading" ? "Analyse Riot en cours…" : "Lancer l’analyse"}</button></div></section></div>}
    </main>
  );
}
