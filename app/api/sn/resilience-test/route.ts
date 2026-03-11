// app/api/sn/resilience-test/route.ts
// Fires a N1QL query against the shared-nothing cluster and reports the
// result + timing. Used by the resilience demo panel on the homepage.
// Query intentionally touches all collections so a vBucket spread is visible.

import { NextResponse } from "next/server";
import { getSnCluster } from "@/lib/couchbase-sn";

export interface ResilienceTestResult {
  ok: boolean;
  latencyMs: number;
  rowCount: number;
  sample: { collection: string; firstName?: string; lastName?: string; title?: string; code?: string } | null;
  error: string | null;
  testedAt: string;
}

export async function GET(): Promise<NextResponse<ResilienceTestResult>> {
  const start = Date.now();
  const testedAt = new Date().toISOString();

  try {
    const cluster = await getSnCluster();

    // Query all 5 collections in one round-trip to stress multiple vBuckets
    const query = `
      SELECT 'students' AS \`collection\`, firstName, lastName, NULL AS title, NULL AS code
        FROM \`university\`.\`sharednothing\`.\`students\`
      UNION ALL
      SELECT 'teachers' AS \`collection\`, firstName, lastName, NULL AS title, NULL AS code
        FROM \`university\`.\`sharednothing\`.\`teachers\`
      UNION ALL
      SELECT 'courses' AS \`collection\`, NULL AS firstName, NULL AS lastName, title, code
        FROM \`university\`.\`sharednothing\`.\`courses\`
      LIMIT 5
    `;

    const result = await cluster.query(query, { timeout: 8000 });
    const rows = result.rows as ResilienceTestResult["sample"][];
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      ok: true,
      latencyMs,
      rowCount: rows.length,
      sample: rows[0] ?? null,
      error: null,
      testedAt,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      ok: false,
      latencyMs: Date.now() - start,
      rowCount: 0,
      sample: null,
      error: err instanceof Error ? err.message : String(err),
      testedAt,
    });
  }
}
