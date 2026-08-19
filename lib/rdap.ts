type RdapResult = {
  found: boolean;
  registrar?: string;
  created?: string;
  updated?: string;
  expires?: string;
  status?: string[];
  nameservers?: string[];
  dnssec?: string;
};

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";

export async function lookupRdap(domain: string): Promise<RdapResult> {
  const bootstrapRes = await fetch(BOOTSTRAP_URL, { cache: "no-store" });
  if (!bootstrapRes.ok) throw new Error("Unable to load RDAP bootstrap data.");

  const bootstrap = await bootstrapRes.json();
  const tld = domain.split(".").pop()?.toLowerCase();

  const service = bootstrap.services?.find(
    (entry: any[]) =>
      Array.isArray(entry[0]) &&
      entry[0].some((suffix: string) => suffix.toLowerCase() === tld)
  );

  if (!service) {
    throw new Error(`RDAP is not available for .${tld}.`);
  }

  const base = service[1]?.[0];
  if (!base) throw new Error("No RDAP server found.");

  const url = `${base.replace(/\/$/, "")}/domain/${encodeURIComponent(domain)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/rdap+json, application/json" },
    cache: "no-store"
  });

  if (response.status === 404) return { found: false };
  if (!response.ok) {
    throw new Error(`RDAP lookup failed with status ${response.status}.`);
  }

  const data = await response.json();

  return {
    found: true,
    registrar: extractRegistrar(data),
    created: extractEvent(data.events, "registration"),
    updated: extractEvent(data.events, "last changed"),
    expires: extractEvent(data.events, "expiration"),
    status: data.status || [],
    nameservers: (data.nameservers || [])
      .map((n: any) => n.ldhName || n.unicodeName)
      .filter(Boolean),
    dnssec: data.secureDNS?.delegationSigned
      ? "signed"
      : "not signed"
  };
}

function extractEvent(events: any[], action: string) {
  return events?.find((e) => e.eventAction === action)?.eventDate;
}

function extractRegistrar(data: any) {
  const entity = data.entities?.find((e: any) =>
    e.roles?.includes("registrar")
  );
  return entity?.vcardArray?.[1]?.find(
    (item: any[]) => item[0] === "fn"
  )?.[3];
}
