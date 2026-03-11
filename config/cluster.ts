// config/cluster.ts
// Per-domain node configuration.
//
// Architecture: Fault isolation per domain.
// Each collection lives on its own dedicated single-node Couchbase instance
// (one DigitalOcean Droplet each). If one domain's node goes down, all other
// domains remain fully operational.
//
//   Droplet 1  →  Couchbase instance  →  university.academic.students
//   Droplet 2  →  Couchbase instance  →  university.academic.teachers
//   Droplet 3  →  Couchbase instance  →  university.academic.courses
//   Droplet 4  →  Couchbase instance  →  university.academic.enrolments
//   Droplet 5  →  Couchbase instance  →  university.academic.classes
//
// The Next.js /api layer is the gateway that makes all 5 look like one DB.

export const DOMAIN_NODES = {
  students: {
    ip:         process.env.NODE_STUDENTS_IP   || "YOUR_STUDENTS_DROPLET_IP",
    bucket:     "university",
    scope:      "academic",
    collection: "students",
  },
  teachers: {
    ip:         process.env.NODE_TEACHERS_IP   || "YOUR_TEACHERS_DROPLET_IP",
    bucket:     "university",
    scope:      "academic",
    collection: "teachers",
  },
  courses: {
    ip:         process.env.NODE_COURSES_IP    || "YOUR_COURSES_DROPLET_IP",
    bucket:     "university",
    scope:      "academic",
    collection: "courses",
  },
  enrolments: {
    ip:         process.env.NODE_ENROLMENTS_IP || "YOUR_ENROLMENTS_DROPLET_IP",
    bucket:     "university",
    scope:      "academic",
    collection: "enrolments",
  },
  classes: {
    ip:         process.env.NODE_CLASSES_IP     || "YOUR_CLASSES_DROPLET_IP",
    bucket:     "university",
    scope:      "academic",
    collection: "classes",
  },
} as const;

export const AUTH = {
  username: process.env.COUCHBASE_USERNAME || "Administrator",
  password: process.env.COUCHBASE_PASSWORD || "your_password_here",
};

export type DomainName = keyof typeof DOMAIN_NODES;
