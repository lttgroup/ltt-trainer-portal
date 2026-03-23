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

// ── Section Card with optional rejection note banner ──────────────────────────
function SectionCard({ number, title, status, sub, actionLabel, onAction, locked, rejectionNote, reviewedBy }) {
  const styles = {
    complete:   { bg: "#f0fdf4", border: "#86efac", iconBg: "#16a34a", icon: "✓", iconColor: "#fff", titleColor: "#166534" },
    approved:   { bg: "#f0fdf4", border: "#86efac", iconBg: "#16a34a", icon: "✓", iconColor: "#fff", titleColor: "#166534" },
    pending:    { bg: "#fffdf5", border: "#f5d78a", iconBg: "#e8a020", icon: "⏳", iconColor: "#fff", titleColor: "#92500a" },
    rejected:   { bg: "#fef2f2", border: "#fca5a5", iconBg: "#c93535", icon: "✗", iconColor: "#fff", titleColor: "#c93535" },
    updated:    { bg: "#faf5ff", border: "#c4b5fd", iconBg: "#7c3aed", icon: "↺", iconColor: "#fff", titleColor: "#6d28d9" },
    incomplete: { bg: "#f9fafb", border: "#e5e7eb", iconBg: "#e5e7eb", icon: number, iconColor: "#6b7280", titleColor: "#374151" },
  };
  const s = styles[status] || styles.incomplete;
  const isRejected = status === "rejected";

  return (
    <div className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: s.border, backgroundColor: s.bg, opacity: locked ? 0.5 : 1 }}>
      <div className="p-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>{s.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: s.titleColor }}>{title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
        </div>
        {actionLabel && !locked && (
          <button onClick={onAction} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors" style={{ backgroundColor: isRejected ? "#c93535" : "#1c5ea8" }}>
            {actionLabel}
          </button>
        )}
        {locked && <span className="flex-shrink-0 text-xs text-gray-400">🔒 Locked</span>}
      </div>

      {/* Rejection note — shown prominently when admin has flagged a section */}
      {isRejected && rejectionNote && (
        <div className="mx-4 mb-4 rounded-lg p-3 border" style={{ backgroundColor: "#fff5f5", borderColor: "#fca5a5" }}>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "#c93535" }}>
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#c93535" }}>
                Action required{reviewedBy ? ` — feedback from ${reviewedBy}` : ""}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">"{rejectionNote}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection note missing — generic guidance */}
      {isRejected && !rejectionNote && (
        <div className="mx-4 mb-4 rounded-lg p-3 border" style={{ backgroundColor: "#fff5f5", borderColor: "#fca5a5" }}>
          <p className="text-xs font-semibold" style={{ color: "#c93535" }}>
            This section requires attention. Please review and update, then contact your compliance officer.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Trainer Progress Dashboard ─────────────────────────────────────────────────
function TrainerProgressDashboard({ trainerData, trainerProfile, questResponses, expData, assignedUnits, navigate }) {
  if (!trainerData)
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400">No trainer record found. Contact your compliance officer.</p>
      </div>
    );

  const compliance = trainerData.compliance_status || "Incomplete";
  const profileStatus = trainerProfile?.profile_status || "Draft";
  const reviewNotes = trainerProfile?.review_notes || "";
  const reviewedBy = trainerProfile?.reviewed_by || "";

  // ── Per-section approval from the new individual fields ──────────────────────
  const s1Approved = trainerProfile?.s1_approved;        // true | false | null
  const s4Approved = trainerProfile?.s4_approved;        // true | false | null
  const credApproved = profileStatus === "Approved";     // Section 2 — credential
  const credRejected = profileStatus === "Rejected";
  const industryQualsApproved = trainerProfile?.industry_quals_approved;

  // Completion checks
  const s1Done = !!(trainerData.full_name && trainerData.state && trainerData.position && trainerData.employment_status);
  const s2Done = !!(trainerProfile?.tae_qualification || trainerProfile?.under_direction_qualification);
  const s4Done = !!(trainerProfile?.declaration_credentials && trainerProfile?.declaration_signature);

  // ── Section 1 status ──────────────────────────────────────────────────────────
  const s1Status =
    s1Approved === true  ? "approved"
    : s1Approved === false ? "rejected"
    : profileStatus === "Submitted" ? "pending"
    : s1Done ? "complete"
    : "incomplete";

  // ── Section 2 status ──────────────────────────────────────────────────────────
  const s2Status =
    credApproved ? "approved"
    : credRejected ? "rejected"
    : profileStatus === "Submitted" ? "pending"
    : s2Done ? "complete"
    : "incomplete";

  // ── Section 3 status ──────────────────────────────────────────────────────────
  const s3Status =
    industryQualsApproved === true  ? "approved"
    : industryQualsApproved === false ? "rejected"
    : profileStatus === "Submitted" ? "pending"
    : "incomplete";

  // ── Section 4 status ──────────────────────────────────────────────────────────
  const s4Status =
    s4Approved === true  ? "approved"
    : s4Approved === false ? "rejected"
    : profileStatus === "Submitted" ? "pending"
    : s4Done ? "complete"
    : "incomplete";

  // ── Section 6 status ──────────────────────────────────────────────────────────
  const assignedCount = assignedUnits.length;
  const approvedCount = expData.filter((e) => e.competency_confirmed === true).length;
  const notApprovedCount = expData.filter((e) => e.competency_confirmed === false).length;
  const updatedCount = expData.filter(
    (e) => e.competency_confirmed === null && Object.values(e.element_descriptions || {}).some((v) => v?.trim())
  ).length;
  const s6Locked = assignedCount === 0;
  const s6AllApproved = assignedCount > 0 && approvedCount === assignedCount;
  const s6Status =
    s6AllApproved ? "approved"
    : notApprovedCount > 0 && updatedCount > 0 ? "updated"
    : notApprovedCount > 0 ? "rejected"
    : compliance === "Pending" && approvedCount === 0 ? "pending"
    : approvedCount > 0 ? "pending"
    : "incomplete";

  // Any section rejected?
  const anyRejected = [s1Status, s2Status, s3Status, s4Status].includes("rejected");

  // ── Section 5 status ──────────────────────────────────────────────────────────
  const answeredCount = questResponses.length;
  const questDone = answeredCount === 150;
  const questStatus = questDone ? "complete" : "incomplete";

  // Global "Under Review" alert banner — shown whenever admin has set Under Review,
  // regardless of whether individual section rejections have been set yet
  const showUnderReviewBanner = compliance === "Under Review";

  const sections = [
    {
      number: "1",
      title: "Section 1 — Personal Details",
      status: s1Status,
      sub:
        s1Status === "approved" ? "Personal details verified"
        : s1Status === "rejected" ? "Your personal details require attention — please update your profile"
        : s1Status === "pending" ? "Submitted — awaiting review"
        : s1Done ? "Complete — awaiting submission"
        : "Complete your personal details in your profile",
      actionLabel: s1Status === "incomplete" || s1Status === "complete" || s1Status === "rejected" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
      // Section 1 rejection note comes from review_notes (shared with profile review)
      rejectionNote: s1Status === "rejected" ? reviewNotes : null,
      reviewedBy: s1Status === "rejected" ? reviewedBy : null,
    },
    {
      number: "2",
      title: "Section 2 — Training Credentials",
      status: s2Status,
      sub:
        s2Status === "approved" ? "TAE credentials verified by quality team"
        : s2Status === "rejected" ? "Your credentials were not approved — action required"
        : s2Status === "pending" ? "Submitted — awaiting quality review"
        : s2Done ? "Complete — awaiting quality review"
        : "Enter your TAE qualification or enrolment details",
      actionLabel: s2Status === "incomplete" || s2Status === "complete" || s2Status === "rejected" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
      rejectionNote: s2Status === "rejected" ? reviewNotes : null,
      reviewedBy: s2Status === "rejected" ? reviewedBy : null,
    },
    {
      number: "3",
      title: "Section 3 — Industry Competencies",
      status: s3Status,
      sub:
        s3Status === "approved" ? "Industry qualifications verified"
        : s3Status === "rejected" ? "Your industry qualifications were not approved — action required"
        : s3Status === "pending" ? "Submitted — awaiting review"
        : "List your industry qualifications and upload certificates",
      actionLabel: s3Status !== "pending" && s3Status !== "approved" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
      rejectionNote: s3Status === "rejected" ? reviewNotes : null,
      reviewedBy: s3Status === "rejected" ? reviewedBy : null,
    },
    {
      number: "4",
      title: "Section 4 — Credentials Declaration",
      status: s4Status,
      sub:
        s4Status === "approved" ? "Declaration confirmed and verified"
        : s4Status === "rejected" ? "Your declaration requires attention — please review"
        : s4Status === "pending" ? "Submitted — awaiting review"
        : s4Done ? "Complete — awaiting submission"
        : "Complete and sign your credentials declaration",
      actionLabel: s4Status === "incomplete" || s4Status === "complete" || s4Status === "rejected" ? "Go to Profile" : null,
      onAction: () => navigate("/profile"),
      rejectionNote: s4Status === "rejected" ? reviewNotes : null,
      reviewedBy: s4Status === "rejected" ? reviewedBy : null,
    },
    {
      number: "5",
      title: "Section 5 — Skills Questionnaire",
      status: questStatus,
      sub: questDone ? `All 150 units answered` : answeredCount > 0 ? `${answeredCount} of 150 units answered` : "Answer Yes/No/Hold for all 150 units of competency",
      actionLabel: !questDone ? (answeredCount > 0 ? "Continue" : "Start") : null,
      onAction: () => navigate("/questionnaire"),
    },
    {
      number: "6",
      title: "Section 6 — Industry Experience",
      status: s6Locked ? "incomplete" : s6Status,
      locked: s6Locked,
      sub: s6Locked
        ? "Awaiting unit assignment from your compliance officer"
        : s6AllApproved ? `All ${assignedCount} units quality approved`
        : notApprovedCount > 0 && updatedCount > 0 ? `${notApprovedCount} unit${notApprovedCount !== 1 ? "s" : ""} not approved — updated evidence submitted, awaiting re-review`
        : notApprovedCount > 0 ? `${notApprovedCount} unit${notApprovedCount !== 1 ? "s" : ""} not approved — review feedback and update your evidence`
        : compliance === "Pending" ? `Submitted — ${approvedCount} of ${assignedCount} units approved`
        : `${approvedCount} of ${assignedCount} units approved`,
      actionLabel: !s6Locked && !s6AllApproved
        ? (compliance === "Pending" && notApprovedCount === 0 ? null : "Go to Experience")
        : null,
      onAction: () => navigate("/experience"),
    },
  ];

  const approvedSections = sections.filter((s) => s.status === "approved").length;

  return (
    <div className="mb-6">
      {/* Under review alert banner */}
      {showUnderReviewBanner && (
        <div className="rounded-xl p-4 mb-4 border" style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#c93535" }}>
              <span className="text-white font-bold text-sm">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: "#c93535" }}>
                Your profile is under review — action required
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your compliance officer has reviewed your profile and found sections that need attention.
                Review the feedback below, update the relevant sections, and resubmit.
              </p>
              {reviewNotes && (
                <div className="mt-2 p-2.5 rounded-lg" style={{ backgroundColor: "#fff5f5", border: "1px solid #fca5a5" }}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Notes from compliance officer{reviewedBy ? ` (${reviewedBy})` : ""}:</p>
                  <p className="text-sm text-gray-700 italic">"{reviewNotes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Your Onboarding Progress</h3>
        <span className="text-xs text-gray-400">{approvedSections} of {sections.length} sections approved</span>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <SectionCard key={s.number} {...s} />
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
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
      {/* Welcome banner */}
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
                  style={{
                    backgroundColor:
                      trainerData.compliance_status === "Compliant" ? "#32ba9a"
                      : trainerData.compliance_status === "Pending" ? "#e8a020"
                      : trainerData.compliance_status === "Under Review" ? "#fdeaea"
                      : "rgba(255,255,255,0.15)",
                    color: trainerData.compliance_status === "Compliant" ? "#081a47"
                      : trainerData.compliance_status === "Under Review" ? "#c93535"
                      : "#fff",
                  }}>
                  {trainerData.compliance_status === "Compliant" ? "✓ Profile Compliant"
                    : trainerData.compliance_status === "Pending" ? "⏳ Awaiting Quality Review"
                    : trainerData.compliance_status === "Under Review" ? "⚠ Profile Under Review — Action Required"
                    : "⚠ Profile Incomplete"}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="absolute right-[-40px] top-[-60px] w-48 h-48 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
        <div className="absolute right-[60px] bottom-[-80px] w-40 h-40 rounded-full" style={{ backgroundColor: "rgba(101,246,204,0.08)" }} />
      </div>

      {/* Stats — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Trainers" value={stats.total} sub="On register" color="#081a47" />
          <StatCard label="Fully Compliant" value={stats.compliant} sub="Profiles verified" color="#32ba9a" />
          <StatCard label="Pending Review" value={stats.pending} sub="Awaiting verification" color="#e8a020" />
          <StatCard label="Action Required" value={stats.incomplete} sub="Incomplete profiles" color="#c93535" />
        </div>
      )}

      {/* Trainer progress — trainer only */}
      {!isAdmin && !loading && (
        <TrainerProgressDashboard
          trainerData={trainerData}
          trainerProfile={trainerProfile}
          questResponses={questResponses}
          expData={expData}
          assignedUnits={assignedUnits}
          navigate={navigate}
        />
      )}

      {/* Pending review panel — admin only */}
      {isAdmin && !loading && (
        <PendingReviewPanel pendingTrainers={pendingTrainers} notifications={notifications} onMarkRead={markNotificationRead} onNavigate={navigate} />
      )}

      {/* Two columns — admin only */}
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
                ) : trainers.slice(0, 5).map((trainer) => (
                  <TrainerRow key={trainer.id} trainer={trainer} onClick={() => navigate(`/trainers/${trainer.id}`)} />
                ))}
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