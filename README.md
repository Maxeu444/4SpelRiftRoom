# 4Spel Rift Room — coaching League of Legends

**Rift Room** est le QG de coaching de **4Spel** : un tableau de bord privé pour Clash / Flex, avec statistiques de groupe, lecture par rôle/champion et recommandations actionnables.

## Choix de stack

- **Next.js + TypeScript** : une seule web app pour l’interface, les routes API serveur et l’authentification future.
- **Riot API Match-V5** : source de vérité pour les comptes, historiques et détails de parties.
- **PostgreSQL** *(prochaine étape)* : persistance de l’équipe, des parties synchronisées et des notes de coaching.
- **Python / FastAPI** *(quand le volume le justifie)* : calculs historiques lourds, modèles de tendances et génération de rapports. Il n’est pas nécessaire pour le premier MVP : les agrégations courantes tiennent très bien dans TypeScript côté serveur.

## Lancer le prototype

1. Installer Node.js 20.9+ (Node 22 LTS recommandé), puis `pnpm install`.
2. Copier `.env.example` en `.env.local` et renseigner une clé API Riot.
3. Exécuter `pnpm dev`, puis ouvrir `http://localhost:3000`.

Le tableau de bord n’affiche aucune donnée tant qu’aucune synchronisation n’est demandée. L’endpoint `POST /api/team/scan` reçoit les Riot ID de l’équipe, croise les Match ID pour ne retenir que les parties avec au moins trois membres jouant dans le même camp, puis calcule les agrégats de groupe, de joueur et de champion. Il analyse les 20 parties de groupe les plus récentes et cadence automatiquement les appels pour respecter les clés de développement Riot.

Exemple :

```json
{
  "players": [
    { "gameName": "Pseudo", "tagLine": "EUW" },
    { "gameName": "Coéquipier", "tagLine": "EUW" },
    { "gameName": "Jungler", "tagLine": "EUW" }
  ],
  "regionalRouting": "EUROPE",
  "minTeammates": 3,
  "matchCount": 100
}
```

## Données et principes de coaching

Le score d’une équipe ne doit pas se limiter au KDA. Le prototype suit aussi :

- win rate, durée et volume de parties jouées ensemble ;
- or/minute, CS/minute et vision/minute ;
- performance par rôle et champion ;
- fenêtres de tendance (5 dernières parties) et recommandations accompagnées d’un chiffre.

Pour que l’historique soit fiable à grande échelle, la prochaine itération stockera chaque Match ID, le JSON normalisé et une version des formules de calcul. Ainsi, une correction d’algorithme peut être rejouée sans refaire inutilement les appels Riot.

## Contraintes Riot importantes

- La clé API reste strictement côté serveur dans `RIOT_API_KEY` ; elle n’est jamais préfixée `NEXT_PUBLIC_`.
- Une clé de développement expire toutes les 24 h. Pour cette petite équipe, demandez ensuite une clé personnelle.
- Le scanner respecte les croisements de Match ID et ne télécharge les détails que des parties de groupe : cela réduit fortement la consommation de quota.
- L’outil reste post-game / coaching : aucune information temps réel ne doit donner un avantage compétitif interdit.

Avant un déploiement public, ajouter une page de confidentialité, l’opt-in nécessaire et enregistrer le produit sur le portail Riot.
