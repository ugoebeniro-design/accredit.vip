"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Menu, X, LayoutGrid, Calendar, Plus, Wallet as WalletIcon, Compass, LogOut, Lock } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiClient } from "@/lib/api-client";

export default function ChangePasswordPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  if (loading || !user) return null;

  const togglePassword = (field: keyof typeof visiblePasswords) => {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  };

  const PasswordInput = ({
    id,
    label,
    value,
    onChange,
    visible,
    onToggle,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    visible: boolean;
    onToggle: () => void;
  }) => (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[#0D1B2A]">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-11 w-full rounded-lg border border-[#e8edf2] bg-white px-3 py-2 pr-11 text-sm"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 transition-colors hover:text-[#E91E8C]"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient("/auth/change-password", {
        method: "POST",
        body: { current_password: currentPassword, new_password: newPassword },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "#f8f9fc" }}>
        <div className="w-full max-w-sm text-center space-y-4 bg-white rounded-xl p-8 border border-[#e8edf2]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-[#10b981]" />
          <h1 className="text-2xl font-semibold text-[#0D1B2A]">Password Changed</h1>
          <p className="text-sm text-[#64748b]">Your password has been updated successfully.</p>
          <Link href="/dashboard" className="inline-block w-full">
            <button className="w-full h-10 bg-[#E91E8C] text-white font-bold rounded-lg hover:bg-[#C4166F] transition-colors">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8f9fc]">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h2 className="text-lg font-bold text-[#0D1B2A] mb-2">Sign Out?</h2>
            <p className="text-[#64748b] mb-6">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e8edf2] text-[#0D1B2A] font-semibold hover:bg-[#f8f9fc] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex-col flex-shrink-0 transition-all duration-300 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
        style={{
          background: "#0D1B2A",
          width: sidebarOpen ? "256px" : "80px",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center flex-1 min-w-0">
            <Image src="/logo-white.png" alt="accredit.vip" width={180} height={180} className="h-8 w-auto object-contain" />
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 hidden lg:block"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {sidebarOpen && <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">
            Main Menu
          </p>}
          {[
            { href: "/dashboard", label: "Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
            { href: "/dashboard/events", label: "Events", icon: <Calendar className="w-4 h-4" /> },
            { href: "/dashboard/create", label: "Create Event", icon: <Plus className="w-4 h-4" /> },
            { href: "/dashboard/wallet", label: "Wallet", icon: <WalletIcon className="w-4 h-4" /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.6)",
              }}
              title={!sidebarOpen ? item.label : ""}
            >
              <span className="text-white/40">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}

          {/* Discover Section */}
          {sidebarOpen && (
            <div className="pt-4 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="px-3 text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Discover</p>
              <Link
                href="/attend"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/08 transition-all"
              >
                <Compass className="w-4 h-4" />
                Browse Events
              </Link>
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 flex-shrink-0 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #E91E8C, #C4166F)" }}>
              {user.full_name?.charAt(0) || "U"}
            </div>
            {sidebarOpen && (
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
                <p className="text-white/40 text-xs truncate">{user.email}</p>
              </div>
            )}
          </div>

          {/* Change Password & Logout */}
          {sidebarOpen && (
            <>
              <Link
                href="/change-password"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#E91E8C] bg-[#E91E8C]/10 transition-all"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </Link>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-red-500 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 font-bold text-sm transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "white", borderBottom: "1px solid #e8edf2" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu className="w-5 h-5 text-[#0D1B2A]" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#0D1B2A]">Change Password</h1>
              <p className="text-xs text-gray-400">Update your account password</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 flex items-start justify-center">
          <div className="w-full max-w-md bg-white rounded-xl border border-[#e8edf2] p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}
              <PasswordInput id="current-password" label="Current Password" value={currentPassword} onChange={setCurrentPassword} visible={visiblePasswords.current} onToggle={() => togglePassword("current")} />
              <PasswordInput id="new-password" label="New Password" value={newPassword} onChange={setNewPassword} visible={visiblePasswords.next} onToggle={() => togglePassword("next")} />
              <PasswordInput id="confirm-password" label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} visible={visiblePasswords.confirm} onToggle={() => togglePassword("confirm")} />
              <button
                type="submit"
                disabled={submitting}
                className="h-11 w-full bg-[#E91E8C] text-white font-bold rounded-lg hover:bg-[#C4166F] transition-colors disabled:opacity-50"
              >
                {submitting ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
