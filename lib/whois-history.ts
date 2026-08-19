export type HistoryEvent = {
  date?: string;
  event?: string;
  registrar?: string;
  nameservers?: string[];
  status?: string[];
};

export async function lookupWhoisHistory(domain: string): Promise<{
  enabled: boolean;
  history: HistoryEvent[];
}> {
  const apiKey = process.env.WHOISFREAKS_API_KEY;
  const apiUrl = process.env.WHOISFREAKS_API_URL;

  if (!apiKey || !apiUrl) {
    return { enabled: false, history: [] };
  }

  const url = new URL(apiUrl);
  url.searchParams.set("whois", domain);
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!response.ok) {
    return { enabled: true, history: [] };
  }

  const data = await response.json();
  return { enabled: true, history: normalizeHistory(data) };
}

function normalizeHistory(data: any): HistoryEvent[] {
  const records = data?.history || data?.records || data?.whois_history || [];

  if (!Array.isArray(records)) return [];

  return records.map((r: any) => ({
    date: r.date || r.updated_date || r.created_date || r.timestamp,
    event: r.event || r.action || "WHOIS record",
    registrar: r.registrar || r.registrar_name,
    nameservers: r.nameservers || r.name_servers,
    status: r.status || r.domain_status
  }));
}