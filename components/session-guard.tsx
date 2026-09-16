"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { requireSession } from "../lib/auth";

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

export default function SessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

    const verify = () => {
      void requireSession();
    };

    verify();
    const interval = window.setInterval(verify, SESSION_CHECK_INTERVAL);
    window.addEventListener("focus", verify);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", verify);
    };
  }, [pathname]);

  return null;
}