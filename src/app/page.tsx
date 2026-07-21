"use client";

import { useMemo, useState } from "react";
import { dashboardData } from "@/lib/mock-data";
import type { CoachingInsight, Member, PlayerStat } from "@/lib/types";

const roleLabels = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support", FILL: "Flex"
};

function formatTrend(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} %`;
}

function PlayerCard({ member, stats, active, onSelect }: { member: Member; stats: PlayerStat; active: boolean; onSelect: () => void }) {
  return (
    <button className={`player-card ${active ? "is-active" : ""}`} onClick={onSelect} type="button">
      <span className="member-orb" style={{ background: `linear-gradient(135deg, ${member.color}, #151722)` }}>{member.summoner.slice(0, 1)}</span>
      <span className="player-info"><strong>{member.summoner}</strong><small>{roleLabels[member.role]} · {member.rank}</small></span>
      <span className={stats.trend >= 0 ? "up" : "down"}>{formatTrend(stats.trend)}</span>
    </button>
  );
}

function Insight({ insight }: { insight: CoachingInsight }) {
  return (
    <article className={`insight ${insight.type}`}>
      <span className="insight-dot" />
      <div><p className="eyebrow">{insight.type === "priority" ? "Priorité de semaine" : insight.type === "success" ? "Force de l’équipe" : "À surveiller"}</p><h3>{insight.title}</h3><p>{insight.detail}</p><div className="action">↗ {insight.action}</div></div>
    </article>
  );
}

type SyncResult = {
  summary: {
    games: number;
    teamWinRate: number;
    averageDurationMinutes: number;
    averageGoldPerMinute: number;
    averageCsPerMinute: number;
    averageVisionPerMinute: number;
  } | null;
  scanned: { requestedMatchesPerPlayer: number; candidateMatches: number; retainedMatches: number };
};

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

export default function Home() {
  const [section, setSection] = useState<"team" | "coaching">("team");
  const [selectedId, setSelectedId] = useState("mid");
  const [period, setPeriod] = useState("30 derniers jours");
  const [syncOpen, setSyncOpen] = useState(false);
  const [riotIds, setRiotIds] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [syncError, setSyncError] = useState("");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const selectedMember = dashboardData.members.find((member) => member.id === selectedId) ?? dashboardData.members[0];
  const selectedStats = dashboardData.players.find((player) => player.memberId === selectedMember.id) ?? dashboardData.players[0];
  const selectedChamps = useMemo(() => dashboardData.champions.filter((champion) => champion.role === selectedMember.role), [selectedMember.role]);

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
      const response = await fetch("/api/team/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players, minTeammates: 3, matchCount: 80 })
      });
      const data = (await response.json()) as SyncResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "La synchronisation a échoué.");
      setSyncResult(data);
      setSyncState("success");
      setSyncOpen(false);
    } catch (error) {
      setSyncState("error");
      setSyncError(error instanceof Error ? error.message : "La synchronisation a échoué.");
    }
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">4</span><span className="brand-copy"><strong>4Spel</strong><small>Rift Room · LoL Coaching</small></span></div>
        <div className="team-switch"><span className="team-avatar">4S</span><div><strong>{dashboardData.teamName}</strong><small>EUW · 5 joueurs</small></div><span className="chevron">⌄</span></div>
        <nav>
          <button className={section === "team" ? "active" : ""} onClick={() => setSection("team")}><span>◫</span>Vue d’équipe</button>
          <button className={section === "coaching" ? "active" : ""} onClick={() => setSection("coaching")}><span>◇</span>Coaching</button>
          <button disabled><span>▱</span>Historique</button>
          <button disabled><span>◌</span>Champion pool</button>
        </nav>
        <div className="sidebar-bottom"><div className="sync"><span className="pulse" />Données d’exemple</div><button className="settings">⚙ Paramètres</button></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">{section === "team" ? "4Spel · Rift Room" : "Rift Room · Coaching individuel"}</p><h1>{section === "team" ? "La salle de coaching" : `${selectedMember.summoner}, ${roleLabels[selectedMember.role]}`}</h1></div>
          <div className="header-actions"><label className="select-label"><span>◷</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>30 derniers jours</option><option>14 derniers jours</option><option>Cette saison</option></select></label><button className="sync-button" onClick={() => setSyncOpen(true)}>↻ Synchroniser</button></div>
        </header>

        {section === "team" ? (
          <>
            {syncResult?.summary && <section className="live-summary"><span className="pulse" /><div><strong>Synchronisation Riot terminée</strong><p>{syncResult.scanned.retainedMatches} parties de groupe retenues sur les {syncResult.scanned.candidateMatches} candidates. Les chiffres ci-dessous restent la démo visuelle jusqu’à la persistance PostgreSQL.</p></div><div><strong>{syncResult.summary.teamWinRate} %</strong><small>win rate réel</small></div><div><strong>{syncResult.summary.averageDurationMinutes} min</strong><small>durée moyenne</small></div></section>}
            <section className="hero"><div><p className="eyebrow">4Spel Rift Room · {period} · 3+ membres</p><h2>Votre room. Votre rift.<br /><em>Votre progression.</em></h2><p className="hero-copy">Le QG de coaching 4Spel : vos synergies, vos drafts et le prochain objectif à travailler ensemble.</p></div><div className="record"><span>Score d’équipe</span><strong>7.8</strong><small>sur les 10 dernières parties</small><div className="mini-bars">{[35, 51, 42, 70, 67, 82, 73, 91, 84, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index > 4 ? "good" : ""} />)}</div></div></section>
            <section className="stat-grid">
              <article className="stat-card"><p>Parties ensemble</p><strong>{dashboardData.teamStats.matches}</strong><small className="up">+8 vs. période précédente</small></article>
              <article className="stat-card featured"><p>Win rate d’équipe</p><strong>{dashboardData.teamStats.winRate} %</strong><small className="up">{formatTrend(dashboardData.teamStats.trend)} sur 30 jours</small></article>
              <article className="stat-card"><p>Durée moyenne</p><strong>{dashboardData.teamStats.averageDuration.toFixed(1)} min</strong><small>Objectif : &lt; 30 min</small></article>
              <article className="stat-card"><p>Vision / minute</p><strong>{dashboardData.teamStats.visionPerMinute}</strong><small className="up">+0,18 sur vos victoires</small></article>
            </section>
            <section className="dashboard-grid">
              <article className="panel performance"><div className="panel-head"><div><p className="eyebrow">Rendement par rôle</p><h2>Le cinq actuel</h2></div><span className="legend"><i /> Win rate <i className="legend-secondary" /> Forme</span></div><div className="player-list">{dashboardData.members.map((member) => <PlayerCard key={member.id} member={member} stats={dashboardData.players.find((player) => player.memberId === member.id)!} active={selectedId === member.id} onSelect={() => setSelectedId(member.id)} />)}</div></article>
              <article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Lecture coaching</p><h2>Ce qui compte maintenant</h2></div><button className="text-button" onClick={() => setSection("coaching")}>Tout voir →</button></div><div className="insight-list">{dashboardData.insights.slice(0, 2).map((insight) => <Insight key={insight.title} insight={insight} />)}</div></article>
            </section>
            <section className="panel history"><div className="panel-head"><div><p className="eyebrow">Dernières parties de groupe</p><h2>Historique partagé</h2></div><span className="pill">≥ 3 membres</span></div><div className="table"><div className="row table-label"><span>Résultat</span><span>Line-up</span><span>Draft alliée</span><span>Durée</span></div>{dashboardData.matches.map((match) => <div className="row" key={match.id}><span className={`result ${match.result === "Victoire" ? "win" : "loss"}`}><i />{match.result}<small>{match.playedAt}</small></span><span className="lineup">{match.lineup.map((name) => <b key={name}>{name.slice(0, 1)}</b>)}<small>{match.lineup.length}/5 présents</small></span><span className="comp">{match.composition}</span><span>{match.duration}</span></div>)}</div></section>
          </>
        ) : (
          <section className="coaching-view">
            <div className="member-tabs">{dashboardData.members.map((member) => <button type="button" className={member.id === selectedId ? "active" : ""} key={member.id} onClick={() => setSelectedId(member.id)}>{member.summoner}<small>{roleLabels[member.role]}</small></button>)}</div>
            <section className="focus-card"><div className="focus-profile"><span className="large-orb" style={{ background: `linear-gradient(135deg, ${selectedMember.color}, #151722)` }}>{selectedMember.summoner.slice(0, 1)}</span><div><p className="eyebrow">Profil de jeu · {selectedMember.rank}</p><h2>{selectedMember.summoner}</h2><p>{selectedMember.riotId} · {roleLabels[selectedMember.role]}</p></div></div><div className="focus-score"><small>Indice de forme</small><strong>{selectedStats.trend > 0 ? "8.4" : "6.7"}</strong><span className={selectedStats.trend > 0 ? "up" : "down"}>{formatTrend(selectedStats.trend)} sur 30 jours</span></div></section>
            <section className="stat-grid individual"><article className="stat-card"><p>Win rate</p><strong>{selectedStats.winRate} %</strong><small>{selectedStats.games} parties d’équipe</small></article><article className="stat-card"><p>KDA</p><strong>{selectedStats.kda}</strong><small>kills + assists / deaths</small></article><article className="stat-card"><p>Or / minute</p><strong>{selectedStats.goldPerMinute}</strong><small>avec le roster actuel</small></article><article className="stat-card"><p>CS / minute</p><strong>{selectedStats.csPerMinute}</strong><small>moyenne sur {period.toLowerCase()}</small></article></section>
            <section className="dashboard-grid coaching-detail"><article className="panel"><div className="panel-head"><div><p className="eyebrow">Champion pool</p><h2>Confort & rendement</h2></div></div>{selectedChamps.length ? selectedChamps.map((champion) => <div className="champion-row" key={champion.champion}><span className="champ-icon">{champion.champion.slice(0, 1)}</span><div><strong>{champion.champion}</strong><small>{champion.games} parties · {champion.kda} KDA</small></div><div className="champ-score"><strong>{champion.winRate} %</strong><small>win rate</small></div><div className="meter"><i style={{ width: `${champion.score}%` }} /></div></div>) : <p className="empty-state">Pas assez de parties sur ce rôle pour évaluer un champion.</p>}</article><article className="panel coaching-panel"><div className="panel-head"><div><p className="eyebrow">Plan individuel</p><h2>Prochain entraînement</h2></div></div><div className="training"><span>01</span><div><h3>Revoir le premier recall</h3><p>Compare ton timing de reset avec celui de ton jungler avant le premier objectif.</p></div></div><div className="training"><span>02</span><div><h3>Fixer un KPI simple</h3><p>Atteindre {selectedMember.role === "UTILITY" ? "2,5" : "6,8"} CS/min avant 14 min sur les trois prochaines scrims.</p></div></div><button className="full-button">Ajouter une note de VOD</button></article></section>
            <section className="panel all-insights"><div className="panel-head"><div><p className="eyebrow">Diagnostic associé</p><h2>Conseils à traiter</h2></div></div><div className="insight-list">{dashboardData.insights.map((insight) => <Insight key={insight.title} insight={insight} />)}</div></section>
          </section>
        )}
      </section>
      {syncOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => syncState !== "loading" && setSyncOpen(false)}><section className="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label="Fermer" onClick={() => setSyncOpen(false)}>×</button><p className="eyebrow">Connexion Riot</p><h2 id="sync-title">Synchroniser les parties de l’équipe</h2><p className="modal-copy">Entre 3 à 5 Riot ID. L’outil ne garde que les parties où au moins trois d’entre vous sont dans le même camp.</p><label className="riot-label">Riot ID <span>un par ligne</span><textarea value={riotIds} onChange={(event) => { setRiotIds(event.target.value); setSyncState("idle"); }} placeholder={"Joueur 1#EUW\nJoueur 2#EUW\nJoueur 3#EUW"} rows={6} autoFocus /></label>{syncState === "error" && <p className="form-error">{syncError}</p>}<div className="modal-footer"><small>La clé API reste côté serveur. Route : EUROPE / EUW.</small><button className="sync-button" type="button" onClick={syncTeam} disabled={syncState === "loading"}>{syncState === "loading" ? "Analyse des parties…" : "Lancer l’analyse"}</button></div></section></div>}
    </main>
  );
}
