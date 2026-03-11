"use client";
// components/ResilienceTestPanel.tsx
// Demo panel: fire a test query against the SN cluster and show it succeeds
// even when one or more nodes are down (replicas are promoted automatically).

import { useState } from "react";
import { ResilienceTestResult } from "@/app/api/sn/resilience-test/route";

const MAX_LOG = 8;

function ResultRow({ r, index }: { r: ResilienceTestResult; index: number }) {
  const time = new Date(r.testedAt).toLocaleTimeString();
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2 text-xs ${
        r.ok ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"
      }`}
    >
      {/* Index */}
      <span className="text-gray-400 font-mono w-4 shrink-0">#{index + 1}</span>

      {/* Status icon */}
      <span className={`font-bold shrink-0 ${r.ok ? "text-green-600" : "text-red-500"}`}>
        {r.ok ? "✓" : "✗"}
      </span>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {r.ok ? (
          <span className="text-green-700">
            Query returned <strong>{r.rowCount} rows</strong> in{" "}
            <strong>{r.latencyMs} ms</strong>
            {r.sample && (
              <span className="text-gray-500 ml-1">
                — first row:{" "}
                <span className="font-mono">
                  {r.sample.collection}:{" "}
                  {r.sample.firstName
                    ? `${r.sample.firstName} ${r.sample.lastName}`
                    : r.sample.title ?? "—"}
                </span>
              </span>
            )}
          </span>
        ) : (
          <span className="text-red-600 break-all">{r.error}</span>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-gray-400 shrink-0">{time}</span>
    </div>
  );
}

export default function ResilienceTestPanel() {
  const [log, setLog] = useState<ResilienceTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sn/resilience-test");
      const data: ResilienceTestResult = await res.json();
      setLog((prev) => [data, ...prev].slice(0, MAX_LOG));
    } catch {
      const errResult: ResilienceTestResult = {
        ok: false,
        latencyMs: 0,
        rowCount: 0,
        sample: null,
        error: "Network error — could not reach /api/sn/resilience-test",
        testedAt: new Date().toISOString(),
      };
      setLog((prev) => [errResult, ...prev].slice(0, MAX_LOG));
    } finally {
      setLoading(false);
    }
  };

  const successCount = log.filter((r) => r.ok).length;
  const failCount = log.filter((r) => !r.ok).length;

  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Resilience Test
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 max-w-lg">
            Stop Couchbase on any node (<code className="font-mono">systemctl stop couchbase-server</code>),
            then click <strong>Run Test Query</strong>. The query spans all 5
            collections — even with a node down, it succeeds because Couchbase
            automatically promotes replica vBuckets.
          </p>
        </div>

        <button
          onClick={runTest}
          disabled={loading}
          className="shrink-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Running…
            </>
          ) : (
            "Run Test Query"
          )}
        </button>
      </div>

      {/* Stats bar */}
      {log.length > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
            {successCount} succeeded
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
            {failCount} failed
          </span>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {log.length} total
          </span>
        </div>
      )}

      {/* Results log */}
      {log.length > 0 ? (
        <div className="space-y-1.5">
          {log.map((r, i) => (
            <ResultRow key={r.testedAt + i} r={r} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
          No tests run yet. Click <strong>Run Test Query</strong> to start.
        </div>
      )}

      {/* How-to steps */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
          How to demonstrate a node failure
        </summary>
        <ol className="mt-2 list-decimal list-inside space-y-1 pl-1">
          <li>Run a test query above — confirm it succeeds with all 5 nodes up.</li>
          <li>SSH into any one Droplet and run: <code className="font-mono bg-gray-100 px-1 rounded">systemctl stop couchbase-server</code></li>
          <li>Watch the topology above show that node as <strong>down</strong>.</li>
          <li>
            On Node 1, trigger failover:{" "}
            <code className="font-mono bg-gray-100 px-1 rounded">
              couchbase-cli failover -c 127.0.0.1 -u Administrator -p Administrator123! --server-failover http://&lt;IP&gt;:8091 --force
            </code>
          </li>
          <li>Run the test query again — it still succeeds because replicas were promoted.</li>
        </ol>
      </details>
    </div>
  );
}
