// app/api/health/route.ts
// Cluster and per-node health check.
//
// Strategy:
//  1. HTTP-ping each node's management API (port 8091) to check reachability
//     and measure latency.
//  2. Run a lightweight N1QL self-diagnostic against the cluster.
//  3. Probe each collection with a simple KV operation to verify availability.

import { NextResponse } from "next/server";
import { getCluster, getCollection } from "@/lib/couchbase";
import { CLUSTER_CONFIG } from "@/config/cluster";
import { HealthResponse, NodeHealth } from "@/lib/types";

async function pingNode(ip: string): Promise<NodeHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://${ip}:8091/pools`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ip, status: "up", latencyMs: Date.now() - start };
  } catch {
    return { ip, status: "down", latencyMs: null };
  }
}

async function checkCollection(name: string): Promise<"available" | "unavailable"> {
  try {
    const col = await getCollection(name as keyof typeof CLUSTER_CONFIG.collections);
    // Non-destructive probe: attempt a get with a key that certainly won't exist
    await col.get("__health_probe__").catch((e: unknown) => {
      const cbErr = e as { cause?: { name?: string } };
      // DocumentNotFoundError means the collection IS reachable
      if (cbErr?.cause?.name === "DocumentNotFoundError") return;
      throw e;
    });
    return "available";
  } catch {
    return "unavailable";
  }
}

export async function GET() {
  // Ping all nodes in parallel
  const nodeEntries = CLUSTER_CONFIG.bootstrapNodes.map((ip, i) => ({
    key: `node${i + 1}`,
    ip,
  }));

  const [nodePings, collectionStatuses, queryStatus] = await Promise.all([
    Promise.all(nodeEntries.map(({ ip }) => pingNode(ip))),

    Promise.all(
      (Object.keys(CLUSTER_CONFIG.collections) as Array<keyof typeof CLUSTER_CONFIG.collections>).map(
        async (name) => ({ name, status: await checkCollection(name) })
      )
    ),

    (async (): Promise<"ok" | "failed"> => {
      try {
        const cluster = await getCluster();
        await cluster.query("SELECT 1 AS probe");
        return "ok";
      } catch {
        return "failed";
      }
    })(),
  ]);

  const nodes: HealthResponse["nodes"] = {};
  nodeEntries.forEach(({ key }, i) => {
    nodes[key] = nodePings[i];
  });

  const collections: HealthResponse["collections"] = {};
  collectionStatuses.forEach(({ name, status }) => {
    collections[name] = status;
  });

  const upCount = Object.values(nodes).filter((n) => n.status === "up").length;
  const allCollsOk = Object.values(collections).every((s) => s === "available");

  let clusterStatus: HealthResponse["clusterStatus"];
  if (upCount === 0 || queryStatus === "failed") {
    clusterStatus = "down";
  } else if (upCount < nodeEntries.length || !allCollsOk) {
    clusterStatus = "degraded";
  } else {
    clusterStatus = "healthy";
  }

  const body: HealthResponse = { clusterStatus, nodes, collections, queryStatus };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
