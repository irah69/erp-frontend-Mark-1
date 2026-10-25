"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Search, UsersRound } from "lucide-react";
import { PageHeader } from "../../components/ui/page-header";
import Loader from "../../components/ui/loader";
import {
  apiRequest,
  getClassStudents,
  type ClassRoster,
} from "../../lib/api";
import { checkSession, type CurrentUser } from "../../lib/auth";

type Grade = {
  id: number;
  academic_year: string;
  grade: string;
  section_id: number | null;
  staff_id: number | null;
  status: string;
};

type Section = {
  id: number;
  section: string;
};

export default function MyClassPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [rosters, setRosters] = useState<Array<{ grade: Grade; roster: ClassRoster }>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadClassData() {
      try {
        const currentUser = await checkSession();
        if (!currentUser) {
          throw new Error("Please sign in to view your class.");
        }
        if (currentUser.role_id !== 2 || currentUser.person_id === null) {
          throw new Error("Only staff accounts linked to a staff record can view My Class.");
        }

        const [gradeData, sectionData] = await Promise.all([
          apiRequest<Grade[]>("/api/grades", { cache: "no-store" }),
          apiRequest<Section[]>("/api/sections", { cache: "no-store" }),
        ]);

        const assignedGrades = gradeData.filter(
          (grade) =>
            grade.staff_id === currentUser.person_id &&
            grade.status.toLowerCase() === "active"
        );
        const assignedRosters = await Promise.all(
          assignedGrades.map(async (grade) => {
            const section = sectionData.find((item) => item.id === grade.section_id);
            if (!section) {
              throw new Error(`Section for Grade ${grade.grade} was not found.`);
            }
            const roster = await getClassStudents({
              grade: grade.grade,
              section: section.section,
              academic_year: grade.academic_year,
            });
            return { grade, roster };
          })
        );

        if (!cancelled) {
          setUser(currentUser);
          setGrades(assignedGrades);
          setRosters(assignedRosters);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your assigned classes."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadClassData();
    return () => {
      cancelled = true;
    };
  }, []);

  const assignedClasses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rosters.map(({ grade, roster }) => {
      const classStudents = roster.students;
      const visibleStudents = classStudents.filter((student) =>
        `${student.name} ${student.roll_number}`.toLowerCase().includes(query)
      );

      return { grade, roster, classStudents, visibleStudents };
    }).filter(
      ({ roster, classStudents }) =>
        !query ||
        `${roster.academic_year} ${roster.grade} ${roster.section}`
          .toLowerCase()
          .includes(query) ||
        classStudents.some((student) =>
          `${student.name} ${student.roll_number}`.toLowerCase().includes(query)
        )
    );
  }, [rosters, search]);

  function openStudentProfile(student: ClassRoster["students"][number]) {
    if (student.user_id === null) {
      setError(`No student account is linked to ${student.name}; their profile cannot be opened.`);
      return;
    }
    router.push(`/users/${student.user_id}/profile`);
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-7 text-slate-900 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <PageHeader
          title="My class"
          description={user ? `Classes assigned to ${user.username}` : "Your assigned classes and student profiles"}
          actions={
            <label className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <span className="sr-only">Search classes and students</span>
              <input
                type="search"
                placeholder="Search classes or students…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </label>
          }
        />

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <Loader title="Loading your classes…" subtitle="Retrieving your assigned rosters" size="sm" />
        ) : assignedClasses.length === 0 ? (
          <section className="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center">
            <UsersRound className="mx-auto text-slate-400" size={30} aria-hidden="true" />
            <h2 className="mt-3 font-semibold">No assigned classes</h2>
            <p className="mt-1 text-sm text-slate-500">
              {grades.length === 0
                ? "There are no active classes assigned to your staff account."
                : "No classes or students match your search."}
            </p>
          </section>
        ) : (
          <div className="space-y-5">
            {assignedClasses.map(({ grade, roster, classStudents, visibleStudents }) => (
              <section
                key={grade.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      {roster.academic_year}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      Grade {roster.grade} · Section {roster.section}
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <UsersRound size={16} aria-hidden="true" />
                    {classStudents.length} students
                  </span>
                </header>

                {visibleStudents.length === 0 ? (
                  <p className="p-5 text-sm text-slate-500">
                    {classStudents.length === 0
                      ? "No students are listed in this class."
                      : "No students match your search."}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-white text-xs font-medium text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-3 py-3">Roll number</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {visibleStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium">{student.name}</td>
                              <td className="px-3 py-3 text-slate-600">
                                {student.roll_number || "—"}
                              </td>
                              <td className="px-3 py-3">
                                <span className="capitalize">{student.status}</span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  disabled={student.user_id === null}
                                  onClick={() => openStudentProfile(student)}
                                  title={student.user_id !== null ? "Open student profile editor" : "No user account is linked to this student"}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                                >
                                  <Pencil size={13} aria-hidden="true" />
                                  Edit profile
                                </button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
