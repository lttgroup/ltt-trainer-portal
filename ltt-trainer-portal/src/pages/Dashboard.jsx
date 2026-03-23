import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
      <p className="text-3xl font-semibold leading-none" style={{ color }}>{value}</p>
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
  const initials = trainer.full_name ? trainer.full_name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 transition-colors" onClick={onClick}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{trainer.full_name}</p>
        <p className="text-xs text-gray-400 truncate">{trainer.position} · {trainer.employment_status}</p>
      </div>
      <span className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: style.bg, color: style.color }}>{trainer.compliance_status || "Incomplete"}</span>
    </div>
  );
}

function PendingReviewPanel({ pendingTrainers, notifications, onMarkRead, onNavigate }) {
  if (pendingTrainers.length === 0 && notifications.length === 0) return null;
  const unread = notifications.filter((n) => !n.read);
  return (
    <div className="rounded-xl mb-6 overflow-hidden" style={{ border: "1px solid #f5d78a", backgroundColor: "#fffdf5" }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: "#fdf3e0", borderBottom: "1px solid #f5d78a" }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          <h3 className="text-sm font-semibold" style={{ color: "#92500a" }}>Pending Quality Review</h3>
          {unread.length > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e8a020", color: "#fff" }}>{unread.length} new</span>}
        </div>
        <button onClick={() => onNavigate("/trainers")} className="text-xs font-semibold" style={{ color: "#92500a" }}>View all trainers →</button>
      </div>
      <div className="divide-y" style={{ borderColor: "#f5e7b0" }}>
        {pendingTrainers.map((trainer) => {
          const notif = notifications.find((n) => n.trainer_id === trainer.id && !n.read);
          return (
            <div key={trainer.id} className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-amber-50 transition-colors"
              onClick={() => { if (notif) onMarkRead(notif.id); onNavigate(`/trainers/${trainer.id}`); }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#fde68a", color: "#92500a" }}>
                {trainer.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{trainer.full_name}</p>
                <p className="text-xs text-gray-500">{notif ? notif.message : "Industry experience submitted — awaiting quality review"}</p>
                {notif && <p className="text-xs text-gray-400 mt-0.5">{new Date(notif.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {notif && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#e8a020" }} />}
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "#16406f" }}>Review →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ number, title, status, sub, actionLabel, onAction, locked }) {
  const styles = {
    complete:   { bg: "#f0fdf4", border: "#86efac", iconBg: "#16a34a", icon: "✓", iconColor: "#fff", titleColor: "#166534" },
    approved:   { bg: "#f0fdf4", border: "#86efac", iconBg: "#16a34a", icon: "✓", iconColor: "#fff", titleColor: "#166534" },
    pending:    { bg: "#fffdf5", border: "#f5d78a", iconBg: "#e8a020", icon: "⏳", iconColor: "#fff", titleColor: "#92500a" },
    rejected:   { bg: "#fef2f2", border: "#fca5a5", iconBg: "#c93535", icon: "✗", iconColor: "#fff", titleColor: "#c93535" },
    updated:    { bg: "#faf5ff", border: "#c4b5fd", iconBg: "#7c3aed", icon: "⚠", iconColor: "#fff", titleColor: "#6d28d9" },
    incomplete: { bg: "#f9fafb", border: "#e5e7eb", iconBg: "#e5e7eb", icon: number, iconColor: "#6b7280", titleColor: "#374151" },
  };
  const s = styles[status] || styles.incomplete;
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-4 transition-all"
      style={{ borderColor: s.border, backgroundColor: s.bg, opacity: locked ? 0.5 : 1 }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ backgroundColor: s.iconBg, color: s.iconColor }}>{s.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: s.titleColor }}>{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      {actionLabel && !locked && (
        <button onClick={onAction} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors" style={{ backgroundColor: "#1c5ea8" }}>
          {actionLabel}
        </button>
      )}
      {locked && <span className="flex-shrink-0 text-xs text-gray-400">🔒 Locked</span>}
    </div>
  );
}

// ── Collapsible Trainer Progress Dashboard ─────────────────────────────────────
function TrainerProgressDashboard({ trainerData, trainerProfile, questResponses, expData, assignedUnits, navigate }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!trainerData)
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center mb-6">
        <p className="text-sm text-gray-400">No trainer record found. Contact your compliance officer.</p>
      </div>
    );

  const compliance = trainerData.compliance_status || "Incomplete";
  const profileStatus = trainerProfile?.profile_status || "Draft";
  const industryQualsApproved = trainerProfile?.industry_quals_approved;
  const profileApproved = profileStatus === "Approved";
  const profileRejected = profileStatus === "Rejected";
  const profilePending = profileStatus === "Submitted" || profileStatus === "Under Review";

  const s1Done = !!(trainerData.full_name && trainerData.state && trainerData.position && trainerData.employment_status && trainerData.phone);
const s1Status =
  trainerProfile?.s1_approved === true ? "approved"
  : trainerProfile?.s1_approved === false ? "rejected"
  : profilePending ? "pending"
  : s1Done ? "complete"
  : "incomplete";
  const s2Done = !!(trainerProfile?.tae_qualification || trainerProfile?.under_direction_qualification);
const s2Status =
  profileApproved ? "approved"
  : profileRejected ? "rejected"
  : profilePending ? "pending"
  : s2Done ? "complete"
  : "incomplete";

  const s3Status = industryQualsApproved === true ? "approved" : industryQualsApproved === false ? "rejected" : profilePending ? "pending" : "incomplete";

  const s4Done = !!(trainerProfile?.declaration_credentials && trainerProfile?.declaration_copies && trainerProfile?.declaration_signature && trainerProfile?.declaration_date);
const s4Status =
  trainerProfile?.s4_approved === true ? "approved"
  : trainerProfile?.s4_approved === false ? "rejected"
  : profilePending ? "pending"
  : s4Done ? "complete"
  : "incomplete";
  const answeredCount = questResponses.length;
  const totalUnits = 150;
  const questDone = answeredCount === totalUnits;
  const questStatus = questDone ? "complete" : "incomplete";

  const assignedCount = assignedUnits.length;
  const approvedCount = expData.filter((e) => e.competency_confirmed === true).length;
  const notApprovedCount = expData.filter((e) => e.competency_confirmed === false).length;
  const updatedCount = expData.filter((e) => e.competency_confirmed === null && Object.values(e.element_descriptions || {}).some((v) => v?.trim())).length;
  const s6Locked = assignedCount === 0;
  const s6AllApproved = assignedCount > 0 && approvedCount === assignedCount;
  const s6Status =
    s6AllApproved ? "approved"
    : notApprovedCount > 0 && updatedCount > 0 ? "updated"
    : notApprovedCount > 0 ? "rejected"
    : compliance === "Pending" && approvedCount === 0 ? "pending"
    : approvedCount > 0 ? "pending"
    : "incomplete";

  // Action buttons — show for all non-approved, non-locked statuses including pending
  const sections = [
    {
      number: "1", title: "Section 1 — Trainer Details", status: s1Status,
      sub: s1Status === "approved" ? "Details verified" : s1Status === "rejected" ? "Details need attention — check your profile" : s1Status === "pending" ? "Awaiting quality review" : s1Done ? "Complete — ready to submit" : "Complete your personal and employment details",
      actionLabel: s1Status !== "approved" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
    },
    {
      number: "2", title: "Section 2 — Training Credentials", status: s2Status,
      sub: s2Status === "approved" ? "TAE credentials verified" : s2Status === "rejected" ? "Credentials not approved — check your profile" : s2Status === "pending" ? "Awaiting quality review" : s2Done ? "Complete — ready to submit" : "Enter your TAE qualification and upload evidence",
      actionLabel: s2Status !== "approved" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
    },
    {
      number: "3", title: "Section 3 — Industry Competencies", status: s3Status,
      sub: s3Status === "approved" ? "Industry qualifications verified" : s3Status === "rejected" ? "Not approved — upload updated evidence" : s3Status === "pending" ? "Awaiting quality review" : "List your industry qualifications and upload certificates",
      actionLabel: s3Status !== "approved" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
    },
    {
      number: "4", title: "Section 4 — Credentials Declaration", status: s4Status,
      sub: s4Status === "approved" ? "Declaration verified" : s4Status === "rejected" ? "Declaration needs attention — check your profile" : s4Status === "pending" ? "Awaiting quality review" : s4Done ? "Complete — ready to submit" : "Complete your credentials declaration and sign",
      actionLabel: s4Status !== "approved" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
    },
    {
      number: "5", title: "Section 5 — Skills Questionnaire", status: questStatus,
      sub: questDone ? `All ${totalUnits} units answered` : answeredCount > 0 ? `${answeredCount} of ${totalUnits} units answered` : "Answer Yes/No/Hold for all 150 units of competency",
      actionLabel: !questDone ? (answeredCount > 0 ? "Continue" : "Start") : null,
      onAction: () => navigate("/questionnaire"),
    },
    {
      number: "6", title: "Section 6 — Industry Experience", status: s6Locked ? "incomplete" : s6Status, locked: s6Locked,
      sub: s6Locked ? "Awaiting unit assignment from your compliance officer"
        : s6AllApproved ? `All ${assignedCount} units quality approved`
        : notApprovedCount > 0 && updatedCount > 0 ? `${notApprovedCount} unit${notApprovedCount !== 1 ? "s" : ""} not approved — updated evidence submitted`
        : notApprovedCount > 0 ? `${notApprovedCount} unit${notApprovedCount !== 1 ? "s" : ""} not approved — review feedback and update your evidence`
        : compliance === "Pending" ? `Submitted — ${approvedCount} of ${assignedCount} units approved`
        : `${approvedCount} of ${assignedCount} units approved`,
      actionLabel: !s6Locked && !s6AllApproved ? "Go to Experience" : null,
      onAction: () => navigate("/experience"),
    },
  ];

  const approvedSections = sections.filter((s) => s.status === "approved").length;
  const actionSections = sections.filter((s) => ["rejected", "updated", "incomplete", "complete"].includes(s.status) && !s.locked).length;
  const pendingSections = sections.filter((s) => s.status === "pending").length;

  return (
    <div className="mb-6">
      {/* Styled collapsible container header */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-800">Your Onboarding Progress</h3>
            {/* Summary badges — always visible */}
            <div className="flex items-center gap-2">
              {approvedSections > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
                  ✓ {approvedSections} approved
                </span>
              )}
              {pendingSections > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdf3e0", color: "#92500a" }}>
                  ⏳ {pendingSections} awaiting review
                </span>
              )}
              {actionSections > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>
                  ⚠ {actionSections} action required
                </span>
              )}
            </div>
          </div>
          {/* Chevron arrow */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{sections.filter((s) => s.status === "approved").length} of {sections.length} sections approved</span>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className="transition-transform duration-200 flex-shrink-0"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", color: "#9ca3af" }}
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* Sections — hidden when collapsed */}
        {!collapsed && (
          <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
            {sections.map((s) => <SectionCard key={s.number} {...s} />)}
          </div>
        )}
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
  const [trainerData, setTrainerData] = useState(null);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [questResponses, setQuestResponses] = useState([]);
  const [expData, setExpData] = useState([]);
  const [assignedUnits, setAssignedUnits] = useState([]);

  useEffect(() => {
    if (profile !== null && profile !== undefined) fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (isAdmin) {
      const { data, error } = await supabase.from("trainers").select("*").order("full_name", { ascending: true });
      if (!error && data) {
        setTrainers(data);
        const pending = data.filter((t) => t.compliance_status === "Pending");
        setPendingTrainers(pending);
        setStats({ total: data.length, compliant: data.filter((t) => t.compliance_status === "Compliant").length, pending: pending.length, incomplete: data.filter((t) => !t.compliance_status || t.compliance_status === "Incomplete").length });
      }
      const { data: notifData } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      setNotifications(notifData || []);
    } else {
      const { data: tRows } = await supabase.from("trainers").select("*").eq("email", profile?.email).limit(1);
      const t = tRows?.[0] || null;
      setTrainerData(t);
      if (t) {
        const [{ data: tp }, { data: qr }, { data: exp }, { data: au }] = await Promise.all([
          supabase.from("trainer_profiles").select("*").eq("trainer_id", t.id).maybeSingle(),
          supabase.from("questionnaire_responses").select("unit_code,response").eq("trainer_id", t.id),
          supabase.from("industry_experience").select("unit_code,competency_confirmed,element_descriptions").eq("trainer_id", t.id),
          supabase.from("assigned_units").select("unit_code").eq("trainer_id", t.id),
        ]);
        setTrainerProfile(tp);
        setQuestResponses(qr || []);
        setExpData(exp || []);
        setAssignedUnits(au || []);
      }
    }
    setLoading(false);
  };

  const markNotificationRead = async (notifId) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notifId);
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
  };

  return (
    <div>
      <div className="rounded-xl p-7 mb-6 relative overflow-hidden" style={{ backgroundColor: "#081a47" }}>
        <div className="relative z-10">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back, {profile?.full_name?.split(" ")[0] || "there"} 👋</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Trainer Competency Portal — Standards for RTOs 2025</p>
          {isAdmin ? (
            <div className="flex gap-3 mt-5">
              <button onClick={() => navigate("/trainers/invite")} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: "#32ba9a", color: "#081a47" }}>+ Invite Trainer</button>
              <button onClick={() => navigate("/trainers")} className="px-4 py-2 rounded-lg text-sm font-semibold border" style={{ borderColor: "rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.75)", backgroundColor: "transparent" }}>View all trainers</button>
            </div>
          ) : (
            <div className="mt-4">
              {trainerData && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: trainerData.compliance_status === "Compliant" ? "#32ba9a" : trainerData.compliance_status === "Pending" ? "#e8a020" : "rgba(255,255,255,0.15)", color: trainerData.compliance_status === "Compliant" ? "#081a47" : "#fff" }}>
                  {trainerData.compliance_status === "Compliant" ? "✓ Profile Compliant" : trainerData.compliance_status === "Pending" ? "⏳ Awaiting Quality Review" : trainerData.compliance_status === "Under Review" ? "🔍 Under Review" : "⚠ Profile Incomplete"}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="absolute right-[-40px] top-[-60px] w-48 h-48 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
        <div className="absolute right-[60px] bottom-[-80px] w-40 h-40 rounded-full" style={{ backgroundColor: "rgba(101,246,204,0.08)" }} />
      </div>

      {isAdmin && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Trainers" value={stats.total} sub="On register" color="#081a47" />
          <StatCard label="Fully Compliant" value={stats.compliant} sub="Profiles verified" color="#32ba9a" />
          <StatCard label="Pending Review" value={stats.pending} sub="Awaiting verification" color="#e8a020" />
          <StatCard label="Action Required" value={stats.incomplete} sub="Incomplete profiles" color="#c93535" />
        </div>
      )}

      {!isAdmin && !loading && (
        <TrainerProgressDashboard trainerData={trainerData} trainerProfile={trainerProfile} questResponses={questResponses} expData={expData} assignedUnits={assignedUnits} navigate={navigate} />
      )}

      {isAdmin && !loading && <PendingReviewPanel pendingTrainers={pendingTrainers} notifications={notifications} onMarkRead={markNotificationRead} onNavigate={navigate} />}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Trainer Status</h3>
              <button onClick={() => navigate("/trainers")} className="text-xs font-medium" style={{ color: "#1c5ea8" }}>View all →</button>
            </div>
            <div className="px-3 py-2">
              {loading ? <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
                : trainers.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400 mb-3">No trainers yet</p>
                    <button onClick={() => navigate("/trainers/invite")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>Invite your first trainer</button>
                  </div>
                ) : trainers.slice(0, 5).map((trainer) => <TrainerRow key={trainer.id} trainer={trainer} onClick={() => navigate(`/trainers/${trainer.id}`)} />)}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Recent Notifications</h3>
            </div>
            <div className="px-5 py-2">
              {loading ? <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
                : notifications.length > 0 ? notifications.slice(0, 6).map((n) => (
                  <div key={n.id} className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded transition-colors"
                    onClick={() => { markNotificationRead(n.id); navigate(`/trainers/${n.trainer_id}`); }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: n.read ? "#d1d5db" : n.type === "experience_updated" ? "#7c3aed" : "#e8a020" }} />
                    <div>
                      <p className="text-xs text-gray-700 font-medium">{n.trainer_name}</p>
                      <p className="text-xs text-gray-500">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-gray-400 text-center py-10">Notifications will appear here when trainers submit</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}