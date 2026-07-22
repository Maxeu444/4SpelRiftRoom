const timeZone = process.env.SYNC_TIME_ZONE ?? "Europe/Paris";
const localHour = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date());

// Railway planifie en UTC. Le service démarre à 05:00 et 06:00 UTC ; un seul
// de ces passages correspond à 07:xx à Paris, selon l'heure d'été ou d'hiver.
if (localHour !== "07") {
  console.log(`Skipped: it is ${localHour}:xx in ${timeZone}, not 07:xx.`);
  process.exit(0);
}

const url = process.env.CRON_SYNC_URL;
const secret = process.env.CRON_SECRET;
if (!url || !secret) throw new Error("CRON_SYNC_URL et CRON_SECRET sont requis.");

const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
const payload = await response.text();
if (!response.ok) throw new Error(`Synchronisation planifiée refusée (${response.status}) : ${payload}`);
console.log(payload);
