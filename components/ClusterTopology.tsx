"use client";
// components/ClusterTopology.tsx
// Live cluster topology map.  Polls /api/health every 10 s and renders the
// 5 nodes in a pentagon layout with colour-coded status indicators.

import { useEffect, useRef, useState } from "react";
import { HealthResponse, NodeHealth } from "@/lib/types";

const POLL_INTERVAL_MS = 10_000;

function StatusDot({ status }: { status: "up" | "down" | "unknown" }) {
  const colour =
    status === "up"
      ? "bg-green-400"
      : status === "down"
      ? "bg-red-500"
      : "bg-yellow-400";
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colour} shadow-sm`}
      aria-label={status}
    />
  );
}

function NodeCard({
  label,
  node,
}: {
  label: string;
  node: NodeHealth | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm w-36">
      <StatusDot status={node ? node.status : "unknown"} />
      <span className="font-mono text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-xs text-gray-400 break-all text-center">
        {node?.ip ?? "—"}
      </span>
      {node?.latencyMs != null ? (
        <span className="text-xs text-indigo-500">{node.latencyMs} ms</span>
      ) : (
        <span className="text-xs text-red-400">unreachable</span>
      )}
    </div>
  );
}

function ClusterStatusBadge({
  status,
}: {
  status: HealthResponse["clusterStatus"] | null;
}) {
  if (!status)
    return (
      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm">
        Loading…
      </span>
    );
  const styles = {
    healthy: "bg-green-100 text-green-700",
    degraded: "bg-yellow-100 text-yellow-700",
    down: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}

export default function ClusterTopology() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchHealth() {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        const data: HealthResponse = await res.json();
        setHealth(data);
        setLastUpdated(new Date());
      }
    } catch {
      // network failure — keep previous state, user will see stale badge
    }
  }

  useEffect(() => {
    fetchHealth();
    timerRef.current = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const nodeKeys = ["node1", "node2", "node3", "node4", "node5"] as const;

  return (
    <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Cluster Topology — 5-Node Shared-Nothing
        </h2>
        <ClusterStatusBadge status={health?.clusterStatus ?? null} />
      </div>

      {/* Node grid — two rows: 3 on top, 2 on bottom */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap justify-center gap-4">
          {nodeKeys.slice(0, 3).map((key) => (
            <NodeCard
              key={key}
              label={key}
              node={health?.nodes[key] ?? null}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          {nodeKeys.slice(3).map((key) => (
            <NodeCard
              key={key}
              label={key}
              node={health?.nodes[key] ?? null}
            />
          ))}
        </div>
      </div>

      {/* Collection status row */}
      {health && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Collections
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(health.collections).map(([name, status]) => (
              <span
                key={name}
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  status === "available"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {name}: {status}
              </span>
            ))}
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-3">
          Last updated: {lastUpdated.toLocaleTimeString()} (polls every 10 s)
        </p>
      )}
    </section>
  );
}
