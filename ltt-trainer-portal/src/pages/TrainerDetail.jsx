import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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
    <div className="bg-gray-50 rounded-xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
        <ProgressBar value={value} />
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

export default function TrainerDetail({ profile: adminProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainer, setTrainer] = useState(null);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
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
    const [{ data: trainerData }, { data: profileData }, { data: responses }, { data: files }] = await Promise.all([
      supabase.from("trainers").select("*").eq("id", id).single(),
      supabase.from("trainer_profiles").select("*").eq("trainer_id", id).single(),
      supabase.from("questionnaire_responses").select("*").eq("trainer_id", id),
      supabase.from("evidence_files").select("*").eq("trainer_id", id),
    ]);

    setTrainer(trainerData);
    setTrainerProfile(profileData);
    setQuestionnaireResponses(responses || []);
    setEvidenceFiles(files || []);
    setLoading(false);
  };

  const updateStatus = async (status) => {
    setSaving(true);
    const { error } = await supabase
      .from("trainers")
      .update({
        compliance_status: status,
      })
      .eq("id", id);

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

  const questPct = questionnaireResponses.length > 0 ? Math.round((questionnaireResponses.length / 13) * 100) : 0;

  const profilePct = (() => {
    if (!trainerProfile) return 0;
    const fields = [trainerProfile.tae_qualification, trainerProfile.tae_provider, trainerProfile.tae_issue_date, trainerProfile.declaration_credentials, trainerProfile.declaration_signature];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

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
      {/* Back button */}
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

      {/* Completion cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <CompletionCard title="Skills Questionnaire" value={questPct} sub={`${questionnaireResponses.length} of 13 units completed`} icon="📋" />
        <CompletionCard title="Trainer Profile (AF3.21)" value={profilePct} sub={profilePct === 0 ? "Not started" : profilePct === 100 ? "Complete" : "In progress"} icon="📄" />
      </div>

      {/* Trainer details */}
      <Section title="Personal Details">
        <DetailRow label="Full Name" value={trainer.full_name} />
        <DetailRow label="Email" value={trainer.email} />
        <DetailRow label="Phone" value={trainer.phone} />
        <DetailRow label="State" value={trainer.state} />
        <DetailRow label="Position" value={trainer.position} />
        <DetailRow label="Employment Status" value={trainer.employment_status} />
      </Section>

      {/* Training credentials */}
      <Section title="Training Credentials (Section 2)" action={<span className="text-xs text-gray-400">{trainerProfile ? "Submitted" : "Not submitted"}</span>}>
        {trainerProfile ? (
          <>
            <DetailRow label="TAE Qualification" value={trainerProfile.tae_qualification} />
            <DetailRow label="Provider" value={trainerProfile.tae_provider} />
            <DetailRow label="Issue Date" value={trainerProfile.tae_issue_date} />
            <DetailRow label="Verified By" value={trainerProfile.tae_verified_by} />
            <DetailRow label="Copy Held" value={trainerProfile.tae_copy_held ? "Yes" : "No"} />
          </>
        ) : (
          <p className="text-sm text-gray-400">Trainer has not submitted their profile yet</p>
        )}
      </Section>

      {/* Questionnaire responses */}
      <Section title="Skills Questionnaire Responses" action={<span className="text-xs text-gray-400">{questionnaireResponses.length} responses</span>}>
        {questionnaireResponses.length === 0 ? (
          <p className="text-sm text-gray-400">Trainer has not completed the questionnaire yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {questionnaireResponses.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.unit_code}</p>
                  <p className="text-xs text-gray-400">{r.unit_title}</p>
                </div>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                  style={{
                    backgroundColor: r.response === "yes" ? "#e6f9f4" : r.response === "hold" ? "#e6f0ff" : "#fdeaea",
                    color: r.response === "yes" ? "#0f7a5a" : r.response === "hold" ? "#1c5ea8" : "#c93535",
                  }}
                >
                  {r.response === "yes" ? "Yes — Has experience" : r.response === "hold" ? "Holds this unit" : "No experience"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Evidence files */}
      <Section title="Evidence Documents" action={<span className="text-xs text-gray-400">{evidenceFiles.length} files</span>}>
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
                <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">View</button>
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
