# 4Spel Rift Room — coaching League of Legends

**Rift Room** est le QG de coaching de **4Spel** : un tableau de bord privé pour Clash / Flex, avec statistiques de groupe, lecture par rôle/champion et recommandations actionnables.

## Choix de stack

- **Next.js + TypeScript** : une seule web app pour l’interface, les routes API serveur et l’authentification future.
- **Riot API Match-V5** : source de vérité pour les comptes, historiques et détails de parties.
- **PostgreSQL sur Railway** : persistance de l’équipe, des parties synchronisées, des timelines Riot et des notes de coaching.
- **Python / FastAPI** *(quand le volume le justifie)* : calculs historiques lourds, modèles de tendances et génération de rapports. Il n’est pas nécessaire pour le premier MVP : les agrégations courantes tiennent très bien dans TypeScript côté serveur.

## Lancer le prototype

1. Installer Node.js 20.9+ (Node 22 LTS recommandé), puis `pnpm install`.
2. Copier `.env.example` en `.env.local` et renseigner une clé API Riot.
3. Exécuter `pnpm dev`, puis ouvrir `http://localhost:3000`.

## Persistance PostgreSQL

La synchronisation enregistre un instantané complet de l'analyse pour restaurer le dernier tableau de bord après un rechargement. La base conserve aussi les données Riot sources : matchs bruts (`jsonb`), participants normalisés, timelines et l'ordre de chaque échantillon. Les migrations SQL, indépendantes de Node.js, restent donc réutilisables par une future API FastAPI.

1. Créer un PostgreSQL dans le projet Railway.
2. Dans le service Next.js, ajouter une variable de référence `DATABASE_URL` qui pointe vers celle du service PostgreSQL. Utiliser l'URL privée, pas `DATABASE_PUBLIC_URL`.
3. En local, renseigner `DATABASE_URL` dans `.env.local`, puis exécuter `pnpm db:migrate`.
4. Railway exécute automatiquement cette même commande avant chaque déploiement grâce à `railway.toml`.

Les migrations sont dans `db/migrations/`. Elles ne doivent jamais être modifiées une fois appliquées : ajouter un nouveau fichier numéroté pour chaque évolution du schéma.

## Déployer Next.js sur Railway

1. Pousser ce dépôt sur GitHub, puis créer un projet Railway dans une région européenne.
2. Ajouter **PostgreSQL** au canvas, puis **GitHub Repo** et sélectionner ce dépôt pour créer le service web.
3. Dans le service web, ouvrir **Variables** et créer la référence `DATABASE_URL` vers le service PostgreSQL. Ajouter aussi `RIOT_API_KEY`, `RIOT_REGIONAL_ROUTING=EUROPE` et, si nécessaire, `RIOT_REQUEST_INTERVAL_MS=1100`.
4. Railway détecte le projet Node/Next. Le fichier `railway.toml` impose `pnpm build`, lance `pnpm db:migrate` avant publication, puis démarre l'application avec `pnpm start`.
5. Dans **Settings → Networking**, générer un domaine public. La clé Riot et l'URL de base restent des variables serveur, jamais préfixées par `NEXT_PUBLIC_`.

Lorsque FastAPI sera ajouté, le placer comme un second service dans ce même projet, référencer le même `DATABASE_URL` privé et conserver les migrations SQL comme contrat commun entre les deux applications.

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
