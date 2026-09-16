import type { CurrentUser } from "../../lib/auth";

export default function StaffDashboard({ user }: { user: CurrentUser }) {
  return <section className="page-section dashboard-page"><p className="eyebrow">Staff workspace</p><h1>Hello, {user.username}.</h1><p>Your staff dashboard is ready. Use your account details below to confirm the active session.</p><div className="user-info-card"><p className="eyebrow">Your profile</p><div className="info-grid"><span>Username<strong>{user.username}</strong></span><span>Email<strong>{user.email}</strong></span><span>User ID<strong>{user.id}</strong></span><span>Role ID<strong>{user.role_id}</strong></span></div></div></section>;
}
