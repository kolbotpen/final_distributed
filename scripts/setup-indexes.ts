// scripts/setup-indexes.ts
// Run with: npm run setup-indexes
// Creates all required N1QL indexes on the Couchbase cluster.
// Safe to re-run — uses IF NOT EXISTS where supported; primary index
// creation will fail silently if the index already exists.

import * as couchbase from "couchbase";
import { CLUSTER_CONFIG } from "../config/cluster";

const INDEX_STATEMENTS = [
  // Primary indexes (needed for SELECT * without a specific field predicate)
  "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`students`",
  "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`teachers`",
  "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`courses`",
  "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`enrollments`",
  "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`classes`",

  // Secondary indexes — type field (used in all list queries)
  "CREATE INDEX idx_students_type IF NOT EXISTS ON `university`.`academic`.`students`(`type`)",
  "CREATE INDEX idx_teachers_type IF NOT EXISTS ON `university`.`academic`.`teachers`(`type`)",
  "CREATE INDEX idx_courses_type IF NOT EXISTS ON `university`.`academic`.`courses`(`type`)",

  // Secondary indexes — enrollment lookups
  "CREATE INDEX idx_enrollments_student IF NOT EXISTS ON `university`.`academic`.`enrollments`(`studentId`)",
  "CREATE INDEX idx_enrollments_course  IF NOT EXISTS ON `university`.`academic`.`enrollments`(`courseId`)",

  // Secondary indexes — class lookups
  "CREATE INDEX idx_classes_teacher IF NOT EXISTS ON `university`.`academic`.`classes`(`teacherId`)",
  "CREATE INDEX idx_classes_course  IF NOT EXISTS ON `university`.`academic`.`classes`(`courseId`)",
];

async function main() {
  const connectionString = `couchbase://${CLUSTER_CONFIG.bootstrapNodes.join(",")}`;
  console.log(`Connecting to ${connectionString}…`);

  const cluster = await couchbase.connect(connectionString, {
    username: CLUSTER_CONFIG.auth.username,
    password: CLUSTER_CONFIG.auth.password,
    timeouts: { connectTimeout: 15000, queryTimeout: 30000 },
  });

  for (const stmt of INDEX_STATEMENTS) {
    try {
      await cluster.query(stmt);
      console.log(`✓ ${stmt.slice(0, 80)}…`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Index already exists is not a real error
      if (msg.includes("already exists") || msg.includes("IndexAlreadyExistsError")) {
        console.log(`  (already exists) ${stmt.slice(0, 60)}…`);
      } else {
        console.error(`✗ FAILED: ${stmt}\n  ${msg}`);
      }
    }
  }

  await cluster.close();
  console.log("\nIndex setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
