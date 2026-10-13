import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "../components/sidebar";
import SessionGuard from "../components/session-guard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Student ERP",
  description: "Student and user management frontend",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-gray-50 text-gray-900">
        <SessionGuard />

        <div className="group/shell min-h-dvh">
          <Sidebar />

          <main
  className="
    min-h-dvh w-full min-w-0
    transition-[padding] duration-300 ease-out motion-reduce:transition-none
    group-has-[#app-sidebar]/shell:pt-16
    lg:group-has-[#app-sidebar]/shell:pt-0
    lg:group-has-[#app-sidebar[data-pinned='false']]/shell:pl-20
    lg:group-has-[#app-sidebar[data-pinned='true']]/shell:pl-72
  "
>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}