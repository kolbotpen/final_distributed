"use client";
// app/page.tsx -- Dashboard
import { useState } from "react";
import ClusterTopology from "@/components/ClusterTopology";
import SharedNothingTopology from "@/components/SharedNothingTopology";
import ResilienceTestPanel from "@/components/ResilienceTestPanel";
import Link from "next/link";

type ArchMode = "microservice" | "sharednothing";

const sections = [
  { label: "Students",   href: "/students",   emoji: "🎓" },
  { label: "Teachers",   href: "/teachers",   emoji: "👨‍🏫" },
  { label: "Courses",    href: "/courses",    emoji: "📚" },
  { label: "Enrolments", href: "/enrolments", emoji: "📋" },
  { label: "Classes",    href: "/classes",    emoji: "🏫" },
];

export default function DashboardPage() {
  const [mode, setMode] = useState<ArchMode>("microservice");

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          University &mdash; Distributed System
        </h1>
        <p className="text-gray-500 text-sm">
          {mode === "microservice"
            ? "Five independent single-node Couchbase instances — one per data domain — deployed on DigitalOcean Droplets. Each domain owns its dedicated node; no data is shared across instances."
            : "All five Droplets joined into ONE Couchbase cluster. 128 vBuckets distributed evenly (~25 per node) with 1 replica — if a node dies, replicas are promoted automatically with no data loss."}
        </p>
      </div>

      {/* Architecture toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setMode("microservice")}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
            mode === "microservice"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Per-Domain (Microservice)
        </button>
        <button
          onClick={() => setMode("sharednothing")}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
            mode === "sharednothing"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Shared-Nothing Cluster
        </button>
      </div>

      {/* Live topology */}
      {mode === "microservice" ? <ClusterTopology /> : <SharedNothingTopology />}

      {/* Resilience test panel (shared-nothing only) */}
      {mode === "sharednothing" && <ResilienceTestPanel />}

      {/* Quick-access tiles */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Data Domains</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map(({ label, href, emoji }) => (
            <div
              key={href}
              className={`flex flex-col items-center bg-white border rounded-2xl py-5 px-3 shadow-sm hover:shadow-md transition-all gap-2 ${
                mode === "microservice"
                  ? "border-gray-100 hover:border-indigo-200"
                  : "border-gray-100 hover:border-blue-200"
              }`}
            >
              <span className="text-3xl">{emoji}</span>
              <span className="font-semibold text-gray-700">{label}</span>
              <div className="flex gap-2 w-full mt-1">
                <Link
                  href={href}
                  className={`flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${
                    mode === "microservice"
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  Browse
                </Link>
                <Link
                  href={`${href}?new=1`}
                  className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                >
                  + New
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture note */}
      {mode === "microservice" ? (
        <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-sm text-indigo-800 space-y-2">
          <h3 className="font-bold text-base">How per-domain isolation works</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Each domain runs on its own{" "}
              <strong>dedicated single-node Couchbase instance</strong>. No data
              is co-located across nodes.
            </li>
            <li>
              The Next.js API layer connects to each instance independently — a
              KV read for a student never touches the teachers or courses node.
            </li>
            <li>
              When a node goes down,{" "}
              <strong>only that domain is affected</strong>. The other four
              domains continue serving reads and writes normally.
            </li>
            <li>
              Cross-domain fetches (e.g. a Class with its Teacher, Course, and
              Students) fan out across nodes in parallel — one unavailable node
              returns a sentinel value instead of failing the whole response.
            </li>
          </ul>
        </section>
      ) : (
        <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-sm text-blue-800 space-y-2">
          <h3 className="font-bold text-base">How shared-nothing distribution works</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              All 5 Droplets form{" "}
              <strong>one Couchbase cluster</strong>. The single bucket{" "}
              <code>university</code> owns 128 vBuckets, partitioned evenly
              across every cluster node (~25 per node).
            </li>
            <li>
              Every document is hashed to a vBucket. The SDK downloads a{" "}
              <strong>vBucket map</strong> at connect time and sends each KV
              operation directly to the node that owns that vBucket — zero
              coordinator hops.
            </li>
            <li>
              All 5 collections (students, teachers, courses, enrolments,
              classes) live in the same scope and are sharded across the cluster
              — there is no per-domain isolation.
            </li>
            <li>
              Each vBucket has <strong>1 replica on a separate node</strong>.
              If a node fails, Couchbase automatically promotes those replicas —
              no data is lost and KV reads/writes continue on the remaining 4 nodes.
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
