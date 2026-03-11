"use client";
// app/page.tsx -- Dashboard
import SharedNothingTopology from "@/components/SharedNothingTopology";
import ResilienceTestPanel from "@/components/ResilienceTestPanel";
import Link from "next/link";

const sections = [
  { label: "Students",   href: "/students",   emoji: "🎓" },
  { label: "Teachers",   href: "/teachers",   emoji: "👨‍🏫" },
  { label: "Courses",    href: "/courses",    emoji: "📚" },
  { label: "Enrolments", href: "/enrolments", emoji: "📋" },
  { label: "Classes",    href: "/classes",    emoji: "🏫" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          University — Distributed System
        </h1>
        <p className="text-gray-500 text-sm">
          All five Droplets form one Couchbase cluster. 128 vBuckets are
          distributed evenly (~25 per node) with 1 replica — if a node dies,
          replicas are promoted automatically with no data loss.
        </p>
      </div>

      {/* Live cluster topology */}
      <SharedNothingTopology />

      {/* Resilience test panel */}
      <ResilienceTestPanel />

      {/* Quick-access tiles */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Data Domains</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map(({ label, href, emoji }) => (
            <div
              key={href}
              className="flex flex-col items-center bg-white border border-gray-100 rounded-2xl py-5 px-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all gap-2"
            >
              <span className="text-3xl">{emoji}</span>
              <span className="font-semibold text-gray-700">{label}</span>
              <div className="flex gap-2 w-full mt-1">
                <Link
                  href={href}
                  className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
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
            classes) live in the <code>sharednothing</code> scope and are
            sharded across the cluster automatically.
          </li>
          <li>
            Each vBucket has <strong>1 replica on a separate node</strong>.
            If a node fails, Couchbase automatically promotes those replicas —
            no data is lost and KV reads/writes continue on the remaining 4 nodes.
          </li>
        </ul>
      </section>
    </div>
  );
}
