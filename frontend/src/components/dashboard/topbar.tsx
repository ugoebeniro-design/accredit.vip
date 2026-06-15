"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";

export function DashboardTopbar({
  title,
  subtitle,
  onMenuClick,
  actions,
}: {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <header className="h-16 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Menu className="w-5 h-5 text-[#0D1B2A]" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2A]">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {actions || (
        <Link href="/dashboard/create" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          New Event
        </Link>
      )}
    </header>
  );
}
