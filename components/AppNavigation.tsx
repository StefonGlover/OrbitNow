"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrbitPreferences } from "@/components/providers/OrbitPreferencesProvider";

const navigationItems = [
  { href: "/", label: "Dashboard" },
  { href: "/my-orbit", label: "My Orbit" },
];

export function AppNavigation() {
  const pathname = usePathname();
  const { preferences, sessionUser, syncStatus, unreadAlertCount } = useOrbitPreferences();
  const syncLabel =
    syncStatus === "synced"
      ? "Synced"
      : syncStatus === "syncing"
        ? "Syncing"
        : syncStatus === "error"
          ? "Sync issue"
          : "Local-first";

  return (
    <header className="ui-nav-frame sticky top-0 z-40 border-b border-white/10 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link className="flex items-center gap-3" href="/">
            <div className="ui-orbit-mark">
              <span className="ui-live-dot h-2.5 w-2.5" />
            </div>
            <div>
              <p className="ui-kicker">OrbitNow</p>
              <p className="text-sm text-slate-300">Mission control dashboard</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  className={`ui-nav-link ${isActive ? "ui-nav-link-active" : ""}`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {preferences.homeLocation ? (
            <span className="ui-chip">
              Home base: {preferences.homeLocation.label}
            </span>
          ) : null}
          <span className={`ui-chip ${syncStatus === "synced" ? "ui-chip-live" : ""}`}>
            {sessionUser ? `${syncLabel}: ${sessionUser.email}` : syncLabel}
          </span>
          {unreadAlertCount > 0 ? (
            <Link className="ui-chip ui-chip-live" href="/my-orbit">
              {unreadAlertCount} live alert{unreadAlertCount === 1 ? "" : "s"}
            </Link>
          ) : null}
          <span className="ui-chip">
            {preferences.favoriteObjects.length} saved favorite
            {preferences.favoriteObjects.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </header>
  );
}
