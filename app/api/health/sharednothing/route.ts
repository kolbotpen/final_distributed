// app/api/health/sharednothing/route.ts
// Returns live status of each node in the shared-nothing cluster.
// Pings the Couchbase management port (8091) on every node independently,
// so the response shows which nodes are reachable — even when the cluster
// itself hasn't been fully provisioned yet.

import { NextResponse } from "next/server";
import { getSnNodeIps, SN_AUTH } from "@/config/sharednothing";
import { ClusterNodeHealth, SnHealthResponse } from "@/lib/types";

const MGMT_PORT = 8091;
const PING_TIMEOUT_MS = 4_000;

async function pingSnNode(ip: string, index: number): Promise<ClusterNodeHealth> {
  const url = `http://${ip}:${MGMT_PORT}/pools`;
  const start = Date.now();

  try {
    const authHeader = "Basic " + Buffer.from(`${SN_AUTH.username}:${SN_AUTH.password}`).toString("base64");
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { nodeIndex: index, ip, nodeStatus: "down", latencyMs: null };
    }

    return { nodeIndex: index, ip, nodeStatus: "up", latencyMs };
  } catch {
    return { nodeIndex: index, ip, nodeStatus: "down", latencyMs: null };
  }
}

export async function GET(): Promise<NextResponse<SnHealthResponse>> {
  const ips = getSnNodeIps();

  const nodes = await Promise.all(ips.map((ip, i) => pingSnNode(ip, i)));

  const upCount = nodes.filter((n) => n.nodeStatus === "up").length;
  const overallStatus: SnHealthResponse["overallStatus"] =
    upCount === nodes.length ? "healthy" :
    upCount === 0            ? "down"    :
                               "degraded";

  return NextResponse.json({ overallStatus, nodes });
}
