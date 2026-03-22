import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      <p className="text-3xl font-semibold leading-none" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

function TrainerRow({ trainer, onClick }) {
  const statusStyles = {
    Compliant: { bg: "#e6f9f4", color: "#0f7a5a" },
    Pending: { bg: "#fdf3e0", color: "#b8711a" },
    Incomplete: { bg: "#fdeaea", color: "#c93535" },
    "Under Review": { bg: "#e6f0ff", color: "#1c5ea8" },
  };
  const style = statusStyles[trainer.compliance_status] || statusStyles["Incomplete"];
  const initials = trainer.full_name
    ? trainer.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors" onClick={onClick}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{trainer.full_name}</p>
        <p className="text-xs text-gray-400 truncate">
          {trainer.position} · {trainer.employment_status}
        </p>
      </div>
      <span className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: style.bg, color: style.color }}>
        {trainer.compliance_status || "Incomplete"}
      </span>
    </div>
  );
}

// ── Pending Review Panel (admin only) ─────────────────────────────────────────
function PendingReviewPanel({ pendingTrainers, notifications, onMarkRead, onNavigate }) {
  if (pendingTrainers.length === 0 && notifications.length === 0) return null;

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="rounded-xl mb-6 overflow-hidden" style={{ border: "1px solid #f5d78a", backgroundColor: "#fffdf5" }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "#fdf3e0", borderBottom: "1px solid #f5d78a" }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          <h3 className="text-sm font-semibold" style={{ color: "#92500a" }}>
            Pending Quality Review
          </h3>
          {unread.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e8a020", color: "#fff" }}>
              {unread.length} new
            </span>
          )}
        </div>
        <button onClick={() => onNavigate("/trainers")} className="text-xs font-semibold" style={{ color: "#92500a" }}>
          View all trainers →
        </button>
      </div>

      <div className="divide-y" style={{ borderColor: "#f5e7b0" }}>
        {pendingTrainers.map((trainer) => {
          const notif = notifications.find((n) => n.trainer_id === trainer.id && !n.read);
          return (
            <div
              key={trainer.id}
              className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-amber-50 transition-colors"
              onClick={() => {
                if (notif) onMarkRead(notif.id);
                onNavigate(`/trainers/${trainer.id}`);
              }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#fde68a", color: "#92500a" }}>
                {trainer.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{trainer.full_name}</p>
                <p className="text-xs text-gray-500">{notif ? notif.message : "Industry experience submitted — awaiting quality review"}</p>
                {notif && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(notif.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notif && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#e8a020" }} />}
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "#16406f" }}>
                  Review →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ profile }) {
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin" || profile?.role === "compliance_officer";

  const [trainers, setTrainers] = useState([]);
  const [pendingTrainers, setPendingTrainers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, compliant: 0, pending: 0, incomplete: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from("trainers").select("*").order("full_name", { ascending: true });

    if (!error && data) {
      setTrainers(data);
      const pending = data.filter((t) => t.compliance_status === "Pending");
      setPendingTrainers(pending);
      setStats({
        total: data.length,
        compliant: data.filter((t) => t.compliance_status === "Compliant").length,
        pending: pending.length,
        incomplete: data.filter((t) => !t.compliance_status || t.compliance_status === "Incomplete").length,
      });
    }

    // Load notifications for admins
    if (isAdmin) {
      const { data: notifData } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      setNotifications(notifData || []);
    }

    setLoading(false);
  };

  const markNotificationRead = async (notifId) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notifId);
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
  };

  return (
    <div>
      {/* Welcome banner */}
      <div className="rounded-xl p-7 mb-6 relative overflow-hidden" style={{ backgroundColor: "#081a47" }}>
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back, {profile?.full_name?.split(" ")[0] || "there"} 👋</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Trainer Competency Portal — Standards for RTOs 2025
          </p>
          <div className="flex gap-3 mt-5">
            {isAdmin ? (
              <>
                <button onClick={() => navigate("/trainers/invite")} className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ backgroundColor: "#32ba9a", color: "#081a47" }}>
                  + Invite Trainer
                </button>
                <button
                  onClick={() => navigate("/trainers")}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors border"
                  style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.75)", backgroundColor: "transparent" }}
                >
                  View all trainers
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/questionnaire")} className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ backgroundColor: "#32ba9a", color: "#081a47" }}>
                  Skills Questionnaire
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors border"
                  style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.75)", backgroundColor: "transparent" }}
                >
                  Trainer Profile
                </button>
              </>
            )}
          </div>
        </div>
        <div className="absolute right-[-40px] top-[-60px] w-48 h-48 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
        <div className="absolute right-[60px] bottom-[-80px] w-40 h-40 rounded-full" style={{ backgroundColor: "rgba(101,246,204,0.08)" }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Trainers" value={stats.total} sub="On register" color="#081a47" />
        <StatCard label="Fully Compliant" value={stats.compliant} sub="Profiles verified" color="#32ba9a" />
        <StatCard label="Pending Review" value={stats.pending} sub="Awaiting verification" color="#e8a020" />
        <StatCard label="Action Required" value={stats.incomplete} sub="Incomplete profiles" color="#c93535" />
      </div>

      {/* Pending review panel — admin only */}
      {isAdmin && !loading && <PendingReviewPanel pendingTrainers={pendingTrainers} notifications={notifications} onMarkRead={markNotificationRead} onNavigate={navigate} />}

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Trainer Status</h3>
            <button onClick={() => navigate("/trainers")} className="text-xs font-medium" style={{ color: "#1c5ea8" }}>
              View all →
            </button>
          </div>
          <div className="px-3 py-2">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : trainers.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400 mb-3">No trainers yet</p>
                {isAdmin && (
                  <button onClick={() => navigate("/trainers/invite")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
                    Invite your first trainer
                  </button>
                )}
              </div>
            ) : (
              trainers.slice(0, 5).map((trainer) => <TrainerRow key={trainer.id} trainer={trainer} onClick={() => navigate(`/trainers/${trainer.id}`)} />)
            )}
          </div>
        </div>

        {/* Recent notifications / activity */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">{isAdmin ? "Recent Notifications" : "Recent Activity"}</h3>
          </div>
          <div className="px-5 py-2">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : isAdmin && notifications.length > 0 ? (
              notifications.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded transition-colors"
                  onClick={() => {
                    markNotificationRead(n.id);
                    navigate(`/trainers/${n.trainer_id}`);
                  }}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: n.read ? "#d1d5db" : n.type === "experience_updated" ? "#7c3aed" : "#e8a020" }} />
                  <div>
                    <p className="text-xs text-gray-700 font-medium">{n.trainer_name}</p>
                    <p className="text-xs text-gray-500">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              trainers.slice(0, 5).map((trainer) => (
                <div key={trainer.id} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: "#32ba9a" }} />
                  <div>
                    <p className="text-xs text-gray-600">
                      {trainer.full_name} — profile {trainer.compliance_status?.toLowerCase() || "created"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(trainer.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
              ))
            )}
            {isAdmin && notifications.length === 0 && !loading && <p className="text-sm text-gray-400 text-center py-10">Notifications will appear here when trainers submit</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
