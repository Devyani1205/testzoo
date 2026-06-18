"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Package, CreditCard, MapPin, LogOut } from "lucide-react";

const navItems = [
  { href: "/patient/orders", icon: Package, label: "My Orders" },
  { href: "/patient/payment-history", icon: CreditCard, label: "Payments" },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ full_name?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("tz_token");
    const userData = localStorage.getItem("tz_user");
    if (!token) { router.push("/auth/login"); return; }
    const u = userData ? JSON.parse(userData) : null;
    if (u && u.user_type !== "patient") { router.push("/doctor/chat"); return; }
    setUser(u);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("tz_token");
    localStorage.removeItem("tz_user");
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <FlaskConical className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-bold text-slate-800">TestZoo</span>
            {user && (
              <span className="hidden sm:block text-sm text-slate-500">
                · {user.full_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  pathname === href
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
