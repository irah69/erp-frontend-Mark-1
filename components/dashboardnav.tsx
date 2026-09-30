"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNav() {
  const pathname = usePathname();

  const links = [
    {
      name: "Dashboard",
      href: "/dashboard",
    },
    {
      name: "Schedule",
      href: "/schedule",
    },
    {
      name: "Profile",
      href: "/profile",
    },
  ];

  return (
    <nav className="dashboard-nav">
      <div className="dashboard-nav-inner">
        <Link href="/dashboard" className="dashboard-brand">
          Student ERP
        </Link>

        <div className="dashboard-nav-links">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`dashboard-nav-link ${
                  active ? "dashboard-nav-link-active" : ""
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .dashboard-nav {
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 100;

          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);

          border-bottom: 1px solid rgba(15, 23, 42, 0.08);

          box-shadow:
            0 2px 6px rgba(15, 23, 42, 0.04),
            0 8px 20px rgba(15, 23, 42, 0.05);
        }

        .dashboard-nav-inner {
          width: 100%;
          max-width: 1200px;

          min-height: 68px;

          margin: 0 auto;
          padding: 0 24px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 32px;
        }

        /* BRAND */

        .dashboard-brand {
          color: #0f172a;
          text-decoration: none;

          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;

          white-space: nowrap;

          transition: transform 0.2s ease;
        }

        .dashboard-brand:hover {
          transform: translateY(-1px);
        }

        /* NAVIGATION */

        .dashboard-nav-links {
          display: flex;
          align-items: center;

          /* CLEAR SPACE BETWEEN EACH BUTTON */
          gap: 12px;
        }

        /* INDIVIDUAL BUTTON */

        .dashboard-nav-link {
          min-width: 105px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 11px 18px;

          border-radius: 10px;

          background: #ffffff;

          border: 1px solid #e2e8f0;

          color: #64748b;

          text-decoration: none;

          font-size: 14px;
          font-weight: 600;

          box-shadow:
            0 2px 4px rgba(15, 23, 42, 0.05),
            0 6px 12px rgba(15, 23, 42, 0.06);

          transition:
            transform 0.2s ease,
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        /* HOVER */

        .dashboard-nav-link:hover {
          color: #0f172a;

          background: #f8fafc;

          border-color: #cbd5e1;

          transform: translateY(-2px);

          box-shadow:
            0 4px 8px rgba(15, 23, 42, 0.07),
            0 10px 20px rgba(15, 23, 42, 0.09);
        }

        /* ACTIVE BUTTON */

        .dashboard-nav-link-active {
          color: #0f172a;

          background: #f1f5f9;

          border-color: #cbd5e1;

          box-shadow:
            0 2px 4px rgba(15, 23, 42, 0.06),
            0 7px 16px rgba(15, 23, 42, 0.10),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .dashboard-nav-link-active:hover {
          transform: translateY(-1px);
        }

        /* TABLET */

        @media (max-width: 768px) {
          .dashboard-nav-inner {
            padding: 0 18px;
            gap: 20px;
          }

          .dashboard-nav-links {
            gap: 9px;
          }

          .dashboard-nav-link {
            min-width: 90px;
            padding: 10px 14px;
          }
        }

        /* MOBILE */

        @media (max-width: 640px) {
          .dashboard-nav-inner {
            min-height: auto;

            padding: 12px 16px;

            flex-direction: column;
            gap: 12px;
          }

          .dashboard-brand {
            font-size: 18px;
          }

          .dashboard-nav-links {
            width: 100%;

            display: flex;
            justify-content: center;

            gap: 8px;
          }

          .dashboard-nav-link {
            min-width: 0;
            flex: 1;

            padding: 10px 8px;

            font-size: 13px;
          }
        }
      `}</style>
    </nav>
  );
}