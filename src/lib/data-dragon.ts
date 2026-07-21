type ChampionIndexResponse = {
  data: Record<string, { key: string; name: string }>;
};

export async function getChampionNamesById(): Promise<Record<number, string>> {
  try {
    const versionsResponse = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
      next: { revalidate: 86_400 }
    });
    if (!versionsResponse.ok) return {};
    const versions = (await versionsResponse.json()) as string[];
    const version = versions[0];
    if (!version) return {};
    const championsResponse = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/fr_FR/champion.json`, {
      next: { revalidate: 86_400 }
    });
    if (!championsResponse.ok) return {};
    const payload = (await championsResponse.json()) as ChampionIndexResponse;
    return Object.values(payload.data).reduce<Record<number, string>>((names, champion) => {
      const championId = Number(champion.key);
      if (Number.isFinite(championId)) names[championId] = champion.name;
      return names;
    }, {});
  } catch {
    // Le scan Riot reste utile si Data Dragon est momentanément indisponible.
    return {};
  }
}
