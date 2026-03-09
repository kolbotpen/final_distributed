"use client";
// components/NavBar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/students", label: "Students" },
  { href: "/teachers", label: "Teachers" },
  { href: "/courses", label: "Courses" },
  { href: "/enrollments", label: "Enrollments" },
  { href: "/classes", label: "Classes" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="bg-indigo-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="font-bold text-lg tracking-tight mr-4">
          🎓 University — Distributed
        </span>
        {links.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                active
                  ? "text-white border-b-2 border-white pb-0.5"
                  : "text-indigo-200 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
