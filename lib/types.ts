// lib/types.ts
// Shared TypeScript interfaces matching the Couchbase document schemas.

export interface Student {
  type: "student";
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string; // ISO 8601
  enrolledAt: string; // ISO 8601
  status: "active" | "inactive" | "suspended";
}

export interface Teacher {
  type: "teacher";
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  hiredAt: string; // ISO 8601
  status: "active" | "inactive";
}

export interface Course {
  type: "course";
  id: string;
  code: string;
  title: string;
  description: string;
  creditHours: number;
  department: string;
}

export interface Enrolment {
  type: "enrolment";
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string; // ISO 8601
  grade: string | null;
  status: "active" | "completed" | "dropped";
}

export interface Class {
  type: "class";
  id: string;
  courseId: string;
  teacherId: string;
  studentIds: string[];
  semester: string;
  year: number;
  room: string;
  schedule: string;
}

// Health check response shape — one entry per domain node
export interface DomainHealth {
  domain: string;
  ip: string;
  nodeStatus: "up" | "down";
  latencyMs: number | null;
}

export interface HealthResponse {
  overallStatus: "healthy" | "degraded" | "down";
  // Keys are domain names: students, teachers, courses, enrolments, classes
  domains: Record<string, DomainHealth>;
}
