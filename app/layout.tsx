
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import Sidebar from "../components/sidebar";
import SessionGuard from "../components/session-guard";
import { ThemeProvider } from "../components/theme-provider";
import { designSystem } from "../config/design-system";
import "./globals.css";
import "./design-system.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const designTokensStyle = {
  "--font-app": designSystem.fonts.sans,
  "--font-technical": designSystem.fonts.mono,
  "--font-body-size": designSystem.type.body,
  "--font-small-size": designSystem.type.small,
  "--font-heading-size": designSystem.type.heading,
  "--sidebar-width": designSystem.layout.sidebar,
  "--sidebar-collapsed-width": designSystem.layout.sidebarCollapsed,
  "--content-width": designSystem.layout.content,
  "--page-gutter": designSystem.layout.pageGutter,
  "--radius-control": designSystem.radius.control,
  "--radius-interactive": designSystem.radius.control,
  "--radius-surface": designSystem.radius.surface,
  "--radius-overlay": designSystem.radius.dialog,
  "--shadow-surface": designSystem.shadow.surface,
  "--control-height": designSystem.controls.height,
  "--touch-target": designSystem.controls.touchTarget,
  "--font-weight-normal": String(designSystem.type.weights.normal),
  "--font-weight-medium": String(designSystem.type.weights.medium),
  "--font-weight-semibold": String(designSystem.type.weights.semibold),
  "--font-weight-bold": String(designSystem.type.weights.bold),
  ...Object.fromEntries(
    designSystem.spacing.map((value, index) => [
      `--space-${index + 1}`,
      `${value}px`,
    ]),
  ),
} as CSSProperties;

export const metadata: Metadata = {
  title: "Student ERP",
  description: "Student and user management frontend",

  icons: {
    icon: [
      {
        url: "/favicon/favicon.ico",
        type: "image/x-icon",
      },
      {
        url: "/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/favicon/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: ["/favicon/favicon.ico"],
  },

  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
      style={designTokensStyle}
    >
      <body className="min-h-dvh bg-gray-50 text-gray-900">
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('solvane-theme')||'system';var d=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;var c=${JSON.stringify(designSystem.themes)};document.documentElement.dataset.themeMode=t;document.documentElement.dataset.theme=d;Object.entries(c[d]).forEach(function(e){document.documentElement.style.setProperty('--'+e[0],e[1])});var ch=${JSON.stringify(designSystem.charts)}[d];ch.series.forEach(function(v,i){document.documentElement.style.setProperty('--chart-'+(i+1),v)});Object.entries(ch.statuses).forEach(function(e){document.documentElement.style.setProperty('--chart-status-'+e[0],e[1])})}catch(e){}`}
        </Script>

        <ThemeProvider>
          <SessionGuard />

          <div className="group/shell min-h-dvh">
            <Sidebar />

            <main
              className="
                min-h-dvh w-full min-w-0
                group-has-[#app-sidebar]/shell:pt-16
                lg:group-has-[#app-sidebar]/shell:pt-0
              "
            >
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
