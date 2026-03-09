// scripts/setup-indexes.ts
// Run with: npm run setup-indexes
// Creates N1QL indexes on each domain node independently.
// Each node hosts exactly one collection, so indexes are created domain by domain.

import * as couchbase from "couchbase";
import { DOMAIN_NODES, AUTH, DomainName } from "../config/cluster";

// Indexes to create per domain — key is domain name, value is list of statements
const DOMAIN_INDEXES: Record<DomainName, string[]> = {
  students: [
    "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`students`",
    "CREATE INDEX idx_students_type IF NOT EXISTS ON `university`.`academic`.`students`(`type`)",
  ],
  teachers: [
    "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`teachers`",
    "CREATE INDEX idx_teachers_type IF NOT EXISTS ON `university`.`academic`.`teachers`(`type`)",
  ],
  courses: [
    "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`courses`",
    "CREATE INDEX idx_courses_type IF NOT EXISTS ON `university`.`academic`.`courses`(`type`)",
  ],
  enrollments: [
    "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`enrollments`",
    "CREATE INDEX idx_enrollments_student IF NOT EXISTS ON `university`.`academic`.`enrollments`(`studentId`)",
    "CREATE INDEX idx_enrollments_course  IF NOT EXISTS ON `university`.`academic`.`enrollments`(`courseId`)",
  ],
  classes: [
    "CREATE PRIMARY INDEX IF NOT EXISTS ON `university`.`academic`.`classes`",
    "CREATE INDEX idx_classes_teacher IF NOT EXISTS ON `university`.`academic`.`classes`(`teacherId`)",
    "CREATE INDEX idx_classes_course  IF NOT EXISTS ON `university`.`academic`.`classes`(`courseId`)",
  ],
};

async function setupDomain(domain: DomainName): Promise<void> {
  const node = DOMAIN_NODES[domain];
  console.log(`\n[${domain}] Connecting to ${node.ip}…`);

  const cluster = await couchbase.connect(`couchbase://${node.ip}`, {
    username: AUTH.username,
    password: AUTH.password,
    timeouts: { connectTimeout: 15000, queryTimeout: 30000 },
  });

  for (const stmt of DOMAIN_INDEXES[domain]) {
    try {
      await cluster.query(stmt);
      console.log(`  ✓ ${stmt.slice(0, 80)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists") || msg.includes("IndexAlreadyExistsError")) {
        console.log(`  (already exists) ${stmt.slice(0, 60)}`);
      } else {
        console.error(`  ✗ FAILED: ${stmt}\n    ${msg}`);
      }
    }
  }

  await cluster.close();
}

async function main() {
  const domains = Object.keys(DOMAIN_NODES) as DomainName[];
  // Run domain setups sequentially to avoid overwhelming the terminal output;
  // each connects to a completely independent server so they don't block each other.
  for (const domain of domains) {
    await setupDomain(domain);
  }
  console.log("\nIndex setup complete on all 5 domain nodes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

