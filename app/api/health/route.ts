// app/api/health/route.ts
// Per-domain node health check.
//
// Each domain (students, teachers, courses, enrolments, classes) is hosted on
// its own dedicated Couchbase instance. We ping each independently so the
// dashboard can show exactly which domain's node is up or down.

import { NextResponse } from "next/server";
import { DOMAIN_NODES, AUTH, DomainName } from "@/config/cluster";
import { HealthResponse, DomainHealth } from "@/lib/types";

async function pingDomain(domain: DomainName): Promise<DomainHealth> {
  const node = DOMAIN_NODES[domain];
  const credentials = Buffer.from(`${AUTH.username}:${AUTH.password}`).toString("base64");
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://${node.ip}:8091/pools`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Authorization: `Basic ${credentials}` },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { domain, ip: node.ip, nodeStatus: "up", latencyMs: Date.now() - start };
  } catch {
    return { domain, ip: node.ip, nodeStatus: "down", latencyMs: null };
  }
}

export async function GET() {
  const domainNames = Object.keys(DOMAIN_NODES) as DomainName[];

  // Ping all 5 domain nodes in parallel — they are completely independent
  const results = await Promise.all(domainNames.map(pingDomain));

  const domains: HealthResponse["domains"] = {};
  results.forEach((r) => { domains[r.domain] = r; });

  const upCount = results.filter((r) => r.nodeStatus === "up").length;
  const overallStatus: HealthResponse["overallStatus"] =
    upCount === 0 ? "down" :
    upCount < domainNames.length ? "degraded" :
    "healthy";

  return NextResponse.json(
    { overallStatus, domains } satisfies HealthResponse,
    { headers: { "Cache-Control": "no-store" } }
  );
}
