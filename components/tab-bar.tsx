"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, Heart, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Today", icon: Home, match: (p: string) => p === "/" },
  { href: "/trends", label: "Trends", icon: TrendingUp, match: (p: string) => p.startsWith("/trends") },
  { href: "/wellness", label: "Wellness", icon: Heart, match: (p: string) => p.startsWith("/wellness") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

export function TabBar() {
  const pathname = usePathname();
  // Insert FAB between tabs 2 and 3
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 mx-auto max-w-[480px] bg-surface border-t border-border z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-2 py-2 relative">
        {left.map((t) => (
          <TabLink key={t.href} {...t} active={t.match(pathname)} />
        ))}
        <Link
          href="/log/weight"
          aria-label="Quick add"
          className="-mt-7 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <Plus size={26} strokeWidth={2.2} />
        </Link>
        {right.map((t) => (
          <TabLink key={t.href} {...t} active={t.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px]",
        active ? "text-text" : "text-text-muted"
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
      <span className="text-[11px]">{label}</span>
    </Link>
  );
}
