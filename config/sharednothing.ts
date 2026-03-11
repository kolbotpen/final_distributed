// config/sharednothing.ts
// True shared-nothing cluster configuration.
//
// Architecture: ALL 5 nodes form ONE Couchbase cluster.
// The 1 024 vBuckets are distributed evenly across nodes (~205 per node).
// Every document in any collection lands on whichever node owns that key's
// vBucket — determined by a CRC32 hash, not by application-level routing.
//
//   Node 1  ─┐
//   Node 2  ─┤
//   Node 3  ─┼──  ONE Couchbase Cluster  ──  university.sharednothing.*
//   Node 4  ─┤
//   Node 5  ─┘
//
// All 5 collections (students, teachers, courses, enrolments, classes) are
// distributed across this single cluster — no collection is tied to any
// particular node.  The SDK resolves the owning node at request time using
// its cached vBucket map.

export const SN_CONFIG = {
  // The Couchbase SDK accepts a comma-separated bootstrap list.
  // It needs only ONE live node to discover the full cluster topology; listing
  // all five is just belt-and-suspenders for faster initial bootstrap.
  get connectionString(): string {
    const nodes = process.env.SN_CLUSTER_NODES ?? "";
    if (!nodes) return "couchbase://NODE_1,NODE_2,NODE_3,NODE_4,NODE_5";
    return `couchbase://${nodes}`;
  },
  bucket: "university",
  scope: "sharednothing",
  collections: {
    students:   "students",
    teachers:   "teachers",
    courses:    "courses",
    enrolments: "enrolments",
    classes:    "classes",
  },
} as const;

export const SN_AUTH = {
  username: process.env.COUCHBASE_USERNAME || "Administrator",
  password: process.env.COUCHBASE_PASSWORD || "your_password_here",
};

export type SnCollectionName = keyof typeof SN_CONFIG.collections;

/** Returns the list of individual node IPs for per-node health probing. */
export function getSnNodeIps(): string[] {
  return (process.env.SN_CLUSTER_NODES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
