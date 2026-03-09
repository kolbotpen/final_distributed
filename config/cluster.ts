// config/cluster.ts
// Single source of truth for all Couchbase node IPs and cluster settings.
// After provisioning 5 DigitalOcean Droplets, set NODE_1_IP…NODE_5_IP in .env.local

export const CLUSTER_CONFIG = {
  /**
   * Bootstrap nodes — the Couchbase SDK sends the first connection to any of
   * these IPs, then discovers the full cluster topology on its own.
   * Listing all 5 gives maximum resilience at startup.
   */
  bootstrapNodes: [
    process.env.NODE_1_IP || "YOUR_DROPLET_1_IP",
    process.env.NODE_2_IP || "YOUR_DROPLET_2_IP",
    process.env.NODE_3_IP || "YOUR_DROPLET_3_IP",
    process.env.NODE_4_IP || "YOUR_DROPLET_4_IP",
    process.env.NODE_5_IP || "YOUR_DROPLET_5_IP",
  ],

  /** Top-level Couchbase bucket */
  bucket: "university",

  /** Scope used to isolate the academic domain */
  scope: "academic",

  /** One collection per data domain */
  collections: {
    students: "students",
    teachers: "teachers",
    courses: "courses",
    enrollments: "enrollments",
    classes: "classes",
  } as const,

  auth: {
    username: process.env.COUCHBASE_USERNAME || "Administrator",
    password: process.env.COUCHBASE_PASSWORD || "your_password_here",
  },
} as const;

export type CollectionName = keyof typeof CLUSTER_CONFIG.collections;
