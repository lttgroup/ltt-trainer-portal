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

function ActivityItem({ dot, text, time }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: dot }} />
      <div>
        <p className="text-xs text-gray-600">{text}</p>
        <p className="text-xs text-gray-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ profile }) {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    compliant: 0,
    pending: 0,
    incomplete: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data, error } = await supabase.from("trainers").select("*").order("created_at", { ascending: false });

    if (!error && data) {
      setTrainers(data);
      setStats({
        total: data.length,
        compliant: data.filter((t) => t.compliance_status === "Compliant").length,
        pending: data.filter((t) => t.compliance_status === "Pending").length,
        incomplete: data.filter((t) => !t.compliance_status || t.compliance_status === "Incomplete").length,
      });
    }
    setLoading(false);
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
            <button onClick={() => navigate("/trainers/invite")} className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ backgroundColor: "#32ba9a", color: "#081a47" }}>
              + Invite Trainer
            </button>
            <button
              onClick={() => navigate("/trainers")}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors border"
              style={{
                borderColor: "rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.75)",
                backgroundColor: "transparent",
              }}
            >
              View all trainers
            </button>
          </div>
        </div>
        {/* Decorative circles */}
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

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-5">
        {/* Trainer status */}
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
                <button onClick={() => navigate("/trainers/invite")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
                  Invite your first trainer
                </button>
              </div>
            ) : (
              trainers.slice(0, 5).map((trainer) => <TrainerRow key={trainer.id} trainer={trainer} onClick={() => navigate(`/trainers/${trainer.id}`)} />)
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
          </div>
          <div className="px-5 py-2">
            {trainers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Activity will appear here as trainers are onboarded</p>
            ) : (
              trainers.slice(0, 5).map((trainer) => (
                <ActivityItem
                  key={trainer.id}
                  dot="#32ba9a"
                  text={`${trainer.full_name} — profile ${trainer.compliance_status?.toLowerCase() || "created"}`}
                  time={new Date(trainer.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
