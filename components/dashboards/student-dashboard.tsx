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
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/line-charts-9";

import type { CurrentUser } from "../../lib/auth";
import {
  getSchedulingStudents,
  type AttendanceStatus,
  type StudentRecord,
} from "../../lib/api";
import {
  getStudentReport,
  type StudentAttendanceReport,
} from "../../lib/attendanceApi";

/* Statuses that count as "attended" in the trend chart.
   Change this if your backend calculates percentage differently. */
const ATTENDED_STATUSES: AttendanceStatus[] = ["PRESENT", "LATE"];

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "#16a34a",
  ABSENT: "#dc2626",
  LATE: "#d97706",
  EXCUSED: "#4f46e5",
};

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  PRESENT: "border-green-200 bg-green-50 text-green-700",
  ABSENT: "border-red-200 bg-red-50 text-red-700",
  LATE: "border-amber-200 bg-amber-50 text-amber-700",
  EXCUSED: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

const trendConfig = {
  value: { label: "Attendance", color: "#4f46e5" },
} satisfies ChartConfig;

const statusConfig = {
  value: { label: "Classes", color: "#4f46e5" },
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
  payload?: Array<{ payload: { label: string; value: number } }>;
  suffix?: string;
};

function ValueTip({ active, payload, suffix = "" }: TipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded border border-border bg-background px-2.5 py-1.5 text-xs">
      <p className="text-muted-foreground">{item.label}</p>
      <p className="font-bold">
        {item.value}
        {suffix}
      </p>
    </div>
  );
}

export default function StudentDashboard({ user }: { user: CurrentUser }) {
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [attendance, setAttendance] =
    useState<StudentAttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        if (!user.person_id) {
          throw new Error("Student account is not linked to a student record.");
        }

        const response = await getSchedulingStudents();

        const students: StudentRecord[] = Array.isArray(response)
          ? response
          : response.students ?? [];

        const currentStudent = students.find(
          (item) => Number(item.id) === Number(user.person_id)
        );

        if (!currentStudent) {
          throw new Error("Student record could not be found for this account.");
        }

        setStudent(currentStudent);

        if (!currentStudent.roll_number) {
          throw new Error("Student does not have a roll number.");
        }

        const report = await getStudentReport({
          rollNumber: currentStudent.roll_number,
        });

        setAttendance(report);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load student dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user.person_id]);

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
      <Shell>
        <Card className={accentCardClass}>
          <CardContent className={cardBodyClass}>
            <h1 className="mb-1 text-xl font-bold sm:text-2xl">
              Loading your dashboard…
            </h1>
            <p className="text-sm text-slate-500">
              Please wait while we load your student information.
            </p>
          </CardContent>
        </Card>
      </Shell>
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

      {attendance && attendance.records.length > 0 && (
        <section
          aria-label="Attendance analytics"
          className="mb-3 grid gap-3 sm:mb-4 sm:gap-4 lg:grid-cols-3"
        >
          <Card className={`${accentCardClass} lg:col-span-2`}>
            <CardContent className={cardBodyClass}>
              <h2 className={headingClass}>Attendance trend</h2>
              <p className="-mt-2 mb-3 text-xs text-slate-500">
                Cumulative attendance percentage by class day
              </p>
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
            </CardContent>
          </Card>

          <Card className={accentCardClass}>
            <CardContent className={cardBodyClass}>
              <h2 className={headingClass}>Status breakdown</h2>
              <p className="-mt-2 mb-3 text-xs text-slate-500">
                Number of classes by status
              </p>
              <ChartContainer
                config={statusConfig}
                className="aspect-auto h-56 w-full sm:h-72"
              >
                <BarChart
                  data={statusData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={4}
                    width={28}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ValueTip suffix=" classes" />}
                  />
                  <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={40}>
                    {statusData.map((item) => (
                      <Cell key={item.label} fill={item.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
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