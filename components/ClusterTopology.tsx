"use client";
// components/ClusterTopology.tsx
// Live per-domain node map. Each card represents one dedicated Couchbase
// instance (Droplet). Polls /api/health every 10 s.

import { useEffect, useRef, useState } from "react";
import { HealthResponse, DomainHealth } from "@/lib/types";

const POLL_INTERVAL_MS = 10_000;

const DOMAIN_LABELS: Record<string, { emoji: string; label: string }> = {
  students:    { emoji: "🎓", label: "Students" },
  teachers:    { emoji: "👨‍🏫", label: "Teachers" },
  courses:     { emoji: "📚", label: "Courses" },
  enrolments: { emoji: "📋", label: "Enrolments" },
  classes:     { emoji: "🏫", label: "Classes" },
};

function DomainCard({ info }: { info: DomainHealth | null; domain: string }) {
  const meta = DOMAIN_LABELS[info?.domain ?? ""] ?? { emoji: "🔷", label: info?.domain ?? "—" };
  const up = info?.nodeStatus === "up";
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl px-4 py-4 shadow-sm w-36 border ${
        up ? "bg-white border-green-200" : info ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
      }`}
    >
      <span className="text-2xl">{meta.emoji}</span>
      <span className="font-semibold text-sm text-gray-700">{meta.label}</span>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          up ? "bg-green-100 text-green-700" : info ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
        }`}
      >
        {info ? (up ? "up" : "down") : "…"}
      </span>
      <span className="text-xs text-gray-400 break-all text-center font-mono">
        {info?.ip ?? "—"}
      </span>
      {info?.latencyMs != null ? (
        <span className="text-xs text-indigo-500">{info.latencyMs} ms</span>
      ) : info ? (
        <span className="text-xs text-red-400">unreachable</span>
      ) : null}
    </div>
  );
}

function OverallBadge({ status }: { status: HealthResponse["overallStatus"] | null }) {
  if (!status) return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-sm">Loading…</span>;
  const styles = { healthy: "bg-green-100 text-green-700", degraded: "bg-yellow-100 text-yellow-700", down: "bg-red-100 text-red-700" };
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>{status.toUpperCase()}</span>;
}

export default function ClusterTopology() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchHealth() {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) { setHealth(await res.json()); setLastUpdated(new Date()); }
    } catch { /* keep previous state */ }
  }

  useEffect(() => {
    fetchHealth();
    timerRef.current = setInterval(fetchHealth, POLL_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const domainOrder = ["students", "teachers", "courses", "enrolments", "classes"];

  return (
    <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Domain Nodes — Fault Isolation Architecture</h2>
          <p className="text-xs text-gray-400 mt-0.5">1 collection · 1 dedicated Couchbase instance · 1 Droplet</p>
        </div>
        <OverallBadge status={health?.overallStatus ?? null} />
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {domainOrder.map((domain) => (
          <DomainCard
            key={domain}
            domain={domain}
            info={health?.domains[domain] ?? null}
          />
        ))}
      </div>

      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-4">Last updated: {lastUpdated.toLocaleTimeString()} (polls every 10 s)</p>
      )}
    </section>
  );
}
