import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import logo2 from "../../assets/logo2.png";

const navItems = [
  {
    section: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "▦" },
      { to: "/trainers", label: "Trainers", icon: "👤" },
    ],
  },
  {
    section: "Onboarding",
    items: [
      { to: "/profile", label: "Trainer Profile (AF3.21)", icon: "📄" },
      { to: "/questionnaire", label: "Skills Questionnaire", icon: "📋" },
      { to: "/experience", label: "Industry Experience", icon: "🔬" },
    ],
  },
  {
    section: "Compliance",
    items: [
      { to: "/register", label: "Credential Register", icon: "📑" },
      { to: "/evidence", label: "Evidence Vault", icon: "🗂️" },
    ],
  },
];

export default function Shell({ user, profile, children, title }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── SIDEBAR ── */}
      <aside className="w-60 min-w-60 flex flex-col overflow-y-auto" style={{ backgroundColor: "#081a47" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <img src={logo2} alt="Labtech Training" className="h-10 w-auto" />
          <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Trainer Competency Portal
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          {navItems.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest px-2 mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                {group.section}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${isActive ? "font-semibold" : "font-normal hover:bg-white/8"}`}
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? "#16406f" : "transparent",
                    color: isActive ? "#65f6cc" : "rgba(255,255,255,0.65)",
                  })}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/7">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#32ba9a", color: "#081a47" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{profile?.full_name || user?.email}</p>
              <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                {profile?.role || "trainer"}
              </p>
            </div>
            <button onClick={handleSignOut} disabled={signingOut} className="text-xs px-2 py-1 rounded transition-colors" style={{ color: "rgba(255,255,255,0.4)" }} title="Sign out">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-7 flex-shrink-0">
          <h1 className="text-base font-semibold text-gray-800">{title}</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/trainers/invite")} className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: "#1c5ea8" }}>
              + Invite Trainer
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-7">{children}</main>
      </div>
    </div>
  );
}
