// scripts/seed.ts
// Run with: npm run seed
// Inserts 5 sample documents into each domain's dedicated Couchbase node.
// Each domain is a separate single-node instance; this script connects to
// each one independently so no single failure affects the other domains.

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import * as couchbase from "couchbase";
import { v4 as uuidv4 } from "uuid";
import { DOMAIN_NODES, AUTH, DomainName } from "../config/cluster";
import { Student, Teacher, Course, Enrolment, Class } from "../lib/types";

// ── Sample data ──────────────────────────────────────────────────────────────

const TEACHERS: Omit<Teacher, "id">[] = [
  { type: "teacher", firstName: "Eleanor", lastName: "Vance",   email: "e.vance@university.edu",   department: "Computer Science",  hiredAt: "2018-08-01T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "Marcus",  lastName: "Okafor",  email: "m.okafor@university.edu",  department: "Mathematics",       hiredAt: "2015-01-15T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "Sofia",   lastName: "Reyes",   email: "s.reyes@university.edu",   department: "Physics",           hiredAt: "2020-09-01T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "James",   lastName: "Whitmore",email: "j.whitmore@university.edu",department: "History",           hiredAt: "2012-03-10T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "Priya",   lastName: "Mehta",   email: "p.mehta@university.edu",   department: "Chemistry",         hiredAt: "2019-06-20T00:00:00Z", status: "inactive" },
];

const COURSES: Omit<Course, "id">[] = [
  { type: "course", code: "CS101",  title: "Introduction to Programming",    description: "Fundamentals of programming using Python.",            creditHours: 3, department: "Computer Science" },
  { type: "course", code: "MATH201",title: "Discrete Mathematics",           description: "Logic, sets, graphs, and combinatorics.",              creditHours: 4, department: "Mathematics"   },
  { type: "course", code: "PHYS101",title: "Classical Mechanics",            description: "Newton's laws, energy, momentum, and oscillations.",   creditHours: 4, department: "Physics"       },
  { type: "course", code: "HIST305",title: "Modern European History",        description: "Europe from the French Revolution to World War II.",    creditHours: 3, department: "History"       },
  { type: "course", code: "CHEM202",title: "Organic Chemistry I",            description: "Structure, reactivity, and synthesis of organic mols.", creditHours: 4, department: "Chemistry"     },
];

const STUDENTS: Omit<Student, "id">[] = [
  { type: "student", firstName: "Liam",    lastName: "Carter",   email: "liam.carter@students.edu",   dateOfBirth: "2001-04-12T00:00:00Z", enrolledAt: "2022-09-01T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Amara",   lastName: "Diallo",   email: "amara.diallo@students.edu",  dateOfBirth: "2002-07-23T00:00:00Z", enrolledAt: "2022-09-01T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Chen",    lastName: "Wei",      email: "chen.wei@students.edu",      dateOfBirth: "2001-11-03T00:00:00Z", enrolledAt: "2021-09-01T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Isabella",lastName: "Santos",   email: "i.santos@students.edu",      dateOfBirth: "2003-02-19T00:00:00Z", enrolledAt: "2023-01-15T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Nikolai", lastName: "Ivanov",   email: "n.ivanov@students.edu",      dateOfBirth: "2000-09-05T00:00:00Z", enrolledAt: "2020-09-01T00:00:00Z", status: "inactive" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function connectToDomain(domain: DomainName) {
  const node = DOMAIN_NODES[domain];
  console.log(`\n[${domain}] Connecting to ${node.ip}…`);
  return couchbase.connect(`couchbase://${node.ip}`, {
    username: AUTH.username,
    password: AUTH.password,
    timeouts: { connectTimeout: 15000, kvTimeout: 10000 },
  });
}

async function insertAll<T extends { id?: string }>(
  collection: couchbase.Collection,
  docs: Omit<T, "id">[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const doc of docs) {
    const id = uuidv4();
    await collection.upsert(id, { ...doc, id });
    ids.push(id);
    console.log(`  Inserted ${id}`);
  }
  return ids;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── Teachers node ──────────────────────────────────────────────────────────
  let cluster = await connectToDomain("teachers");
  console.log("Seeding teachers…");
  const teacherIds = await insertAll<Teacher>(
    cluster.bucket("university").scope("academic").collection("teachers"),
    TEACHERS,
  );
  await cluster.close();

  // ── Courses node ───────────────────────────────────────────────────────────
  cluster = await connectToDomain("courses");
  console.log("Seeding courses…");
  const courseIds = await insertAll<Course>(
    cluster.bucket("university").scope("academic").collection("courses"),
    COURSES,
  );
  await cluster.close();

  // ── Students node ──────────────────────────────────────────────────────────
  cluster = await connectToDomain("students");
  console.log("Seeding students…");
  const studentIds = await insertAll<Student>(
    cluster.bucket("university").scope("academic").collection("students"),
    STUDENTS,
  );
  await cluster.close();

  // ── Enrolments node ───────────────────────────────────────────────────────
  cluster = await connectToDomain("enrolments");
  console.log("Seeding enrolments…");
  const enrolmentsCol = cluster.bucket("university").scope("academic").collection("enrolments");
  for (let i = 0; i < 5; i++) {
    const id = uuidv4();
    const doc: Enrolment = {
      type: "enrolment",
      id,
      studentId: studentIds[i],
      courseId:  courseIds[i % courseIds.length],
      enrolledAt: new Date().toISOString(),
      grade: i < 3 ? (["A", "B+", "A-"] as const)[i] : null,
      status: i < 4 ? "active" : "completed",
    };
    await enrolmentsCol.upsert(id, doc);
    console.log(`  Inserted ${id}`);
  }
  await cluster.close();

  // ── Classes node ───────────────────────────────────────────────────────────
  cluster = await connectToDomain("classes");
  console.log("Seeding classes…");
  const classesCol = cluster.bucket("university").scope("academic").collection("classes");
  const schedules = ["Mon/Wed 9:00–10:30", "Tue/Thu 11:00–12:30", "Mon/Wed/Fri 14:00–15:00", "Tue/Thu 14:00–16:00", "Fri 9:00–12:00"] as const;
  for (let i = 0; i < 5; i++) {
    const id = uuidv4();
    const doc: Class = {
      type: "class",
      id,
      courseId:   courseIds[i],
      teacherId:  teacherIds[i],
      studentIds: studentIds.slice(0, 3 + (i % 3)),
      semester:   i % 2 === 0 ? "Fall" : "Spring",
      year:       2024 + Math.floor(i / 2),
      room:       `Building ${String.fromCharCode(65 + i)}-${101 + i * 10}`,
      schedule:   schedules[i],
    };
    await classesCol.upsert(id, doc);
    console.log(`  Inserted ${id}`);
  }
  await cluster.close();

  console.log("\nSeed complete. 5 documents inserted into each of the 5 domain nodes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
