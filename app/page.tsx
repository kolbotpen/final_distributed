// app/page.tsx — Dashboard
// Shows cluster topology (live-polled) plus domain quick-access tiles.
import ClusterTopology from "@/components/ClusterTopology";
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
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          University — Distributed System
        </h1>
        <p className="text-gray-500 text-sm">
          Five independent single-node Couchbase instances — one per data domain
          — deployed on DigitalOcean Droplets. Each domain owns its own
          dedicated node; no data is shared across instances.
        </p>
      </div>

      {/* Live cluster topology */}
      <ClusterTopology />

      {/* Quick-access tiles */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Data Domains</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map(({ label, href, emoji }) => (
            <div
              key={href}
              className="flex flex-col items-center bg-white border border-gray-100 rounded-2xl py-5 px-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all gap-2"
            >
              <span className="text-3xl">{emoji}</span>
              <span className="font-semibold text-gray-700">{label}</span>
              <div className="flex gap-2 w-full mt-1">
                <Link
                  href={href}
                  className="flex-1 text-center text-xs font-medium px-2 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
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
      <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-sm text-indigo-800 space-y-2">
        <h3 className="font-bold text-base">How per-domain isolation works here</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Each domain (students, teachers, courses, enrolments, classes) runs
            on its own <strong>dedicated single-node Couchbase instance</strong>.
            No data is co-located across nodes.
          </li>
          <li>
            The Next.js API layer connects to each instance independently — a KV
            read for a student never touches the teachers or courses node.
          </li>
          <li>
            When a node goes down, <strong>only that domain is affected</strong>.
            The other four domains continue serving reads and writes normally.
          </li>
          <li>
            Cross-domain fetches (e.g. a Class with its Teacher, Course, and
            Students) fan out across nodes in parallel with{" "}
            <code>safeCollectionFetch</code> — one unavailable node returns a
            sentinel value instead of failing the whole response.
          </li>
        </ul>
      </section>
    </div>
  );
}
