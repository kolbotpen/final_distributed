// scripts/setup-indexes-sn.ts
// Run with: npm run setup-indexes-sn
//
// Provisions the shared-nothing scope + collections inside the existing
// `university` bucket, then creates N1QL indexes on all 5 collections.
//
// Pre-requisites:
//   1. All 5 Droplets joined into ONE Couchbase cluster
//      (Cluster > Servers > Add Server in the Couchbase UI on any node)
//   2. The `university` bucket already exists on the cluster
//   3. SN_CLUSTER_NODES set in .env.local (comma-separated node IPs)
//
// What this script does:
//   - Creates scope  university.sharednothing  (idempotent)
//   - Creates each of the 5 collections inside that scope  (idempotent)
//   - Creates primary + secondary N1QL indexes on each collection  (idempotent)

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import * as couchbase from "couchbase";
import { SN_CONFIG, SN_AUTH } from "../config/sharednothing";

const SCOPE      = SN_CONFIG.scope;
const BUCKET     = SN_CONFIG.bucket;
const COLLECTIONS = Object.values(SN_CONFIG.collections);

// N1QL index statements per collection
const INDEXES: Record<string, string[]> = {
  students: [
    `CREATE PRIMARY INDEX IF NOT EXISTS ON \`${BUCKET}\`.\`${SCOPE}\`.\`students\``,
    `CREATE INDEX IF NOT EXISTS idx_sn_students_type     ON \`${BUCKET}\`.\`${SCOPE}\`.\`students\`(\`type\`)`,
    `CREATE INDEX IF NOT EXISTS idx_sn_students_lastName ON \`${BUCKET}\`.\`${SCOPE}\`.\`students\`(\`lastName\`, \`firstName\`)`,
  ],
  teachers: [
    `CREATE PRIMARY INDEX IF NOT EXISTS ON \`${BUCKET}\`.\`${SCOPE}\`.\`teachers\``,
    `CREATE INDEX IF NOT EXISTS idx_sn_teachers_type       ON \`${BUCKET}\`.\`${SCOPE}\`.\`teachers\`(\`type\`)`,
    `CREATE INDEX IF NOT EXISTS idx_sn_teachers_department ON \`${BUCKET}\`.\`${SCOPE}\`.\`teachers\`(\`department\`)`,
  ],
  courses: [
    `CREATE PRIMARY INDEX IF NOT EXISTS ON \`${BUCKET}\`.\`${SCOPE}\`.\`courses\``,
    `CREATE INDEX IF NOT EXISTS idx_sn_courses_type       ON \`${BUCKET}\`.\`${SCOPE}\`.\`courses\`(\`type\`)`,
    `CREATE INDEX IF NOT EXISTS idx_sn_courses_department ON \`${BUCKET}\`.\`${SCOPE}\`.\`courses\`(\`department\`)`,
  ],
  enrolments: [
    `CREATE PRIMARY INDEX IF NOT EXISTS ON \`${BUCKET}\`.\`${SCOPE}\`.\`enrolments\``,
    `CREATE INDEX IF NOT EXISTS idx_sn_enrolments_student ON \`${BUCKET}\`.\`${SCOPE}\`.\`enrolments\`(\`studentId\`)`,
    `CREATE INDEX IF NOT EXISTS idx_sn_enrolments_course  ON \`${BUCKET}\`.\`${SCOPE}\`.\`enrolments\`(\`courseId\`)`,
  ],
  classes: [
    `CREATE PRIMARY INDEX IF NOT EXISTS ON \`${BUCKET}\`.\`${SCOPE}\`.\`classes\``,
    `CREATE INDEX IF NOT EXISTS idx_sn_classes_teacher ON \`${BUCKET}\`.\`${SCOPE}\`.\`classes\`(\`teacherId\`)`,
    `CREATE INDEX IF NOT EXISTS idx_sn_classes_course  ON \`${BUCKET}\`.\`${SCOPE}\`.\`classes\`(\`courseId\`)`,
  ],
};

async function ensureScopeAndCollections(cluster: couchbase.Cluster) {
  const cm = cluster.bucket(BUCKET).collections();

  // Create scope
  try {
    await cm.createScope(SCOPE);
    console.log(`  ✓ Created scope: ${SCOPE}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("ScopeExists")) {
      console.log(`  (scope already exists): ${SCOPE}`);
    } else {
      throw err;
    }
  }

  // Small delay to let scope propagation settle across cluster nodes
  await new Promise((r) => setTimeout(r, 1000));

  // Create each collection
  for (const name of COLLECTIONS) {
    try {
      await cm.createCollection({ name, scopeName: SCOPE });
      console.log(`  ✓ Created collection: ${SCOPE}.${name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("CollectionExists")) {
        console.log(`  (collection already exists): ${SCOPE}.${name}`);
      } else {
        throw err;
      }
    }
  }

  // Wait for collections to become queryable before creating indexes
  await new Promise((r) => setTimeout(r, 2000));
}

async function createIndexes(cluster: couchbase.Cluster) {
  for (const [collection, stmts] of Object.entries(INDEXES)) {
    console.log(`\n[${collection}] Creating indexes…`);
    for (const stmt of stmts) {
      try {
        await cluster.query(stmt);
        console.log(`  ✓ ${stmt.slice(0, 90)}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already exists") || msg.includes("IndexAlreadyExists")) {
          console.log(`  (already exists) ${stmt.slice(0, 70)}`);
        } else {
          console.error(`  ✗ FAILED: ${stmt}\n    ${msg}`);
        }
      }
    }
  }
}

async function main() {
  console.log(`Connecting to shared-nothing cluster: ${SN_CONFIG.connectionString}`);

  const cluster = await couchbase.connect(SN_CONFIG.connectionString, {
    username: SN_AUTH.username,
    password: SN_AUTH.password,
    timeouts: { connectTimeout: 20_000, queryTimeout: 30_000 },
  });

  console.log("\n── Scope + Collections ──────────────────────────────────────────");
  await ensureScopeAndCollections(cluster);

  console.log("\n── N1QL Indexes ─────────────────────────────────────────────────");
  await createIndexes(cluster);

  await cluster.close();
  console.log("\n✓ Shared-nothing setup complete.");
  console.log(`  Bucket: ${BUCKET}  |  Scope: ${SCOPE}  |  Collections: ${COLLECTIONS.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
