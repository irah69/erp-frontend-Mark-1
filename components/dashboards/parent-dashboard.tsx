import type { CurrentUser } from "../../lib/auth";

export default function ParentDashboard({ user }: { user: CurrentUser }) {
  return <section className="page-section dashboard-page"><p className="eyebrow">Parent workspace</p><h1>Hello, {user.username}.</h1><p>Welcome to your Parent ERP dashboard. Your account is connected and ready.</p><div className="user-info-card"><p className="eyebrow">Your profile</p><div className="info-grid"><span>Username<strong>{user.username}</strong></span><span>Email<strong>{user.email}</strong></span><span>User ID<strong>{user.id}</strong></span><span>Linked person ID<strong>{user.person_id ?? "Not linked"}</strong></span></div></div></section>;
}
