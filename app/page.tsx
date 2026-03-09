// app/page.tsx — Dashboard
// Shows cluster topology (live-polled) plus quick entity counts.
import ClusterTopology from "@/components/ClusterTopology";
import Link from "next/link";

const sections = [
  { label: "Students", href: "/students", emoji: "🎓" },
  { label: "Teachers", href: "/teachers", emoji: "👨‍🏫" },
  { label: "Courses", href: "/courses", emoji: "📚" },
  { label: "Enrollments", href: "/enrollments", emoji: "📋" },
  { label: "Classes", href: "/classes", emoji: "🏫" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
          University — Distributed Cluster
        </h1>
        <p className="text-gray-500 text-sm">
          Backed by a 5-node shared-nothing Couchbase cluster on DigitalOcean.
          vBuckets are distributed across all nodes — any node can serve any
          request.
        </p>
      </div>

      {/* Live cluster topology */}
      <ClusterTopology />

      {/* Quick-access tiles */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Data Domains</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map(({ label, href, emoji }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl py-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <span className="text-3xl mb-2">{emoji}</span>
              <span className="font-semibold text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Architecture note */}
      <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-sm text-indigo-800 space-y-2">
        <h3 className="font-bold text-base">How shared-nothing works here</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>1 024 vBuckets</strong> are distributed evenly across all 5
            nodes — each node owns roughly 205 vBuckets at rest.
          </li>
          <li>
            The Next.js app connects with a multi-node connection string; the
            Couchbase SDK performs topology discovery and routes every KV op{" "}
            <em>directly</em> to the owning node — no coordinator hop.
          </li>
          <li>
            When a node dies, Couchbase promotes replica vBuckets on surviving
            nodes and the cluster continues serving within seconds.
          </li>
          <li>
            Cross-collection fetches (e.g. a Class with its Teacher, Course, and
            Students) use <code>safeCollectionFetch</code> — a single
            collection&apos;s unavailability never kills the whole response.
          </li>
        </ul>
      </section>
    </div>
  );
}
