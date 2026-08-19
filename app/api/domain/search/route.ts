import { NextRequest, NextResponse } from "next/server";
import { lookupRdap } from "@/lib/rdap";

export const dynamic = "force-dynamic";

function normalizeDomain(input: string) {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "").split("/")[0].split("?")[0];
  return value.replace(/\.$/, "");
}

function validDomain(domain: string) {
  if (domain.length > 253 || !domain.includes(".")) return false;
  return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("domain") || "";
    const domain = normalizeDomain(raw);

    if (!validDomain(domain)) {
      return NextResponse.json(
        { error: "Please enter a valid domain, e.g. example.com." },
        { status: 400 }
      );
    }

    const rdap = await lookupRdap(domain);

    if (!rdap.found) {
      return NextResponse.json({
        domain,
        available: true,
        source: "IANA RDAP",
        rdap: null
      });
    }

    return NextResponse.json({
      domain,
      available: false,
      source: "IANA RDAP",
      rdap
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Domain lookup failed." },
      { status: 500 }
    );
  }
}
