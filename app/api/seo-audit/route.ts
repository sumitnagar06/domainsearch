import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 2_500_000;
const REQUEST_TIMEOUT = 15_000;
const MAX_REDIRECTS = 3;

type CheckStatus = "pass" | "warning" | "fail";

type Check = {
  id: string;
  title: string;
  status: CheckStatus;
  message: string;
  details?: string;
  category: "On-Page SEO" | "Technical SEO" | "Content" | "Social" | "Performance" | "Security";
};

type AuditResult = {
  url: string;
  finalUrl: string;
  score: number;
  checkedAt: string;
  responseTimeMs: number;
  statusCode: number;
  contentType: string;
  pageSize: number;
  checks: Check[];
  summary: { pass: number; warning: number; fail: number };
  counts: { words: number; headings: number; images: number; links: number; scripts: number; stylesheets: number };
};

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

async function assertPublicHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    host === "169.254.169.254"
  ) {
    throw new Error("Private or local addresses cannot be audited.");
  }

  if (net.isIP(host)) {
    if ((net.isIP(host) === 4 && isPrivateIpv4(host)) || (net.isIP(host) === 6 && isPrivateIpv6(host))) {
      throw new Error("Private or local addresses cannot be audited.");
    }
    return;
  }

  const records = await dns.lookup(host, { all: true });
  if (!records.length) throw new Error("The website hostname could not be resolved.");

  for (const record of records) {
    if ((record.family === 4 && isPrivateIpv4(record.address)) || (record.family === 6 && isPrivateIpv6(record.address))) {
      throw new Error("The website resolves to a private or local address and cannot be audited.");
    }
  }
}

async function fetchPublicUrl(input: string) {
  let current = input;
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const parsed = new URL(current);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
    await assertPublicHost(parsed.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "WHOIS-CHOICE-SEO-Audit/1.0 (+https://www.whoischoice.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return { response, finalUrl: current };
        current = new URL(location, current).toString();
        continue;
      }

      return { response, finalUrl: current };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects. Please audit the final page URL directly.");
}

async function readLimitedText(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("The page is larger than the 2.5 MB audit limit.");
    }
    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string) {
  return decodeBasicEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function getTagContent(html: string, tag: string) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function getAttribute(html: string, tag: string, attribute: string) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*\\b${attribute}\\s*=\\s*(["'])(.*?)\\1[^>]*>`, "i"));
  return match?.[2]?.trim() || "";
}

function getMeta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\b(?:name|property)\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim().toLowerCase();
    if (name === key.toLowerCase()) {
      return tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2]?.trim() || "";
    }
  }
  return "";
}

function countMatches(html: string, regex: RegExp) {
  return (html.match(regex) || []).length;
}

function wordCount(html: string) {
  const body = getTagContent(html, "body");
  return body ? body.split(/\s+/).filter(Boolean).length : 0;
}

function addCheck(checks: Check[], check: Check) {
  checks.push(check);
}

function scoreChecks(checks: Check[]) {
  const weights: Record<CheckStatus, number> = { pass: 1, warning: 0.55, fail: 0 };
  if (!checks.length) return 0;
  const total = checks.reduce((sum, check) => sum + weights[check.status], 0);
  return Math.round((total / checks.length) * 100);
}

export async function GET(request: Request) {
  const started = Date.now();

  try {
    const urlParam = new URL(request.url).searchParams.get("url")?.trim();
    if (!urlParam) return NextResponse.json({ error: "Please enter a website URL." }, { status: 400 });

    let inputUrl = urlParam;
    if (!/^https?:\/\//i.test(inputUrl)) inputUrl = `https://${inputUrl}`;

    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      return NextResponse.json({ error: "Please enter a valid website URL." }, { status: 400 });
    }

    if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Please enter a valid HTTP or HTTPS website URL." }, { status: 400 });
    }

    const { response, finalUrl } = await fetchPublicUrl(parsed.toString());
    const contentType = response.headers.get("content-type") || "";
    const html = contentType.includes("text/html") || contentType.includes("application/xhtml+xml")
      ? await readLimitedText(response)
      : "";

    if (!html) {
      return NextResponse.json({ error: "The URL did not return an HTML page that can be audited." }, { status: 422 });
    }

    const final = new URL(finalUrl);
    const title = getTagContent(html, "title");
    const description = getMeta(html, "description");
    const robots = getMeta(html, "robots");
    const viewport = getMeta(html, "viewport");
    const canonical = getAttribute(html, "link", "canonical");
    const lang = html.match(/<html\b[^>]*\blang\s*=\s*(["'])(.*?)\1[^>]*>/i)?.[2]?.trim() || "";
    const h1 = countMatches(html, /<h1\b[^>]*>/gi);
    const h2 = countMatches(html, /<h2\b[^>]*>/gi);
    const h3 = countMatches(html, /<h3\b[^>]*>/gi);
    const images = html.match(/<img\b[^>]*>/gi) || [];
    const missingAlt = images.filter((img) => !/\balt\s*=\s*(["'])/i.test(img)).length;
    const scripts = countMatches(html, /<script\b/gi);
    const stylesheets = countMatches(html, /<link\b[^>]*\brel\s*=\s*(["'])[^"']*stylesheet[^"']*\1/gi);
    const links = countMatches(html, /<a\b[^>]*\bhref\s*=/gi);
    const words = wordCount(html);
    const ogTitle = getMeta(html, "og:title");
    const ogDescription = getMeta(html, "og:description");
    const ogImage = getMeta(html, "og:image");
    const twitterCard = getMeta(html, "twitter:card");
    const noindex = /\bnoindex\b/i.test(robots);

    const checks: Check[] = [];

    addCheck(checks, {
      id: "title",
      title: "Title tag",
      status: title ? (title.length >= 30 && title.length <= 60 ? "pass" : "warning") : "fail",
      message: title ? (title.length >= 30 && title.length <= 60 ? "Title length is in a good range." : `Title is ${title.length} characters; aim for roughly 30–60.`) : "Title tag is missing.",
      details: title || undefined,
      category: "On-Page SEO",
    });

    addCheck(checks, {
      id: "description",
      title: "Meta description",
      status: description ? (description.length >= 120 && description.length <= 170 ? "pass" : "warning") : "fail",
      message: description ? (description.length >= 120 && description.length <= 170 ? "Meta description is present and a useful length." : `Description is ${description.length} characters; aim for roughly 120–170.`) : "Meta description is missing.",
      details: description || undefined,
      category: "On-Page SEO",
    });

    addCheck(checks, {
      id: "h1",
      title: "H1 heading",
      status: h1 === 1 ? "pass" : h1 === 0 ? "fail" : "warning",
      message: h1 === 1 ? "Exactly one H1 heading was found." : h1 === 0 ? "No H1 heading was found." : `${h1} H1 headings were found; use one clear primary H1 where possible.`,
      category: "On-Page SEO",
    });

    addCheck(checks, {
      id: "headings",
      title: "Heading structure",
      status: h2 + h3 > 0 ? "pass" : "warning",
      message: h2 + h3 > 0 ? `Found ${h2} H2 and ${h3} H3 headings.` : "No H2/H3 subheadings were found.",
      category: "On-Page SEO",
    });

    addCheck(checks, {
      id: "canonical",
      title: "Canonical URL",
      status: canonical ? "pass" : "warning",
      message: canonical ? "A canonical URL is present." : "No canonical link was found.",
      details: canonical || undefined,
      category: "Technical SEO",
    });

    addCheck(checks, {
      id: "robots",
      title: "Robots meta",
      status: noindex ? "fail" : "pass",
      message: noindex ? "The page contains noindex and may be excluded from search results." : "No noindex directive was detected.",
      details: robots || "indexable by meta robots",
      category: "Technical SEO",
    });

    addCheck(checks, {
      id: "viewport",
      title: "Mobile viewport",
      status: viewport ? "pass" : "fail",
      message: viewport ? "A responsive viewport meta tag is present." : "Viewport meta tag is missing.",
      category: "Technical SEO",
    });

    addCheck(checks, {
      id: "lang",
      title: "HTML language",
      status: lang ? "pass" : "warning",
      message: lang ? `HTML language is set to ${lang}.` : "The HTML lang attribute is missing.",
      category: "Technical SEO",
    });

    addCheck(checks, {
      id: "https",
      title: "HTTPS",
      status: final.protocol === "https:" ? "pass" : "fail",
      message: final.protocol === "https:" ? "The final URL uses HTTPS." : "The final URL is not using HTTPS.",
      category: "Security",
    });

    addCheck(checks, {
      id: "images",
      title: "Image alt attributes",
      status: images.length === 0 ? "warning" : missingAlt === 0 ? "pass" : missingAlt / images.length <= 0.25 ? "warning" : "fail",
      message: images.length === 0 ? "No images were found." : missingAlt === 0 ? `All ${images.length} images have alt attributes.` : `${missingAlt} of ${images.length} images are missing alt attributes.`,
      category: "On-Page SEO",
    });

    addCheck(checks, {
      id: "content",
      title: "Text content",
      status: words >= 600 ? "pass" : words >= 300 ? "warning" : "fail",
      message: words >= 600 ? `Found approximately ${words.toLocaleString()} words of page text.` : words >= 300 ? `Found approximately ${words.toLocaleString()} words; consider adding useful depth if appropriate.` : `Only about ${words.toLocaleString()} words were detected on the page.`,
      category: "Content",
    });

    addCheck(checks, {
      id: "og",
      title: "Open Graph tags",
      status: ogTitle && ogDescription && ogImage ? "pass" : ogTitle || ogDescription || ogImage ? "warning" : "fail",
      message: ogTitle && ogDescription && ogImage ? "OG title, description and image are present." : "Add og:title, og:description and og:image for better social sharing.",
      category: "Social",
    });

    addCheck(checks, {
      id: "twitter",
      title: "Twitter/X card",
      status: twitterCard ? "pass" : "warning",
      message: twitterCard ? `Twitter/X card is set to ${twitterCard}.` : "No Twitter/X card was found.",
      category: "Social",
    });

    addCheck(checks, {
      id: "robots-file",
      title: "robots.txt",
      status: "warning",
      message: "Checking robots.txt…",
      category: "Technical SEO",
    });

    addCheck(checks, {
      id: "sitemap",
      title: "XML sitemap",
      status: "warning",
      message: "Checking sitemap.xml…",
      category: "Technical SEO",
    });

    let robotsFileStatus: CheckStatus = "fail";
    let robotsFileMessage = "robots.txt was not found.";
    try {
      const robotsUrl = new URL("/robots.txt", final).toString();
      await assertPublicHost(new URL(robotsUrl).hostname);
      const robotsResponse = await fetch(robotsUrl, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "WHOIS-CHOICE-SEO-Audit/1.0" } });
      if (robotsResponse.ok) {
        robotsFileStatus = "pass";
        robotsFileMessage = "robots.txt is available.";
      }
    } catch {
      // Keep the failed check without exposing internal fetch details.
    }

    let sitemapStatus: CheckStatus = "fail";
    let sitemapMessage = "sitemap.xml was not found at the default location.";
    try {
      const sitemapUrl = new URL("/sitemap.xml", final).toString();
      await assertPublicHost(new URL(sitemapUrl).hostname);
      const sitemapResponse = await fetch(sitemapUrl, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "WHOIS-CHOICE-SEO-Audit/1.0" } });
      if (sitemapResponse.ok) {
        sitemapStatus = "pass";
        sitemapMessage = "sitemap.xml is available at the default location.";
      }
    } catch {
      // Keep the failed check without exposing internal fetch details.
    }

    const robotsCheck = checks.find((check) => check.id === "robots-file");
    if (robotsCheck) {
      robotsCheck.status = robotsFileStatus;
      robotsCheck.message = robotsFileMessage;
    }
    const sitemapCheck = checks.find((check) => check.id === "sitemap");
    if (sitemapCheck) {
      sitemapCheck.status = sitemapStatus;
      sitemapCheck.message = sitemapMessage;
    }

    const responseTimeMs = Date.now() - started;
    addCheck(checks, {
      id: "response",
      title: "Server response",
      status: responseTimeMs <= 1000 ? "pass" : responseTimeMs <= 2500 ? "warning" : "fail",
      message: responseTimeMs <= 1000 ? `The audit request completed in ${responseTimeMs} ms.` : `The audit request took ${responseTimeMs} ms; faster responses can improve user experience.`,
      category: "Performance",
    });

    const pass = checks.filter((check) => check.status === "pass").length;
    const warning = checks.filter((check) => check.status === "warning").length;
    const fail = checks.filter((check) => check.status === "fail").length;

    const result: AuditResult = {
      url: parsed.toString(),
      finalUrl,
      score: scoreChecks(checks),
      checkedAt: new Date().toISOString(),
      responseTimeMs,
      statusCode: response.status,
      contentType,
      pageSize: Buffer.byteLength(html, "utf8"),
      checks,
      summary: { pass, warning, fail },
      counts: {
        words,
        headings: h1 + h2 + h3,
        images: images.length,
        links,
        scripts,
        stylesheets,
      },
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to audit this website.";
    if (message.toLowerCase().includes("abort")) {
      return NextResponse.json({ error: "The website took too long to respond. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
