// scripts/seed-sn.ts
// Run with: npm run seed-sn
//
// Seeds sample data into the shared-nothing cluster.
// All 5 collections live in university.sharednothing.* on a single multi-node
// cluster — every document is routed to its owning vBucket automatically.
//
// Pre-requisite: run `npm run setup-indexes-sn` first.

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import * as couchbase from "couchbase";
import { v4 as uuidv4 } from "uuid";
import { SN_CONFIG, SN_AUTH } from "../config/sharednothing";
import { Student, Teacher, Course, Enrolment, Class } from "../lib/types";

// ── Sample data ───────────────────────────────────────────────────────────────

const TEACHERS: Omit<Teacher, "id">[] = [
  { type: "teacher", firstName: "Eleanor", lastName: "Vance",    email: "e.vance@university.edu",    department: "Computer Science", hiredAt: "2018-08-01T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "Marcus",  lastName: "Okafor",   email: "m.okafor@university.edu",   department: "Mathematics",      hiredAt: "2015-01-15T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "Sofia",   lastName: "Reyes",    email: "s.reyes@university.edu",    department: "Physics",          hiredAt: "2020-09-01T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "James",   lastName: "Whitmore", email: "j.whitmore@university.edu", department: "History",          hiredAt: "2012-03-10T00:00:00Z", status: "active"   },
  { type: "teacher", firstName: "Priya",   lastName: "Mehta",    email: "p.mehta@university.edu",    department: "Chemistry",        hiredAt: "2019-06-20T00:00:00Z", status: "inactive" },
];

const COURSES: Omit<Course, "id">[] = [
  { type: "course", code: "CS101",   title: "Introduction to Programming",  description: "Fundamentals of programming using Python.",             creditHours: 3, department: "Computer Science" },
  { type: "course", code: "MATH201", title: "Discrete Mathematics",         description: "Logic, sets, graphs, and combinatorics.",               creditHours: 4, department: "Mathematics"      },
  { type: "course", code: "PHYS101", title: "Classical Mechanics",          description: "Newton's laws, energy, momentum, and oscillations.",    creditHours: 4, department: "Physics"          },
  { type: "course", code: "HIST305", title: "Modern European History",      description: "Europe from the French Revolution to World War II.",     creditHours: 3, department: "History"          },
  { type: "course", code: "CHEM202", title: "Organic Chemistry I",          description: "Structure, reactivity, and synthesis of organic mols.", creditHours: 4, department: "Chemistry"        },
];

const STUDENTS: Omit<Student, "id">[] = [
  { type: "student", firstName: "Liam",     lastName: "Carter",  email: "liam.carter@students.edu",   dateOfBirth: "2001-04-12T00:00:00Z", enrolledAt: "2022-09-01T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Amara",    lastName: "Diallo",  email: "amara.diallo@students.edu",  dateOfBirth: "2002-07-23T00:00:00Z", enrolledAt: "2022-09-01T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Chen",     lastName: "Wei",     email: "chen.wei@students.edu",      dateOfBirth: "2001-11-03T00:00:00Z", enrolledAt: "2021-09-01T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Isabella", lastName: "Santos",  email: "i.santos@students.edu",      dateOfBirth: "2003-02-19T00:00:00Z", enrolledAt: "2023-01-15T00:00:00Z", status: "active"   },
  { type: "student", firstName: "Nikolai",  lastName: "Ivanov",  email: "n.ivanov@students.edu",      dateOfBirth: "2000-09-05T00:00:00Z", enrolledAt: "2020-09-01T00:00:00Z", status: "inactive" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function insertAll<T extends { id?: string }>(
  collection: couchbase.Collection,
  label: string,
  docs: Omit<T, "id">[]
): Promise<string[]> {
  const ids: string[] = [];
  console.log(`\n[${label}] Inserting ${docs.length} documents…`);
  for (const doc of docs) {
    const id = uuidv4();
    await collection.upsert(id, { ...doc, id });
    ids.push(id);
    console.log(`  ✓ ${id}`);
  }
  return ids;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Connecting to shared-nothing cluster: ${SN_CONFIG.connectionString}`);

  const cluster = await couchbase.connect(SN_CONFIG.connectionString, {
    username: SN_AUTH.username,
    password: SN_AUTH.password,
    timeouts: { connectTimeout: 20_000, kvTimeout: 10_000 },
  });

  const scope = cluster.bucket(SN_CONFIG.bucket).scope(SN_CONFIG.scope);

  // All inserts go into university.sharednothing.* — the SDK routes each
  // document to the owning vBucket node automatically.
  const teacherIds = await insertAll<Teacher>(scope.collection("teachers"), "teachers",   TEACHERS);
  const courseIds  = await insertAll<Course> (scope.collection("courses"),  "courses",    COURSES);
  const studentIds = await insertAll<Student>(scope.collection("students"), "students",   STUDENTS);

  // Enrolments — each student enrolls in the course matching their index
  // (student 0 → course 0, student 1 → course 1, …)
  // Plus add a couple of students to the same course to show multi-student classes.
  console.log("\n[enrolments] Inserting enrolment documents…");
  const enrolmentsCol = scope.collection("enrolments");

  // courseEnrolments[courseIndex] = [studentIds enrolled in that course]
  const courseEnrolments: string[][] = COURSES.map(() => []);

  const enrolmentPairs: { studentIdx: number; courseIdx: number }[] = [
    { studentIdx: 0, courseIdx: 0 }, // Liam      → CS101
    { studentIdx: 1, courseIdx: 0 }, // Amara     → CS101
    { studentIdx: 2, courseIdx: 1 }, // Chen       → MATH201
    { studentIdx: 3, courseIdx: 2 }, // Isabella  → PHYS101
    { studentIdx: 4, courseIdx: 3 }, // Nikolai   → HIST305
    { studentIdx: 0, courseIdx: 4 }, // Liam      → CHEM202
    { studentIdx: 2, courseIdx: 4 }, // Chen      → CHEM202
  ];

  const grades = ["A", "B+", "A-", null, null, "B", null];
  for (let i = 0; i < enrolmentPairs.length; i++) {
    const { studentIdx, courseIdx } = enrolmentPairs[i];
    const id = uuidv4();
    const doc: Enrolment = {
      type:       "enrolment",
      id,
      studentId:  studentIds[studentIdx],
      courseId:   courseIds[courseIdx],
      enrolledAt: new Date().toISOString(),
      grade:      grades[i] as string | null,
      status:     i < 5 ? "active" : "completed",
    };
    await enrolmentsCol.upsert(id, doc);
    courseEnrolments[courseIdx].push(studentIds[studentIdx]);
    console.log(`  ✓ ${STUDENTS[studentIdx].firstName} → ${COURSES[courseIdx].code}  (${id})`);
  }

  // Classes — one class per course, taught by the teacher from the same department,
  // with only the students who enrolled in that course.
  console.log("\n[classes] Inserting 5 documents…");
  const classesCol = scope.collection("classes");
  const schedules = [
    "Mon/Wed 09:00–10:30",
    "Tue/Thu 11:00–12:30",
    "Mon/Wed/Fri 14:00–15:00",
    "Tue/Thu 14:00–16:00",
    "Fri 09:00–12:00",
  ] as const;

  // Each course's teacher is the one from the same department (indices align).
  for (let i = 0; i < COURSES.length; i++) {
    const id = uuidv4();
    const doc: Class = {
      type:       "class",
      id,
      courseId:   courseIds[i],
      teacherId:  teacherIds[i],           // TEACHERS[i].department === COURSES[i].department
      studentIds: courseEnrolments[i],     // only students enrolled in this course
      semester:   i % 2 === 0 ? "Fall" : "Spring",
      year:       2024 + Math.floor(i / 2),
      room:       `Building ${String.fromCharCode(65 + i)}-${101 + i * 10}`,
      schedule:   schedules[i],
    };
    await classesCol.upsert(id, doc);
    console.log(`  ✓ ${COURSES[i].code} | teacher: ${TEACHERS[i].firstName} ${TEACHERS[i].lastName} | students: ${courseEnrolments[i].length}  (${id})`);
  }

  await cluster.close();
  console.log("\n✓ Seed complete — 27 documents in university.sharednothing.*");
  console.log("  Each class only contains students enrolled in that course.");
  console.log("  Each teacher matches their course department.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
