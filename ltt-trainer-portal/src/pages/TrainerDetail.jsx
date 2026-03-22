import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

const STATUS_STYLES = {
  Compliant: { bg: "#e6f9f4", color: "#0f7a5a" },
  Pending: { bg: "#fdf3e0", color: "#b8711a" },
  Incomplete: { bg: "#fdeaea", color: "#c93535" },
  "Under Review": { bg: "#e6f0ff", color: "#1c5ea8" },
};

function Section({ title, children, action }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right max-w-xs">{value || "—"}</span>
    </div>
  );
}

function ProgressBar({ value }) {
  const color = value >= 100 ? "#32ba9a" : value >= 60 ? "#e8a020" : "#c93535";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold text-gray-600 min-w-10 text-right">{value}%</span>
    </div>
  );
}

function CompletionCard({ title, value, sub, icon }) {
  const color = value >= 100 ? "#32ba9a" : value >= 60 ? "#e8a020" : "#c93535";
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 truncate">{title}</p>
        <ProgressBar value={value} />
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

// ── Progress calculation helpers ──────────────────────────────────────────────

function calcProfilePct(trainer, trainerProfile) {
  // Section 1 fields
  const s1Fields = [trainer?.full_name, trainer?.state, trainer?.position, trainer?.employment_status, trainer?.phone];
  // Section 2 fields (at minimum TAE qual + provider + date)
  const s2Fields = [trainerProfile?.tae_qualification, trainerProfile?.tae_provider, trainerProfile?.tae_issue_date];
  // Section 4 declaration
  const s4Fields = [trainerProfile?.declaration_credentials, trainerProfile?.declaration_copies, trainerProfile?.declaration_signature, trainerProfile?.declaration_date];

  const allFields = [...s1Fields, ...s2Fields, ...s4Fields];
  const filled = allFields.filter(Boolean).length;
  return Math.round((filled / allFields.length) * 100);
}

function calcQuestionnairePct(responses) {
  const totalUnits = UNITS.length;
  const answered = responses.filter((r) => r.response).length;
  return Math.round((answered / totalUnits) * 100);
}

function calcExperiencePct(responses, experienceData) {
  const yesUnits = responses.filter((r) => r.response === "yes");
  if (yesUnits.length === 0) return null; // not applicable yet
  const completed = yesUnits.filter((r) => experienceData.find((e) => e.unit_code === r.unit_code && e.experience_description?.trim())).length;
  return Math.round((completed / yesUnits.length) * 100);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrainerDetail({ profile: adminProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState(null);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [industryQuals, setIndustryQuals] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    const [{ data: trainerData }, { data: profileData }, { data: responses }, { data: expData }, { data: quals }, { data: files }] = await Promise.all([
      supabase.from("trainers").select("*").eq("id", id).single(),
      supabase.from("trainer_profiles").select("*").eq("trainer_id", id).maybeSingle(),
      supabase.from("questionnaire_responses").select("*").eq("trainer_id", id),
      supabase.from("industry_experience").select("*").eq("trainer_id", id),
      supabase.from("industry_qualifications").select("*").eq("trainer_id", id),
      supabase.from("evidence_files").select("*").eq("trainer_id", id),
    ]);

    setTrainer(trainerData);
    setTrainerProfile(profileData);
    setQuestionnaireResponses(responses || []);
    setExperienceData(expData || []);
    setIndustryQuals(quals || []);
    setEvidenceFiles(files || []);
    setLoading(false);
  };

  const updateStatus = async (status) => {
    setSaving(true);
    const { error } = await supabase.from("trainers").update({ compliance_status: status }).eq("id", id);

    if (!error) {
      setTrainer((prev) => ({ ...prev, compliance_status: status }));
      if (trainerProfile) {
        await supabase
          .from("trainer_profiles")
          .update({
            profile_status: status === "Compliant" ? "Approved" : "Under Review",
            reviewed_by: adminProfile?.full_name,
            reviewed_at: new Date().toISOString(),
            review_notes: statusNote,
          })
          .eq("trainer_id", id);
      }
    }
    setSaving(false);
    setShowStatusModal(false);
    setStatusNote("");
  };

  // ── Progress calculations ──
  const profilePct = calcProfilePct(trainer, trainerProfile);
  const questPct = calcQuestionnairePct(questionnaireResponses);
  const expPct = calcExperiencePct(questionnaireResponses, experienceData);
  const yesCount = questionnaireResponses.filter((r) => r.response === "yes").length;
  const answeredCount = questionnaireResponses.filter((r) => r.response).length;

  // Overall — average of completed sections
  const overallPct = Math.round((profilePct + questPct + (expPct ?? 0)) / 3);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading trainer...</p>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-400 mb-3">Trainer not found</p>
        <button onClick={() => navigate("/trainers")} className="text-sm font-medium" style={{ color: "#1c5ea8" }}>
          ← Back to trainers
        </button>
      </div>
    );
  }

  const initials = trainer.full_name
    ? trainer.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  const statusStyle = STATUS_STYLES[trainer.compliance_status] || STATUS_STYLES["Incomplete"];

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate("/trainers")} className="flex items-center gap-2 text-sm mb-5 transition-colors" style={{ color: "#1c5ea8" }}>
        ← Back to trainers
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-gray-800">{trainer.full_name}</h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
              {trainer.compliance_status || "Incomplete"}
            </span>
          </div>
          <p className="text-sm text-gray-400">{trainer.email}</p>
          <p className="text-sm text-gray-400">
            {trainer.position || "Position not set"} · {trainer.employment_status || "Employment not set"}
          </p>
          {/* Overall progress */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${overallPct}%`,
                  backgroundColor: overallPct >= 100 ? "#32ba9a" : overallPct >= 60 ? "#e8a020" : "#c93535",
                }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500">{overallPct}% overall</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewStatus("Compliant");
              setShowStatusModal(true);
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#32ba9a" }}
          >
            ✓ Mark Compliant
          </button>
          <button
            onClick={() => {
              setNewStatus("Under Review");
              setShowStatusModal(true);
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Under Review
          </button>
        </div>
      </div>

      {/* Progress cards — all 3 sections */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <CompletionCard title="Sections 1–4 — Profile" value={profilePct} sub={profilePct === 0 ? "Not started" : profilePct === 100 ? "Complete" : "In progress"} icon="📄" />
        <CompletionCard title="Section 5 — Questionnaire" value={questPct} sub={`${answeredCount} of ${UNITS.length} units answered`} icon="📋" />
        <CompletionCard
          title="Section 6 — Experience"
          value={expPct ?? 0}
          sub={expPct === null ? "Complete questionnaire first" : expPct === 100 ? `All ${yesCount} units complete` : `${experienceData.filter((e) => e.experience_description?.trim()).length} of ${yesCount} units complete`}
          icon="🔬"
        />
      </div>

      {/* Personal details */}
      <Section title="Section 1 — Personal Details">
        <DetailRow label="Full Name" value={trainer.full_name} />
        <DetailRow label="Email" value={trainer.email} />
        <DetailRow label="Phone" value={trainer.phone} />
        <DetailRow label="State" value={trainer.state} />
        <DetailRow label="Position" value={trainer.position} />
        <DetailRow label="Employment Status" value={trainer.employment_status} />
      </Section>

      {/* Training credentials */}
      <Section title="Section 2 — Training Credentials" action={<span className="text-xs text-gray-400">{trainerProfile?.tae_qualification ? "Submitted" : "Not submitted"}</span>}>
        {trainerProfile?.tae_qualification ? (
          <>
            <DetailRow label="TAE Qualification" value={trainerProfile.tae_qualification} />
            <DetailRow label="Provider Name" value={trainerProfile.tae_provider} />
            <DetailRow label="Provider ID" value={trainerProfile.tae_provider_id} />
            <DetailRow label="Issue Date" value={trainerProfile.tae_issue_date} />
            {trainerProfile.under_direction_qualification && (
              <>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-3 pb-1 border-t border-gray-100 mt-2">Under Direction</div>
                <DetailRow label="Qualification" value={trainerProfile.under_direction_qualification} />
                <DetailRow label="Provider Name" value={trainerProfile.under_direction_provider} />
                <DetailRow label="Provider ID" value={trainerProfile.under_direction_provider_id} />
                <DetailRow label="Commencement" value={trainerProfile.under_direction_commencement} />
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">Trainer has not submitted their profile yet</p>
        )}
      </Section>

      {/* Industry qualifications */}
      <Section
        title="Section 3 — Industry Competencies"
        action={
          <span className="text-xs text-gray-400">
            {industryQuals.length} qualification{industryQuals.length !== 1 ? "s" : ""}
          </span>
        }
      >
        {industryQuals.length === 0 ? (
          <p className="text-sm text-gray-400">No industry qualifications submitted yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["Code", "Title", "Provider Name", "Provider ID", "Issue Date"].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {industryQuals.map((q, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{q.qualification_code || "—"}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-800">{q.qualification_title || "—"}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{q.provider_name || "—"}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{q.provider_id || "—"}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{q.issue_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Declaration */}
      <Section title="Section 4 — Credentials Declaration">
        {trainerProfile ? (
          <>
            <DetailRow label="Declaration — credentials true and correct" value={trainerProfile.declaration_credentials ? "✓ Confirmed" : "Not confirmed"} />
            <DetailRow label="Declaration — copies provided" value={trainerProfile.declaration_copies ? "✓ Confirmed" : "Not confirmed"} />
            <DetailRow label="Signature" value={trainerProfile.declaration_signature} />
            <DetailRow label="Date" value={trainerProfile.declaration_date} />
          </>
        ) : (
          <p className="text-sm text-gray-400">Trainer has not submitted their declaration yet</p>
        )}
      </Section>

      {/* Questionnaire responses */}
      <Section
        title="Section 5 — Skills Questionnaire"
        action={
          <span className="text-xs text-gray-400">
            {answeredCount} of {UNITS.length} units answered
          </span>
        }
      >
        {questionnaireResponses.length === 0 ? (
          <p className="text-sm text-gray-400">Trainer has not completed the questionnaire yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {questionnaireResponses.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800 font-mono">{r.unit_code}</p>
                  <p className="text-xs text-gray-400">{r.unit_title}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.holds_unit && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#eef2ff", color: "#4f46e5" }}>
                      Holds unit
                    </span>
                  )}
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: r.response === "yes" ? "#e6f9f4" : "#fdeaea",
                      color: r.response === "yes" ? "#0f7a5a" : "#c93535",
                    }}
                  >
                    {r.response === "yes" ? "Yes — Has experience" : "No experience"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Industry experience */}
      <Section
        title="Section 6 — Industry Experience"
        action={
          <span className="text-xs text-gray-400">
            {experienceData.filter((e) => e.experience_description?.trim()).length} of {yesCount} completed
          </span>
        }
      >
        {yesCount === 0 ? (
          <p className="text-sm text-gray-400">No units marked Yes in the questionnaire yet</p>
        ) : experienceData.length === 0 ? (
          <p className="text-sm text-gray-400">Trainer has not completed Section 6 yet</p>
        ) : (
          <div className="space-y-4">
            {experienceData.map((e) => (
              <div key={e.id} className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                  <span className="text-xs font-bold px-2 py-1 rounded font-mono" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                    {e.unit_code}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{e.unit_title}</span>
                  {e.competency_confirmed && (
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>
                      ✓ Confirmed
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Industry Experience</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{e.experience_description || <span className="text-gray-300 italic">Not completed</span>}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Professional Development</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{e.professional_development || <span className="text-gray-300 italic">Not provided</span>}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Evidence documents */}
      <Section
        title="Evidence Documents"
        action={
          <span className="text-xs text-gray-400">
            {evidenceFiles.length} file{evidenceFiles.length !== 1 ? "s" : ""}
          </span>
        }
      >
        {evidenceFiles.length === 0 ? (
          <p className="text-sm text-gray-400">No evidence files uploaded yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {evidenceFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-lg">📎</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{f.file_name}</p>
                    <p className="text-xs text-gray-400">{f.document_type}</p>
                  </div>
                </div>
                <button
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                  onClick={async () => {
                    const { data } = await supabase.storage.from("evidence-files").createSignedUrl(f.file_path, 60);
                    if (data) window.open(data.signedUrl, "_blank");
                  }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Status modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Update Status</h2>
            <p className="text-sm text-gray-400 mb-5">
              Mark this trainer as <strong>{newStatus}</strong>
            </p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add any review notes..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowStatusModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => updateStatus(newStatus)} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1c5ea8" }}>
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
