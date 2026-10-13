import type { CurrentUser } from "../../lib/auth";

export default function ParentDashboard({ user }: { user: CurrentUser }) {
  return (
    <section className="page-section dashboard-page">
      <p className="eyebrow">Parent workspace</p>
      <h1>Hello, {user.username}.</h1>
      <p>Welcome to your dashboard.</p>
    </section>
  );
}
