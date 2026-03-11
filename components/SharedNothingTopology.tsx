// components/SharedNothingTopology.tsx
// Live cluster-node map for the shared-nothing architecture.
// All 5 nodes form ONE Couchbase cluster; 1024 vBuckets are distributed
// evenly (~205 per node). Every collection is spread across all nodes.

"use client";

import { useEffect, useRef, useState } from "react";
import { SnHealthResponse, ClusterNodeHealth } from "@/lib/types";

const POLL_MS = 10_000;
const TOTAL_VBUCKETS = 128;

// ── Status badge ──────────────────────────────────────────────────────────────

function OverallBadge({ status }: { status: SnHealthResponse["overallStatus"] | null }) {
  if (!status) return <span className="text-xs text-gray-400">checking…</span>;
  const styles: Record<string, string> = {
    healthy:  "bg-blue-100 text-blue-700",
    degraded: "bg-yellow-100 text-yellow-700",
    down:     "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    healthy:  "All nodes up",
    degraded: "Partially degraded",
    down:     "Cluster unreachable",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Single node card ──────────────────────────────────────────────────────────

function NodeCard({
  node,
  index,
  totalUp,
}: {
  node: ClusterNodeHealth | null;
  index: number;
  totalUp: number;
}) {
  const up = node?.nodeStatus === "up";
  const vBuckets = up && totalUp > 0 ? Math.round(TOTAL_VBUCKETS / totalUp) : null;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl px-3 py-4 shadow-sm border min-w-[120px] ${
        up
          ? "bg-white border-blue-200"
          : node
          ? "bg-red-50 border-red-200"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      {/* Node number */}
      <div
        className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-bold ${
          up ? "bg-blue-100 text-blue-600" : node ? "bg-red-100 text-red-500" : "bg-gray-100 text-gray-400"
        }`}
      >
        N{index + 1}
      </div>

      {/* Status */}
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          up ? "bg-blue-50 text-blue-600" : node ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"
        }`}
      >
        {node ? (up ? "up" : "down") : "…"}
      </span>

      {/* IP */}
      <span className="text-[10px] text-gray-400 font-mono text-center break-all leading-tight">
        {node?.ip ?? "—"}
      </span>

      {/* Latency */}
      {node && (
        <span className={`text-xs ${up ? "text-blue-400" : "text-red-400"}`}>
          {up && node.latencyMs != null ? `${node.latencyMs} ms` : "unreachable"}
        </span>
      )}

      {/* vBucket share */}
      {vBuckets != null && (
        <span className="mt-1 text-[10px] text-gray-500 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
          ~{vBuckets} vBuckets
        </span>
      )}
    </div>
  );
}

// ── Collections banner ────────────────────────────────────────────────────────

function CollectionsBanner() {
  const collections = ["students", "teachers", "courses", "enrolments", "classes"];
  return (
    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
      {collections.map((c) => (
        <span
          key={c}
          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SharedNothingTopology() {
  const [health, setHealth] = useState<SnHealthResponse | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = async () => {
    try {
      const res = await fetch("/api/health/sharednothing");
      if (res.ok) {
        const data: SnHealthResponse = await res.json();
        setHealth(data);
        setLastPoll(new Date());
      }
    } catch {
      // network error — leave previous state
    }
  };

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const upCount = health?.nodes.filter((n) => n.nodeStatus === "up").length ?? 0;
  const nodeCount = health?.nodes.length ?? 5;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-blue-900">
            Shared-Nothing Cluster &mdash; <code className="font-mono text-xs">university.sharednothing.*</code>
          </h3>
          <p className="text-xs text-blue-600 mt-0.5">
            1 bucket &bull; 1 scope &bull; 5 collections &bull; 128 vBuckets &bull; 1 replica &bull; distributed across {nodeCount} nodes
          </p>
        </div>
        <OverallBadge status={health?.overallStatus ?? null} />
      </div>

      {/* Node ring */}
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: nodeCount }, (_, i) => {
          const node = health?.nodes[i] ?? null;
          return (
            <NodeCard key={i} node={node} index={i} totalUp={upCount} />
          );
        })}
      </div>

      {/* vBucket distribution note */}
      <div className="rounded-lg bg-blue-100/60 border border-blue-200 px-3 py-2 text-xs text-blue-700 text-center">
        All 5 collections distributed across all nodes. Each vBucket has 1 active + 1 replica copy
        on separate nodes — if a node dies, replicas are promoted automatically with no data loss.
      </div>

      {/* Collections hosted on cluster */}
      <div>
        <p className="text-[11px] text-blue-600 text-center font-medium mb-1">
          Collections sharded across ALL nodes:
        </p>
        <CollectionsBanner />
      </div>

      {/* Poll timestamp */}
      {lastPoll && (
        <p className="text-[10px] text-gray-400 text-right">
          Last polled {lastPoll.toLocaleTimeString()} &bull; refreshes every {POLL_MS / 1000}s
        </p>
      )}
    </div>
  );
}
