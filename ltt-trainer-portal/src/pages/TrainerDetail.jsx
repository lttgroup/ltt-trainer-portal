import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

// ── Admin Experience Tab ──────────────────────────────────────────────────────

function ExperienceTab({ trainerId, assignedUnits, experienceData, adminProfile, onUpdate }) {
  const [saving, setSaving] = useState({});
  const [localExp, setLocalExp] = useState({});

  useEffect(() => {
    const mapped = {};
    experienceData.forEach((e) => {
      mapped[e.unit_code] = {
        competency_confirmed: e.competency_confirmed,
        holds_unit: e.holds_unit || false,
        admin_notes: e.admin_notes || "",
        professional_development: e.professional_development || "",
        element_descriptions: e.element_descriptions || {},
      };
    });
    setLocalExp(mapped);
  }, [experienceData]);

  const unitsToShow = assignedUnits
    .map((a) => UNITS.find((u) => u.code === a.unit_code))
    .filter(Boolean)
    .sort((a, b) => a.code.localeCompare(b.code));

  const completedCount = experienceData.filter((e) => {
    const unit = UNITS.find((u) => u.code === e.unit_code);
    if (!unit) return false;
    if (unit.elements.length === 0) return !!e.professional_development?.trim();
    const descs = e.element_descriptions || {};
    return unit.elements.every((_, i) => descs[i]?.trim());
  }).length;

  const saveUnit = async (unitCode) => {
    setSaving((prev) => ({ ...prev, [unitCode]: true }));
    const data = localExp[unitCode] || {};
    await supabase.from("industry_experience").upsert(
      {
        trainer_id: trainerId,
        unit_code: unitCode,
        unit_title: UNITS.find((u) => u.code === unitCode)?.title || "",
        competency_confirmed: data.competency_confirmed,
        holds_unit: data.holds_unit,
        admin_notes: data.admin_notes,
        reviewed_by: adminProfile?.full_name,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "trainer_id,unit_code" },
    );
    setSaving((prev) => ({ ...prev, [unitCode]: false }));
    onUpdate();
  };

  const update = (unitCode, field, value) => {
    setLocalExp((prev) => ({
      ...prev,
      [unitCode]: { ...prev[unitCode], [field]: value },
    }));
  };

  if (assignedUnits.length === 0)
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400">No units assigned yet — use the Stream Assignment tab first</p>
      </div>
    );

  return (
    <div>
      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Section 6 — Industry Experience</p>
          <p className="text-sm text-gray-600">
            {completedCount} of {unitsToShow.length} units completed by trainer. Use the controls below to confirm competency and record held units.
          </p>
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div>
            <p className="text-xl font-bold" style={{ color: "#1c5ea8" }}>
              {Object.values(localExp).filter((e) => e.competency_confirmed === true).length}
            </p>
            <p className="text-xs text-gray-400">Confirmed</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "#c93535" }}>
              {Object.values(localExp).filter((e) => e.competency_confirmed === false).length}
            </p>
            <p className="text-xs text-gray-400">Not confirmed</p>
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: "#32ba9a" }}>
              {Object.values(localExp).filter((e) => e.holds_unit).length}
            </p>
            <p className="text-xs text-gray-400">Holds unit</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {unitsToShow.map((unit) => {
          const exp = localExp[unit.code] || {};
          const submitted = experienceData.find((e) => e.unit_code === unit.code);
          const descs = submitted?.element_descriptions || {};

          return (
            <div key={unit.code} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                  {unit.code}
                </span>
                <span className="text-sm font-medium text-gray-800 flex-1">{unit.title}</span>
                {exp.holds_unit && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>
                    Holds unit
                  </span>
                )}
                {exp.competency_confirmed === true && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#dbeafe", color: "#1c5ea8" }}>
                    ✓ Competency confirmed
                  </span>
                )}
                {exp.competency_confirmed === false && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>
                    ✗ Not confirmed
                  </span>
                )}
              </div>

              <div className="p-5">
                {/* Trainer's element descriptions */}
                {!submitted ? (
                  <p className="text-sm text-gray-400 italic mb-4">Trainer has not completed this unit yet</p>
                ) : (
                  <div className="mb-5">
                    {unit.elements.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Trainer's experience descriptions</p>
                        {unit.elements.map((element, idx) => (
                          <div key={idx} className="rounded-lg p-3 border border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              <span className="inline-block mr-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f0f4ff", color: "#1c5ea8" }}>
                                {idx + 1}
                              </span>
                              {element}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">{descs[idx] || <span className="italic text-gray-300">Not completed</span>}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg p-3 border border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Experience Description</p>
                        <p className="text-sm text-gray-700">{descs[0] || <span className="italic text-gray-300">Not completed</span>}</p>
                      </div>
                    )}

                    {submitted.professional_development && (
                      <div className="mt-3 rounded-lg p-3 border border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Professional Development</p>
                        <p className="text-sm text-gray-700">{submitted.professional_development}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin controls */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin Assessment</p>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Competency confirmation */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Competency</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => update(unit.code, "competency_confirmed", true)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={exp.competency_confirmed === true ? { backgroundColor: "#dbeafe", color: "#1c5ea8", borderColor: "#93c5fd" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
                        >
                          ✓ Confirmed
                        </button>
                        <button
                          onClick={() => update(unit.code, "competency_confirmed", false)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={exp.competency_confirmed === false ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#fca5a5" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
                        >
                          ✗ Not confirmed
                        </button>
                      </div>
                    </div>

                    {/* Holds unit */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Holds Unit</p>
                      <button
                        onClick={() => update(unit.code, "holds_unit", !exp.holds_unit)}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={exp.holds_unit ? { backgroundColor: "#e6f9f4", color: "#0f7a5a", borderColor: "#6ee7b7" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
                      >
                        {exp.holds_unit ? "✓ Holds unit" : "Mark as holds unit"}
                      </button>
                    </div>

                    {/* Save */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Action</p>
                      <button
                        onClick={() => saveUnit(unit.code)}
                        disabled={saving[unit.code]}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                        style={{ backgroundColor: saving[unit.code] ? "#9ca3af" : "#1c5ea8" }}
                      >
                        {saving[unit.code] ? "Saving..." : "Save assessment"}
                      </button>
                    </div>
                  </div>

                  {/* Admin notes */}
                  <div className="mt-3">
                    <textarea
                      value={exp.admin_notes || ""}
                      onChange={(e) => update(unit.code, "admin_notes", e.target.value)}
                      placeholder="Admin notes (optional)..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-blue-400 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  Compliant: { bg: "#e6f9f4", color: "#0f7a5a" },
  Pending: { bg: "#fdf3e0", color: "#b8711a" },
  Incomplete: { bg: "#fdeaea", color: "#c93535" },
  "Under Review": { bg: "#e6f0ff", color: "#1c5ea8" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Progress helpers ──────────────────────────────────────────────────────────

function calcProfilePct(trainer, trainerProfile) {
  const fields = [
    trainer?.full_name,
    trainer?.state,
    trainer?.position,
    trainer?.employment_status,
    trainer?.phone,
    trainerProfile?.tae_qualification,
    trainerProfile?.tae_provider,
    trainerProfile?.tae_issue_date,
    trainerProfile?.declaration_credentials,
    trainerProfile?.declaration_copies,
    trainerProfile?.declaration_signature,
    trainerProfile?.declaration_date,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function calcQuestionnairePct(responses) {
  return Math.round((responses.filter((r) => r.response).length / UNITS.length) * 100);
}

function calcExperiencePct(responses, experienceData) {
  const yesUnits = responses.filter((r) => r.response === "yes");
  if (yesUnits.length === 0) return null;
  const completed = yesUnits.filter((r) => experienceData.find((e) => e.unit_code === r.unit_code && e.experience_description?.trim())).length;
  return Math.round((completed / yesUnits.length) * 100);
}

// ── Streams Tab ───────────────────────────────────────────────────────────────

function StreamsTab({ trainerId, responses, assignedUnits, onAssignmentChange }) {
  const [streams, setStreams] = useState([]);
  const [streamUnits, setStreamUnits] = useState({}); // streamId -> [unit_codes]
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterQual, setFilterQual] = useState("All");
  const [loading, setLoading] = useState(true);

  const yesSet = new Set(responses.filter((r) => r.response === "yes").map((r) => r.unit_code));
  const assignedSet = new Set(assignedUnits.map((a) => a.unit_code));

  useEffect(() => {
    fetchStreams();
  }, []);

  // Pre-select streams that are already fully assigned
  useEffect(() => {
    if (Object.keys(streamUnits).length === 0) return;
    const preSelected = new Set();
    streams.forEach((s) => {
      const units = streamUnits[s.id] || [];
      if (units.length > 0 && units.every((u) => assignedSet.has(u))) {
        preSelected.add(s.id);
      }
    });
    setSelected(preSelected);
  }, [assignedUnits, streamUnits]);

  const fetchStreams = async () => {
    const { data: streamData } = await supabase.from("streams").select("*").order("qualification_code").order("stream_name");

    if (!streamData) {
      setLoading(false);
      return;
    }
    setStreams(streamData);

    const { data: suData } = await supabase.from("stream_units").select("stream_id, unit_code");

    const map = {};
    (suData || []).forEach((row) => {
      if (!map[row.stream_id]) map[row.stream_id] = [];
      map[row.stream_id].push(row.unit_code);
    });
    setStreamUnits(map);
    setLoading(false);
  };

  const toggleStream = (streamId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(streamId) ? next.delete(streamId) : next.add(streamId);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);

    // Collect all unit codes from selected streams
    const unitCodes = new Set();
    selected.forEach((streamId) => {
      (streamUnits[streamId] || []).forEach((code) => unitCodes.add(code));
    });

    // Delete existing assigned units for this trainer
    await supabase.from("assigned_units").delete().eq("trainer_id", trainerId);

    // Insert new assignments
    if (unitCodes.size > 0) {
      const inserts = [...unitCodes].map((code) => ({
        trainer_id: trainerId,
        unit_code: code,
      }));
      await supabase.from("assigned_units").insert(inserts);
    }

    setSaved(true);
    setSaving(false);
    onAssignmentChange();
  };

  // Stream coverage calculation
  const getStreamCoverage = (streamId) => {
    const units = streamUnits[streamId] || [];
    if (units.length === 0) return { pct: 0, yes: 0, total: 0 };
    const yes = units.filter((u) => yesSet.has(u)).length;
    return { pct: Math.round((yes / units.length) * 100), yes, total: units.length };
  };

  const quals = [...new Set(streams.map((s) => s.qualification_code))].sort();
  const filtered = filterQual === "All" ? streams : streams.filter((s) => s.qualification_code === filterQual);

  // Group by qualification
  const grouped = {};
  filtered.forEach((s) => {
    if (!grouped[s.qualification_code]) grouped[s.qualification_code] = [];
    grouped[s.qualification_code].push(s);
  });

  const selectedUnitCount = new Set([...selected].flatMap((sid) => streamUnits[sid] || [])).size;

  if (loading)
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-400">Loading streams...</p>
      </div>
    );

  return (
    <div>
      {/* Summary banner */}
      <div className="rounded-xl p-5 mb-5 flex items-center gap-6" style={{ backgroundColor: "#081a47" }}>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Stream Assignment
          </p>
          <p className="text-sm text-white">Select the streams this trainer should complete for Section 6. Only streams where the trainer has experience against required units will unlock meaningful evidence collection.</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-white">{selected.size}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            stream{selected.size !== 1 ? "s" : ""} selected
          </p>
          {selected.size > 0 && (
            <p className="text-xs mt-1" style={{ color: "#65f6cc" }}>
              {selectedUnitCount} units assigned
            </p>
          )}
        </div>
      </div>

      {/* Qual filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterQual("All")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
          style={filterQual === "All" ? { backgroundColor: "#081a47", color: "#fff", borderColor: "#081a47" } : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
        >
          All qualifications
        </button>
        {quals.map((q) => (
          <button
            key={q}
            onClick={() => setFilterQual(q)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={filterQual === q ? { backgroundColor: "#081a47", color: "#fff", borderColor: "#081a47" } : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Streams by qualification */}
      {Object.entries(grouped).map(([qual, qualStreams]) => (
        <div key={qual} className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "#16406f" }}>
              {qual}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {qualStreams.map((stream) => {
              const cov = getStreamCoverage(stream.id);
              const isSelected = selected.has(stream.id);
              const isAssigned = [...(streamUnits[stream.id] || [])].every((u) => assignedSet.has(u)) && (streamUnits[stream.id] || []).length > 0;

              let statusColor = "#c93535"; // red — low coverage
              if (cov.pct === 100)
                statusColor = "#1c5ea8"; // blue — full experience
              else if (cov.pct >= 60) statusColor = "#e8a020"; // amber — partial

              return (
                <button
                  key={stream.id}
                  onClick={() => toggleStream(stream.id)}
                  className="text-left rounded-xl p-4 transition-all border-2"
                  style={{
                    borderColor: isSelected ? "#1c5ea8" : cov.pct === 100 ? "#bfdbfe" : "#e5e7eb",
                    backgroundColor: isSelected ? "#eff6ff" : cov.pct === 100 ? "#f8faff" : "#fff",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{stream.stream_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{stream.total_units} units</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        borderColor: isSelected ? "#1c5ea8" : "#d1d5db",
                        backgroundColor: isSelected ? "#1c5ea8" : "transparent",
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Coverage bar */}
                  <div className="mb-1.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-400">Trainer experience</span>
                      <span className="text-xs font-semibold" style={{ color: statusColor }}>
                        {cov.yes}/{cov.total} units
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${cov.pct}%`, backgroundColor: statusColor }} />
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {cov.pct === 100 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dbeafe", color: "#1c5ea8" }}>
                        ✓ Full experience
                      </span>
                    )}
                    {cov.pct >= 60 && cov.pct < 100 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdf3e0", color: "#b8711a" }}>
                        Partial experience
                      </span>
                    )}
                    {cov.pct < 60 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>
                        Limited experience
                      </span>
                    )}
                    {isAssigned && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                        Currently assigned
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save button */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <p className="text-xs text-gray-400">
          {selected.size === 0 ? "No streams selected — trainer will see the awaiting assignment message in Section 6" : `${selectedUnitCount} units will be assigned across ${selected.size} stream${selected.size !== 1 ? "s" : ""}`}
        </p>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: saving ? "#9ca3af" : "#1c5ea8" }}>
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Stream Assignment"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrainerDetail({ profile: adminProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  const [trainer, setTrainer] = useState(null);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const [experienceData, setExperienceData] = useState([]);
  const [industryQuals, setIndustryQuals] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [assignedUnits, setAssignedUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    const [{ data: trainerData }, { data: profileData }, { data: responses }, { data: expData }, { data: quals }, { data: files }, { data: assigned }] = await Promise.all([
      supabase.from("trainers").select("*").eq("id", id).single(),
      supabase.from("trainer_profiles").select("*").eq("trainer_id", id).maybeSingle(),
      supabase.from("questionnaire_responses").select("*").eq("trainer_id", id),
      supabase.from("industry_experience").select("*").eq("trainer_id", id),
      supabase.from("industry_qualifications").select("*").eq("trainer_id", id),
      supabase.from("evidence_files").select("*").eq("trainer_id", id),
      supabase.from("assigned_units").select("*").eq("trainer_id", id),
    ]);

    setTrainer(trainerData);
    setTrainerProfile(profileData);
    setQuestionnaireResponses(responses || []);
    setExperienceData(expData || []);
    setIndustryQuals(quals || []);
    setEvidenceFiles(files || []);
    setAssignedUnits(assigned || []);
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

  const profilePct = calcProfilePct(trainer, trainerProfile);
  const questPct = calcQuestionnairePct(questionnaireResponses);
  const expPct = calcExperiencePct(questionnaireResponses, experienceData);
  const yesCount = questionnaireResponses.filter((r) => r.response === "yes").length;
  const answeredCount = questionnaireResponses.filter((r) => r.response).length;
  const overallPct = Math.round((profilePct + questPct + (expPct ?? 0)) / 3);

  const TABS = [
    { id: "profile", label: "Profile & Credentials" },
    { id: "questionnaire", label: "Skills Questionnaire" },
    { id: "streams", label: "Stream Assignment" },
    { id: "experience", label: "Industry Experience" },
    { id: "evidence", label: "Evidence" },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading trainer...</p>
      </div>
    );

  if (!trainer)
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-400 mb-3">Trainer not found</p>
        <button onClick={() => navigate("/trainers")} className="text-sm font-medium" style={{ color: "#1c5ea8" }}>
          ← Back to trainers
        </button>
      </div>
    );

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

      {/* Progress cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <CompletionCard title="Sections 1–4 — Profile" value={profilePct} sub={profilePct === 0 ? "Not started" : profilePct === 100 ? "Complete" : "In progress"} icon="📄" />
        <CompletionCard title="Section 5 — Questionnaire" value={questPct} sub={`${answeredCount} of ${UNITS.length} units answered`} icon="📋" />
        <CompletionCard
          title="Section 6 — Experience"
          value={expPct ?? 0}
          sub={expPct === null ? "Awaiting assignment" : expPct === 100 ? `All ${yesCount} units complete` : `${experienceData.filter((e) => e.experience_description?.trim()).length} of ${assignedUnits.length} units complete`}
          icon="🔬"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
            style={activeTab === tab.id ? { backgroundColor: "#fff", color: "#081a47", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { backgroundColor: "transparent", color: "#6b7280" }}
          >
            {tab.label}
            {tab.id === "streams" && assignedUnits.length > 0 && (
              <span className="ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                {assignedUnits.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PROFILE & CREDENTIALS TAB ── */}
      {activeTab === "profile" && (
        <>
          <Section title="Section 1 — Personal Details">
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">
              <DetailRow label="Full Name" value={trainer.full_name} />
              <DetailRow label="Email" value={trainer.email} />
              <DetailRow label="Position" value={trainer.position} />
              <DetailRow label="Employment Status" value={trainer.employment_status} />
              <DetailRow label="Phone" value={trainer.phone} />
              <DetailRow label="State" value={trainer.state} />
            </div>
          </Section>

          <Section title="Section 2 — Training Credentials" action={<span className="text-xs text-gray-400">{trainerProfile?.tae_qualification ? "Submitted" : "Not submitted"}</span>}>
            {trainerProfile?.tae_qualification ? (
              <>
                <div className="grid grid-cols-2 gap-x-8 gap-y-0 mb-2">
                  <DetailRow label="TAE Qualification" value={trainerProfile.tae_qualification} />
                  <DetailRow label="Issue Date" value={trainerProfile.tae_issue_date} />
                  <DetailRow label="Provider Name" value={trainerProfile.tae_provider} />
                  <DetailRow label="Provider ID" value={trainerProfile.tae_provider_id} />
                </div>
                {trainerProfile.under_direction_qualification && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-3 pb-1 border-t border-gray-100 mt-2">Under Direction</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                      <DetailRow label="Qualification" value={trainerProfile.under_direction_qualification} />
                      <DetailRow label="Commencement" value={trainerProfile.under_direction_commencement} />
                      <DetailRow label="Provider Name" value={trainerProfile.under_direction_provider} />
                      <DetailRow label="Provider ID" value={trainerProfile.under_direction_provider_id} />
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">Trainer has not submitted their profile yet</p>
            )}
          </Section>

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

          <Section title="Section 4 — Credentials Declaration">
            {trainerProfile ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                <DetailRow label="Credentials declared true and correct" value={trainerProfile.declaration_credentials ? "✓ Confirmed" : "Not confirmed"} />
                <DetailRow label="Copies provided" value={trainerProfile.declaration_copies ? "✓ Confirmed" : "Not confirmed"} />
                <DetailRow label="Signature" value={trainerProfile.declaration_signature} />
                <DetailRow label="Date" value={trainerProfile.declaration_date} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Trainer has not submitted their declaration yet</p>
            )}
          </Section>
        </>
      )}

      {/* ── QUESTIONNAIRE TAB ── */}
      {activeTab === "questionnaire" && (
        <Section
          title="Section 5 — Skills Questionnaire"
          action={
            <span className="text-xs text-gray-400">
              {answeredCount} of {UNITS.length} answered
            </span>
          }
        >
          {questionnaireResponses.length === 0 ? (
            <p className="text-sm text-gray-400">Trainer has not completed the questionnaire yet</p>
          ) : (
            <div className="grid grid-cols-6 gap-1.5">
              {[...questionnaireResponses]
                .sort((a, b) => a.unit_code.localeCompare(b.unit_code))
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 border"
                    style={{
                      backgroundColor: r.response === "yes" ? "#eff6ff" : "#fafafa",
                      borderColor: r.response === "yes" ? "#bfdbfe" : "#e5e7eb",
                    }}
                  >
                    <span className="text-xs font-bold font-mono flex-shrink-0" style={{ color: r.response === "yes" ? "#1c5ea8" : "#9ca3af" }}>
                      {r.unit_code}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={r.response === "yes" ? { backgroundColor: "#dbeafe", color: "#1c5ea8" } : { backgroundColor: "#fdeaea", color: "#c93535" }}>
                      {r.response === "yes" ? "Experience" : "No"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Section>
      )}

      {/* ── STREAMS TAB ── */}
      {activeTab === "streams" && <StreamsTab trainerId={id} responses={questionnaireResponses} assignedUnits={assignedUnits} onAssignmentChange={fetchAll} />}

      {/* ── EXPERIENCE TAB ── */}
      {activeTab === "experience" && <ExperienceTab trainerId={id} assignedUnits={assignedUnits} experienceData={experienceData} adminProfile={adminProfile} onUpdate={fetchAll} />}

      {/* ── EVIDENCE TAB ── */}
      {activeTab === "evidence" && (
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
      )}

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
