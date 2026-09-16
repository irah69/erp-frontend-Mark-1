import Link from "next/link";
import type { CurrentUser } from "../../lib/auth";

export default function AdminDashboard({ user }: { user: CurrentUser }) {
  return (
    <section className="page-section dashboard-page">
      <p className="eyebrow">Administrator workspace</p>
      <h1>Welcome back, {user.username}.</h1>
      <p>Manage the Student ERP directory, accounts, and access from your admin dashboard.</p>
      <div className="dashboard-actions">
        <Link className="dashboard-action" href="/students"><strong>Students</strong><span>Create, update, and manage student profiles →</span></Link>
        <Link className="dashboard-action" href="/users"><strong>Users</strong><span>Manage accounts and student relationships →</span></Link>
      </div>
      <div className="user-info-card"><p className="eyebrow">Signed-in administrator</p><div className="info-grid"><span>Username<strong>{user.username}</strong></span><span>Email<strong>{user.email}</strong></span><span>User ID<strong>{user.id}</strong></span><span>Role ID<strong>{user.role_id}</strong></span></div></div>
    </section>
  );
}
