"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/line-charts-9";

import type { CurrentUser } from "../../lib/auth";
import {
  getAttendanceRecords,
  getClassSessions,
  type AttendanceStatus,
  type AttendanceRecord,
  type ClassSessionRecord,
} from "../../lib/api";
import { getMyAttendanceReport, type StudentAttendanceReport } from "../../lib/attendanceApi";
import {
  getExamResults,
  listStudentExams,
} from "../../lib/examApi";

/* Statuses that count as "attended" in the trend chart.
   Change this if your backend calculates percentage differently. */
const ATTENDED_STATUSES: AttendanceStatus[] = ["PRESENT", "LATE"];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "var(--chart-status-present)",
  ABSENT: "var(--chart-status-absent)",
  LATE: "var(--chart-status-late)",
  EXCUSED: "var(--chart-status-excused)",
};

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: "border-green-200 bg-green-50 text-green-700",
  ABSENT: "border-red-200 bg-red-50 text-red-700",
  LATE: "border-amber-200 bg-amber-50 text-amber-700",
  EXCUSED: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const trendConfig = {
  value: { label: "Attendance", theme: { light: "var(--chart-1)", dark: "var(--chart-1)" } },
} satisfies ChartConfig;

const marksTrendConfig = {
  value: { label: "Marks", theme: { light: "var(--chart-3)", dark: "var(--chart-3)" } },
} satisfies ChartConfig;

const statusConfig = {
  value: { label: "Classes", theme: { light: "var(--chart-1)", dark: "var(--chart-1)" } },
} satisfies ChartConfig;

const cardClass = "rounded-md shadow-none";
const accentCardClass = `${cardClass} border-l-[3px] border-l-indigo-600`;
const cardBodyClass = "p-4 sm:p-5";
const headingClass = "mb-3 text-base font-bold sm:text-lg";

function toTitleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-[calc(100vh-65px)] bg-slate-50 px-3 py-5 text-slate-900 sm:px-5 sm:py-8 lg:px-6"
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </main>
  );
}

type TipProps = {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number | null } }>;
  suffix?: string;
};

function ValueTip({ active, payload, suffix = "" }: TipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded border border-border bg-background px-2.5 py-1.5 text-xs">
      <p className="text-muted-foreground">{item.label}</p>
      <p className="font-bold">
        {item.value === null ? "Marks unavailable" : `${item.value}${suffix}`}
      </p>
    </div>
  );
}

type MarksTrendPoint = {
  label: string;
  value: number | null;
};

export default function StudentDashboard({ user }: { user: CurrentUser }) {
  const [student, setStudent] = useState<{ name: string; grade: string | null; section: string | null } | null>(null);
  const [attendance, setAttendance] =
    useState<StudentAttendanceReport | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [marksTrend, setMarksTrend] = useState<MarksTrendPoint[]>([]);
  const [marksTrendLoading, setMarksTrendLoading] = useState(true);
  const [marksTrendError, setMarksTrendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        if (user.person_id === null) {
          throw new Error("Student account is not linked to a student record.");
        }

        const [attendanceResponse, sessions] = await Promise.all([
          getAttendanceRecords(),
          getClassSessions(),
        ]);
        const attendanceRecords: AttendanceRecord[] = attendanceResponse.filter(
          (record) => Number(record.student_id) === Number(user.person_id)
        );
        const academicYear = attendanceRecords
          .map((record) => record.academic_year)
          .filter((year): year is string => Boolean(year))
          .sort((a, b) => b.localeCompare(a))[0] ?? "";
        const yearAttendance = academicYear
          ? await getAttendanceRecords(academicYear)
          : attendanceResponse;
        const currentYearRecords = yearAttendance.filter(
          (record) =>
            Number(record.student_id) === Number(user.person_id) &&
            (!academicYear || record.academic_year === academicYear)
        );
        const studentReport = await getMyAttendanceReport(academicYear || undefined).catch(() => null);
        const sessionsById = new Map<number, ClassSessionRecord>(
          sessions.map((session) => [session.id, session])
        );
        const records = currentYearRecords.map((record) => {
          const session = sessionsById.get(record.session_id);
          return {
            attendance_id: record.id,
            session_id: record.session_id,
            academic_year: record.academic_year,
            session_date: session?.session_date ?? "",
            period_number: null,
            start_time: "",
            end_time: "",
            subject_id: session?.subject_id ?? 0,
            staff_id: session?.staff_id ?? 0,
            status: record.status,
            remarks: record.remarks ?? null,
          };
        });
        const present = records.filter((record) => record.status === "PRESENT").length;
        const absent = records.filter((record) => record.status === "ABSENT").length;
        const late = records.filter((record) => record.status === "LATE").length;
        const excused = records.filter((record) => record.status === "EXCUSED").length;
        const attended = present + late;
        const report: StudentAttendanceReport = {
          academic_year: academicYear,
          student: {
            id: user.person_id,
            name: user.username,
            roll_number: null,
            grade: null,
            section: null,
          },
          total_classes: records.length,
          attended_classes: attended,
          present,
          absent,
          late,
          excused,
          percentage: records.length ? Math.round((attended / records.length) * 1000) / 10 : 0,
          records,
        };

        setAcademicYear(academicYear);
        setStudent({
          name: studentReport?.student.name ?? user.username,
          grade: studentReport?.student.grade ?? null,
          section: studentReport?.student.section ?? null,
        });
        setAttendance(report);

        setMarksTrendLoading(true);
        setMarksTrendError(null);
        try {
          const studentExams = await listStudentExams(0, 500);
          const trendYear = academicYear || [...studentExams]
            .map((exam) => exam.academic_year)
            .sort((a, b) => b.localeCompare(a))[0] || "";
          if (!academicYear && trendYear) setAcademicYear(trendYear);

          const publishedExams = studentExams
            .filter((exam) => exam.status === "published" && (!trendYear || exam.academic_year === trendYear))
            .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id);
          const examResults = await Promise.allSettled(
            publishedExams.map((exam) => getExamResults(exam.id))
          );
          const trendPoints: MarksTrendPoint[] = examResults.map((examResult, index) => {
            const exam = publishedExams[index];
            if (examResult.status === "rejected") {
              return { label: exam.name, value: null };
            }

            const ownResult = examResult.value.students.find(
              (entry) => Number(entry.student_id) === Number(user.person_id)
            );
            if (!ownResult || !ownResult.subjects.length) {
              return { label: exam.name, value: null };
            }
            if (ownResult.subjects.some((subject) => !subject.is_absent && subject.marks_obtained == null)) {
              return { label: exam.name, value: null };
            }

            const totalMarks = ownResult.subjects.reduce(
              (total, subject) => total + (subject.is_absent ? 0 : Number(subject.marks_obtained)),
              0
            );
            const maximumMarks = ownResult.subjects.reduce(
              (total, subject) => total + Number(subject.max_marks),
              0
            );
            return {
              label: exam.name,
              value: maximumMarks > 0
                ? Math.round((totalMarks / maximumMarks) * 1000) / 10
                : null,
            };
          });
          setMarksTrend(trendPoints);
          const failedResults = examResults.filter((examResult) => examResult.status === "rejected").length;
          if (failedResults > 0) {
            setMarksTrendError(`Marks for ${failedResults} published exam${failedResults === 1 ? "" : "s"} could not be loaded.`);
          }
        } catch (marksError) {
          setMarksTrendError(
            marksError instanceof Error ? marksError.message : "Unable to load examination marks."
          );
        } finally {
          setMarksTrendLoading(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load student dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user.person_id, user.username]);

  /* Cumulative attendance percentage, one point per class day. */
  const trendData = useMemo(() => {
    if (!attendance) return [];

    const byDate = new Map<string, { total: number; attended: number }>();
    for (const record of attendance.records) {
      const key = record.session_date.slice(0, 10);
      const entry = byDate.get(key) ?? { total: 0, attended: 0 };
      entry.total += 1;
      if (ATTENDED_STATUSES.includes(record.status)) entry.attended += 1;
      byDate.set(key, entry);
    }

    let total = 0;
    let attended = 0;
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entry]) => {
        total += entry.total;
        attended += entry.attended;
        return {
          label: formatShortDate(date),
          value: Math.round((attended / total) * 1000) / 10,
        };
      });
  }, [attendance]);

  const statusData = useMemo(() => {
    if (!attendance) return [];
    return [
      { label: "Present", value: attendance.present, fill: STATUS_COLORS.PRESENT },
      { label: "Absent", value: attendance.absent, fill: STATUS_COLORS.ABSENT },
      { label: "Late", value: attendance.late, fill: STATUS_COLORS.LATE },
      { label: "Excused", value: attendance.excused, fill: STATUS_COLORS.EXCUSED },
    ];
  }, [attendance]);

  const recentRecords = useMemo(() => {
    if (!attendance) return [];
    return [...attendance.records]
      .sort(
        (a, b) =>
          b.session_date.localeCompare(a.session_date) ||
          (b.period_number ?? 0) - (a.period_number ?? 0)
      )
      .slice(0, 5);
  }, [attendance]);

  if (loading) {
    return (
      <Shell><Loader title="Loading your dashboard…" subtitle="Please wait while we load your student information" className="min-h-[60vh]" /></Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <Card className={`${cardClass} border-l-[3px] border-l-red-600`}>
          <CardContent className={cardBodyClass}>
            <h1 className="mb-1 text-xl font-bold sm:text-2xl">
              Unable to load dashboard
            </h1>
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const classLabel = `${student?.grade || "—"}${
    student?.section ? ` - ${student.section}` : ""
  }`;

  const stats = attendance
    ? [
        ["Total classes", attendance.total_classes],
        ["Attended", attendance.attended_classes],
        ["Present", attendance.present],
        ["Absent", attendance.absent],
        ["Late", attendance.late],
        ["Excused", attendance.excused],
      ]
    : [];

  return (
    <Shell>
      <header className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          Hello, {student?.name || user.username}.
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back. Here is your current academic and attendance
          information.
        </p>
      </header>

      <section
        aria-label="Summary"
        className="mb-3 grid grid-cols-2 gap-3 sm:mb-4"
      >
        <Card className={accentCardClass}>
          <CardContent className={cardBodyClass}>
            <p className="text-xs text-slate-500 sm:text-sm">Class</p>
            <p className="mt-1 text-lg font-bold sm:text-2xl">{classLabel}</p>
          </CardContent>
        </Card>
        <Card className={accentCardClass}>
          <CardContent className={cardBodyClass}>
            <p className="text-xs text-slate-500 sm:text-sm">Attendance</p>
            <p className="mt-1 text-lg font-bold sm:text-2xl">
              {attendance ? `${attendance.percentage}%` : "—"}
            </p>
          </CardContent>
        </Card>
      </section>

      {attendance && (
        <Card className={`${cardClass} mb-3 sm:mb-4`}>
          <CardContent className={cardBodyClass}>
            <h2 className={headingClass}>Attendance overview</h2>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
              {stats.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 text-lg font-bold sm:text-xl">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {attendance && (
        <section
          aria-label="Academic trends"
          className="mb-3 grid gap-3 sm:mb-4 sm:gap-4 lg:grid-cols-2"
        >
          <Card className={accentCardClass}>
            <CardContent className={cardBodyClass}>
              <h2 className={headingClass}>Attendance trend</h2>
              <p className="-mt-2 mb-3 text-xs text-slate-500">
                Cumulative attendance percentage by class day
              </p>
              {trendData.length > 0 ? (
                <ChartContainer
                  config={trendConfig}
                  className="aspect-auto h-56 w-full sm:h-72"
                >
                  <LineChart
                    data={trendData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={4}
                      width={38}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip content={<ValueTip suffix="%" />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={trendData.length <= 15 ? { r: 3 } : false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <p className="flex h-56 items-center justify-center text-sm text-slate-500 sm:h-72">
                  No attendance trend available for this academic year.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={accentCardClass}>
            <CardContent className={cardBodyClass}>
              <h2 className={headingClass}>Marks trend</h2>
              <p className="-mt-2 mb-3 text-xs text-slate-500">
                Published exam percentages{academicYear ? ` · ${academicYear}` : ""}
              </p>
              {marksTrendLoading ? (
                <Loader title="Loading published exam marks…" subtitle="Retrieving your results" size="sm" className="h-56 sm:h-72" />
              ) : marksTrend.length > 0 ? (
                <>
                  <ChartContainer
                    config={marksTrendConfig}
                    className="aspect-auto h-56 w-full sm:h-72"
                  >
                    <LineChart
                      data={marksTrend}
                      margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={4}
                        width={38}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <ChartTooltip content={<ValueTip suffix="%" />} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        connectNulls={false}
                        dot={{ r: 4 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ChartContainer>
                  {marksTrendError && <p className="mt-2 text-xs text-amber-700" role="status">{marksTrendError}</p>}
                </>
              ) : (
                <p className="flex h-56 items-center justify-center text-sm text-slate-500 sm:h-72">
                  {marksTrendError ?? "No published exam marks available for this academic year."}
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {attendance && attendance.records.length > 0 && (
        <Card className={`${cardClass} mb-3 sm:mb-4`}>
          <CardContent className={cardBodyClass}>
            <h2 className={headingClass}>Attendance status breakdown</h2>
            <p className="-mt-2 mb-3 text-xs text-slate-500">Number of classes by status</p>
            <ChartContainer
              config={statusConfig}
              className="aspect-auto h-56 w-full sm:h-72"
            >
              <BarChart
                data={statusData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={4}
                  width={28}
                />
                <ChartTooltip cursor={false} content={<ValueTip suffix=" classes" />} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={40}>
                  {statusData.map((item) => (
                    <Cell key={item.label} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {attendance && recentRecords.length > 0 && (
        <Card className={cardClass}>
          <CardContent className={cardBodyClass}>
            <h2 className={headingClass}>Recent attendance</h2>
            <ul>
              {recentRecords.map((record) => (
                <li
                  key={record.attendance_id}
                  className="flex items-center justify-between gap-3 border-b border-slate-200 py-3 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {formatFullDate(record.session_date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Period {record.period_number ?? "—"}
                    </p>
                  </div>
                  <strong
                    className={`rounded border px-2 py-0.5 text-xs font-normal ${STATUS_BADGE[record.status]}`}
                  >
                    {toTitleCase(record.status)}
                  </strong>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {attendance && attendance.records.length === 0 && (
        <Card className={cardClass}>
          <CardContent className={cardBodyClass}>
            <h2 className={headingClass}>No attendance records</h2>
            <p className="text-sm text-slate-500">
              No attendance records have been recorded yet.
            </p>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
