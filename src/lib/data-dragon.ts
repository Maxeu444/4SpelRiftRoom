type ChampionIndexResponse = {
  data: Record<string, { id: string; key: string; name: string }>;
};

export type ChampionCatalog = {
  namesById: Record<number, string>;
  imagesByName: Record<string, string>;
};

export async function getChampionCatalog(): Promise<ChampionCatalog> {
  try {
    const versionsResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
      next: { revalidate: 86_400 }
    });
    if (!versionsResponse.ok) return { namesById: {}, imagesByName: {} };
    const versions = (await versionsResponse.json()) as string[];
    const version = versions[0];
    if (!version) return { namesById: {}, imagesByName: {} };
    const championsResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`, {
      next: { revalidate: 86_400 }
    });
    if (!championsResponse.ok) return { namesById: {}, imagesByName: {} };
    const payload = (await championsResponse.json()) as ChampionIndexResponse;
    return Object.values(payload.data).reduce<ChampionCatalog>((catalog, champion) => {
      const championId = Number(champion.key);
      if (Number.isFinite(championId)) catalog.namesById[championId] = champion.name;
      catalog.imagesByName[champion.name] = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
      return catalog;
    }, { namesById: {}, imagesByName: {} });
  } catch {
    // Le scan Riot reste utile si Data Dragon est momentanément indisponible.
    return { namesById: {}, imagesByName: {} };
  }
}

export async function getChampionNamesById(): Promise<Record<number, string>> {
  return (await getChampionCatalog()).namesById;
}
