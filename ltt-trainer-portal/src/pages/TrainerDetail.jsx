import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

// ── Admin Experience Tab ───────────────────────────────────────────────────────
function ExperienceTab({ trainerId, assignedUnits, experienceData, adminProfile, onUpdate }) {
  const [saving, setSaving] = useState({});
  const [localExp, setLocalExp] = useState({});
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    const mapped = {};
    const initialCollapsed = {};
    experienceData.forEach((e) => {
      mapped[e.unit_code] = { competency_confirmed: e.competency_confirmed, holds_unit: e.holds_unit || false, quality_notes: e.quality_notes || "", professional_development: e.professional_development || "", element_descriptions: e.element_descriptions || {} };
      if (e.competency_confirmed !== null && e.competency_confirmed !== undefined) initialCollapsed[e.unit_code] = true;
    });
    setLocalExp(mapped);
    setCollapsed((prev) => ({ ...initialCollapsed, ...prev }));
  }, [experienceData]);

  const unitsToShow = assignedUnits.map((a) => UNITS.find((u) => u.code === a.unit_code)).filter(Boolean).sort((a, b) => a.code.localeCompare(b.code));
  const completedCount = experienceData.filter((e) => { const unit = UNITS.find((u) => u.code === e.unit_code); if (!unit) return false; if (unit.elements.length === 0) return !!e.professional_development?.trim(); const descs = e.element_descriptions || {}; return unit.elements.every((_, i) => descs[i]?.trim()); }).length;

  const saveUnit = async (unitCode) => {
    setSaving((prev) => ({ ...prev, [unitCode]: true }));
    const data = localExp[unitCode] || {};
    const payload = { competency_confirmed: data.competency_confirmed, holds_unit: data.holds_unit ?? false, quality_notes: data.quality_notes || null, reviewed_by: adminProfile?.full_name || null, reviewed_at: new Date().toISOString() };
    const { data: updated, error: updateError } = await supabase.from("industry_experience").update(payload).eq("trainer_id", trainerId).eq("unit_code", unitCode).select();
    if (!updateError && (!updated || updated.length === 0)) {
      await supabase.from("industry_experience").upsert({ trainer_id: trainerId, unit_code: unitCode, unit_title: UNITS.find((u) => u.code === unitCode)?.title || "", element_descriptions: {}, ...payload }, { onConflict: "trainer_id,unit_code" });
    }
    setSaving((prev) => ({ ...prev, [unitCode]: false }));
    setCollapsed((prev) => ({ ...prev, [unitCode]: true }));
    setTimeout(() => {
      const allCodes = unitsToShow.map((u) => u.code);
      const currentIdx = allCodes.indexOf(unitCode);
      const nextCode = allCodes.slice(currentIdx + 1).find((code) => { const e = localExp[code] || {}; return e.competency_confirmed === null || e.competency_confirmed === undefined; }) || allCodes[currentIdx + 1];
      if (nextCode) { const el = document.getElementById(`unit-card-${nextCode}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }, 150);
    onUpdate();
    window.dispatchEvent(new Event("ltt:assessment-saved"));
  };

  const update = (unitCode, field, value) => setLocalExp((prev) => ({ ...prev, [unitCode]: { ...prev[unitCode], [field]: value } }));

  if (assignedUnits.length === 0)
    return <div className="bg-white border border-gray-200 rounded-xl p-8 text-center"><p className="text-sm text-gray-400">No units assigned yet — use the Stream Assignment tab first</p></div>;

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex items-center gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Section 6 — Industry Experience</p>
          <p className="text-sm text-gray-600">{completedCount} of {unitsToShow.length} units completed by trainer.</p>
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div><p className="text-xl font-bold" style={{ color: "#1c5ea8" }}>{Object.values(localExp).filter((e) => e.competency_confirmed === true).length}</p><p className="text-xs text-gray-400">Confirmed</p></div>
          <div><p className="text-xl font-bold" style={{ color: "#c93535" }}>{Object.values(localExp).filter((e) => e.competency_confirmed === false).length}</p><p className="text-xs text-gray-400">Not confirmed</p></div>
          <div><p className="text-xl font-bold" style={{ color: "#32ba9a" }}>{Object.values(localExp).filter((e) => e.holds_unit).length}</p><p className="text-xs text-gray-400">Holds unit</p></div>
        </div>
      </div>
      <div className="space-y-4">
        {unitsToShow.map((unit) => {
          const exp = localExp[unit.code] || {};
          const submitted = experienceData.find((e) => e.unit_code === unit.code);
          const descs = submitted?.element_descriptions || {};
          const isCollapsed = collapsed[unit.code];
          const isAssessed = exp.competency_confirmed !== undefined && exp.competency_confirmed !== null;
          return (
            <div key={unit.code} id={`unit-card-${unit.code}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              style={isCollapsed ? { borderColor: isAssessed && exp.competency_confirmed ? "#bfdbfe" : isAssessed ? "#fca5a5" : "#e5e7eb" } : {}}>
              <div className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none"
                style={{ backgroundColor: isCollapsed ? (exp.competency_confirmed === true ? "#eff6ff" : exp.competency_confirmed === false ? "#fef2f2" : "#f9fafb") : "#f9fafb", borderBottom: isCollapsed ? "none" : "1px solid #f3f4f6" }}
                onClick={() => setCollapsed((prev) => ({ ...prev, [unit.code]: !prev[unit.code] }))}>
                <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{unit.code}</span>
                <span className="text-sm font-medium text-gray-800 flex-1">{unit.title}</span>
                {exp.holds_unit && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>Holds unit</span>}
                {exp.competency_confirmed === true && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#dbeafe", color: "#1c5ea8" }}>✓ Confirmed</span>}
                {exp.competency_confirmed === false && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>✗ Not confirmed</span>}
                <span className="text-gray-400 text-xs ml-1 flex-shrink-0">{isCollapsed ? "▾ expand" : "▴ collapse"}</span>
              </div>
              {!isCollapsed && (
                <div className="p-5">
                  {!submitted ? <p className="text-sm text-gray-400 italic mb-4">Trainer has not completed this unit yet</p> : (
                    <div className="mb-5">
                      {unit.elements.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Trainer's experience descriptions</p>
                          {unit.elements.map((element, idx) => (
                            <div key={idx} className="rounded-lg p-3 border border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                              <p className="text-xs font-medium text-gray-500 mb-1"><span className="inline-block mr-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f0f4ff", color: "#1c5ea8" }}>{idx + 1}</span>{element}</p>
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
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quality Assessment</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Competency</p>
                        <div className="flex gap-2">
                          <button onClick={() => update(unit.code, "competency_confirmed", true)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={exp.competency_confirmed === true ? { backgroundColor: "#dbeafe", color: "#1c5ea8", borderColor: "#93c5fd" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>✓ Confirmed</button>
                          <button onClick={() => update(unit.code, "competency_confirmed", false)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={exp.competency_confirmed === false ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#fca5a5" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>✗ Not confirmed</button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Holds Unit</p>
                        <button onClick={() => update(unit.code, "holds_unit", !exp.holds_unit)} className="w-full py-1.5 rounded-lg text-xs font-semibold border transition-all"
                          style={exp.holds_unit ? { backgroundColor: "#e6f9f4", color: "#0f7a5a", borderColor: "#6ee7b7" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                          {exp.holds_unit ? "✓ Holds unit" : "Mark as holds unit"}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Action</p>
                        <button onClick={() => saveUnit(unit.code)} disabled={saving[unit.code]} className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                          style={{ backgroundColor: saving[unit.code] ? "#9ca3af" : "#1c5ea8" }}>{saving[unit.code] ? "Saving..." : "Save assessment"}</button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <textarea value={exp.quality_notes || ""} onChange={(e) => update(unit.code, "quality_notes", e.target.value)} placeholder="Quality notes (optional)..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-blue-400 resize-none" rows={2} />
                    </div>
                  </div>
                </div>
              )}
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

// ── Section header status badge ────────────────────────────────────────────────
function SectionStatusBadge({ status }) {
  if (status === "approved") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>✓ Approved</span>;
  if (status === "rejected") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>✗ Not Approved</span>;
  if (status === "pending") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdf3e0", color: "#92500a" }}>⏳ Awaiting Approval</span>;
  if (status === "submitted") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>Submitted</span>;
  return <span className="text-xs text-gray-400">Not submitted</span>;
}

// ── Brand-consistent section wrapper ──────────────────────────────────────────
// All section headers use the same dark brand colour with a subtle left accent
// to distinguish them, rather than different header colours per section.
function Section({ title, children, action, statusBadge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ backgroundColor: "#081a47" }}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-3">
          {statusBadge}
          {action && <div>{action}</div>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function DetailCell({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || "—"}</span>
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
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${color}20` }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 truncate">{title}</p>
        <ProgressBar value={value} />
        <p className="text-xs text-gray-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function calcProfilePct(trainer, trainerProfile) {
  const fields = [trainer?.full_name, trainer?.state, trainer?.position, trainer?.employment_status, trainer?.phone, trainerProfile?.tae_qualification, trainerProfile?.tae_provider, trainerProfile?.tae_issue_date, trainerProfile?.declaration_credentials, trainerProfile?.declaration_copies, trainerProfile?.declaration_signature, trainerProfile?.declaration_date];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function calcQuestionnairePct(responses) {
  return Math.round((responses.filter((r) => r.response).length / UNITS.length) * 100);
}

function calcExperiencePct(responses, experienceData, assignedUnits) {
  if (!assignedUnits || assignedUnits.length === 0) return null;
  const assessed = assignedUnits.filter((a) => experienceData.find((e) => e.unit_code === a.unit_code && e.competency_confirmed !== null)).length;
  return Math.round((assessed / assignedUnits.length) * 100);
}

function AdminUpload({ trainerId, documentType, onDone }) {
  const [uploading, setUploading] = useState(false);
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
      {uploading ? "Uploading..." : (<><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V2M6 2L3.5 4.5M6 2l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v.5a1 1 0 001 1h8a1 1 0 001-1v-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Upload</>)}
      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={uploading}
        onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return; setUploading(true);
          const ext = f.name.split(".").pop();
          const safeType = documentType.replace(/[^a-zA-Z0-9]/g, "_");
          const path = `${trainerId}/${safeType}_admin_${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from("evidence-files").upload(path, f);
          if (!upErr) { await supabase.from("evidence_files").insert({ trainer_id: trainerId, file_name: f.name, file_path: path, file_size: f.size, document_type: documentType }); onDone?.(); }
          setUploading(false);
        }} />
    </label>
  );
}

function FileList({ files, emptyMessage }) {
  if (files.length === 0) return <p className="text-xs text-amber-600 p-2 rounded" style={{ backgroundColor: "#fdf3e0" }}>⚠ {emptyMessage || "No files uploaded yet"}</p>;
  return (
    <div className="space-y-1.5">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
          <span className="text-sm">📎</span>
          <span className="text-sm text-gray-700 flex-1">{f.file_name}</span>
          <button onClick={async () => { const { data } = await supabase.storage.from("evidence-files").createSignedUrl(f.file_path, 120); if (data?.signedUrl) window.open(data.signedUrl, "_blank"); }}
            className="text-xs font-medium px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100">View</button>
        </div>
      ))}
    </div>
  );
}

// Neutral until selected — green when approved, red when rejected
function ApprovalButtons({ approved, onApprove, onReject, saving, approveLabel = "Approve", rejectLabel = "Not Approved" }) {
  return (
    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
      <button onClick={onApprove} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all"
        style={approved === true ? { backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
        {approved === true ? `✓ ${approveLabel}` : approveLabel}
      </button>
      <button onClick={onReject} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all"
        style={approved === false ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#fca5a5" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
        {approved === false ? `✗ ${rejectLabel}` : rejectLabel}
      </button>
    </div>
  );
}

// ── Streams Tab ────────────────────────────────────────────────────────────────
function StreamsTab({ trainerId, responses, assignedUnits, experienceData, onAssignmentChange }) {
  const [streams, setStreams] = useState([]);
  const [streamUnits, setStreamUnits] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterQual, setFilterQual] = useState("All");
  const [loading, setLoading] = useState(true);
  const [expandedStream, setExpandedStream] = useState(null);

  const yesSet = new Set(responses.filter((r) => r.response === "yes").map((r) => r.unit_code));
  const assignedSet = new Set(assignedUnits.map((a) => a.unit_code));

  useEffect(() => { fetchStreams(); }, []);

  useEffect(() => {
    if (Object.keys(streamUnits).length === 0) return;
    const preSelected = new Set();
    streams.forEach((s) => { const units = streamUnits[s.id] || []; if (units.length > 0 && units.every((u) => assignedSet.has(u))) preSelected.add(s.id); });
    setSelected(preSelected);
  }, [assignedUnits, streamUnits]);

  const fetchStreams = async () => {
    const { data: streamData } = await supabase.from("streams").select("*").order("qualification_code").order("stream_name");
    if (!streamData) { setLoading(false); return; }
    setStreams(streamData);
    const { data: suData } = await supabase.from("stream_units").select("stream_id, unit_code");
    const map = {};
    (suData || []).forEach((row) => { if (!map[row.stream_id]) map[row.stream_id] = []; map[row.stream_id].push(row.unit_code); });
    setStreamUnits(map); setLoading(false);
  };

  const toggleStream = (streamId) => { setSelected((prev) => { const next = new Set(prev); next.has(streamId) ? next.delete(streamId) : next.add(streamId); return next; }); setSaved(false); };

  const handleSave = async () => {
    setSaving(true);
    const unitCodes = new Set();
    selected.forEach((streamId) => (streamUnits[streamId] || []).forEach((code) => unitCodes.add(code)));
    await supabase.from("assigned_units").delete().eq("trainer_id", trainerId);
    if (unitCodes.size > 0) await supabase.from("assigned_units").insert([...unitCodes].map((code) => ({ trainer_id: trainerId, unit_code: code })));
    setSaved(true); setSaving(false); onAssignmentChange();
  };

  const getStreamCoverage = (streamId) => { const units = streamUnits[streamId] || []; if (units.length === 0) return { pct: 0, yes: 0, total: 0 }; const yes = units.filter((u) => yesSet.has(u)).length; return { pct: Math.round((yes / units.length) * 100), yes, total: units.length }; };

  const quals = [...new Set(streams.map((s) => s.qualification_code))].sort();
  const filtered = filterQual === "All" ? streams : streams.filter((s) => s.qualification_code === filterQual);
  const grouped = {};
  filtered.forEach((s) => { if (!grouped[s.qualification_code]) grouped[s.qualification_code] = []; grouped[s.qualification_code].push(s); });
  const selectedUnitCount = new Set([...selected].flatMap((sid) => streamUnits[sid] || [])).size;

  if (loading) return <div className="flex items-center justify-center py-12"><p className="text-sm text-gray-400">Loading streams...</p></div>;

  return (
    <div>
      <div className="rounded-xl p-5 mb-5 flex items-center gap-6" style={{ backgroundColor: "#081a47" }}>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Stream Assignment</p>
          <p className="text-sm text-white">Select the streams this trainer should complete for Section 6.</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-white">{selected.size}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>stream{selected.size !== 1 ? "s" : ""} selected</p>
          {selected.size > 0 && <p className="text-xs mt-1" style={{ color: "#65f6cc" }}>{selectedUnitCount} units assigned</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["All", ...quals].map((q) => (
          <button key={q} onClick={() => setFilterQual(q)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={filterQual === q ? { backgroundColor: "#081a47", color: "#fff", borderColor: "#081a47" } : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {q === "All" ? "All qualifications" : q}
          </button>
        ))}
      </div>
      {Object.entries(grouped).map(([qual, qualStreams]) => (
        <div key={qual} className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "#16406f" }}>{qual}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {qualStreams.map((stream) => {
              const cov = getStreamCoverage(stream.id);
              const isSelected = selected.has(stream.id);
              const streamUnitCodes = streamUnits[stream.id] || [];
              const allApproved = streamUnitCodes.length > 0 && streamUnitCodes.every((u) => experienceData.find((e) => e.unit_code === u && e.competency_confirmed === true));
              const anyNotApproved = streamUnitCodes.some((u) => experienceData.find((e) => e.unit_code === u && e.competency_confirmed === false));
              const approvedCount = streamUnitCodes.filter((u) => experienceData.find((e) => e.unit_code === u && e.competency_confirmed === true)).length;
              const isAssigned = streamUnitCodes.length > 0 && streamUnitCodes.every((u) => assignedSet.has(u));
              let cardBg = "#fff", cardBorder = "#e5e7eb";
              if (allApproved) { cardBg = "#f0fdf4"; cardBorder = "#86efac"; }
              else if (anyNotApproved) { cardBg = "#fef2f2"; cardBorder = "#fca5a5"; }
              else if (isSelected) { cardBg = "#eff6ff"; cardBorder = "#1c5ea8"; }
              else if (cov.pct === 100) { cardBg = "#f8faff"; cardBorder = "#bfdbfe"; }
              let barColor = "#c93535";
              if (allApproved) barColor = "#16a34a";
              else if (cov.pct === 100) barColor = "#1c5ea8";
              else if (cov.pct >= 60) barColor = "#e8a020";
              return (
                <button key={stream.id} onClick={() => toggleStream(stream.id)} className="text-left rounded-xl p-4 transition-all border-2" style={{ borderColor: cardBorder, backgroundColor: cardBg }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{stream.stream_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{stream.total_units} units</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ borderColor: allApproved ? "#16a34a" : isSelected ? "#1c5ea8" : "#d1d5db", backgroundColor: allApproved ? "#16a34a" : isSelected ? "#1c5ea8" : "transparent" }}>
                      {(allApproved || isSelected) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </div>
                  <div className="mb-1.5">
                    <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Trainer experience</span><span className="text-xs font-semibold" style={{ color: barColor }}>{cov.yes}/{cov.total} units</span></div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${cov.pct}%`, backgroundColor: barColor }} /></div>
                  </div>
                  {streamUnitCodes.length > 0 && (
                    <div className="mb-1.5">
                      <div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Quality approved</span><span className="text-xs font-semibold" style={{ color: allApproved ? "#16a34a" : "#6b7280" }}>{approvedCount}/{streamUnitCodes.length} units</span></div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${Math.round((approvedCount / streamUnitCodes.length) * 100)}%`, backgroundColor: allApproved ? "#16a34a" : "#32ba9a" }} /></div>
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {allApproved && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>✓ Quality Approved</span>}
                    {!allApproved && cov.pct === 100 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dbeafe", color: "#1c5ea8" }}>✓ Full experience</span>}
                    {cov.pct >= 60 && cov.pct < 100 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdf3e0", color: "#b8711a" }}>Partial experience</span>}
                    {cov.pct < 60 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>Limited experience</span>}
                    {isAssigned && !allApproved && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>Assigned</span>}
                  </div>
                  <button className="w-full mt-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                    onClick={(e) => { e.stopPropagation(); setExpandedStream(expandedStream === stream.id ? null : stream.id); }}>
                    {expandedStream === stream.id ? "▲ Hide units" : "▼ Show units"}
                  </button>
                  {expandedStream === stream.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1" onClick={(e) => e.stopPropagation()}>
                      {streamUnitCodes.map((code) => {
                        const unit = UNITS.find((u) => u.code === code);
                        const exp = experienceData.find((e) => e.unit_code === code);
                        const isApproved = exp?.competency_confirmed === true;
                        const isNotApproved = exp?.competency_confirmed === false;
                        const hasExp = yesSet.has(code);
                        return (
                          <div key={code} className="flex items-center gap-2 px-1 py-1 rounded" style={{ backgroundColor: isApproved ? "#f0fdf4" : isNotApproved ? "#fef2f2" : "#f9fafb" }}>
                            <span className="text-xs font-bold font-mono flex-shrink-0" style={{ color: isApproved ? "#166634" : isNotApproved ? "#c93535" : hasExp ? "#1c5ea8" : "#9ca3af" }}>{code}</span>
                            <span className="text-xs text-gray-500 flex-1 truncate">{unit?.title}</span>
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: isApproved ? "#166634" : isNotApproved ? "#c93535" : hasExp ? "#1c5ea8" : "#9ca3af" }}>
                              {isApproved ? "✓" : isNotApproved ? "✗" : hasExp ? "~" : "—"}
                            </span>
                          </div>
                        );
                      })}
                      <div className="flex gap-3 pt-1 text-xs text-gray-400">
                        <span style={{ color: "#166634" }}>✓ Approved</span><span style={{ color: "#c93535" }}>✗ Not approved</span><span style={{ color: "#1c5ea8" }}>~ Experience</span><span>— None</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 pb-4">
        <p className="text-xs text-gray-400">{selected.size === 0 ? "No streams selected" : `${selectedUnitCount} units will be assigned across ${selected.size} stream${selected.size !== 1 ? "s" : ""}`}</p>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: saving ? "#9ca3af" : "#1c5ea8" }}>
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Stream Assignment"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [savingCredApproval, setSavingCredApproval] = useState(false);
  const [savingQualsApproval, setSavingQualsApproval] = useState(false);
  const [assignedUnits, setAssignedUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => { fetchAll(); }, [id]);

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
    setTrainer(trainerData); setTrainerProfile(profileData); setQuestionnaireResponses(responses || []); setExperienceData(expData || []); setIndustryQuals(quals || []); setEvidenceFiles(files || []); setAssignedUnits(assigned || []); setLoading(false);
  };

  const updateQualsApproval = async (approved) => {
    setSavingQualsApproval(true);
    await supabase.from("trainer_profiles").upsert({ trainer_id: id, industry_quals_approved: approved, reviewed_by: adminProfile?.full_name, reviewed_at: new Date().toISOString() }, { onConflict: "trainer_id" });
    await fetchAll(); setSavingQualsApproval(false);
  };

  const updateCredentialApproval = async (approved) => {
    setSavingCredApproval(true);
    await supabase.from("trainer_profiles").update({ profile_status: approved ? "Approved" : "Rejected", reviewed_by: adminProfile?.full_name, reviewed_at: new Date().toISOString() }).eq("trainer_id", id);
    await fetchAll(); setSavingCredApproval(false);
  };

  const updateStatus = async (status) => {
    setSaving(true);
    const { error } = await supabase.from("trainers").update({ compliance_status: status }).eq("id", id);
    if (!error) {
      setTrainer((prev) => ({ ...prev, compliance_status: status }));
      if (trainerProfile) await supabase.from("trainer_profiles").update({ profile_status: status === "Compliant" ? "Approved" : "Under Review", reviewed_by: adminProfile?.full_name, reviewed_at: new Date().toISOString(), review_notes: statusNote }).eq("trainer_id", id);
    }
    setSaving(false); setShowStatusModal(false); setStatusNote("");
  };

  const profilePct = calcProfilePct(trainer, trainerProfile);
  const questPct = calcQuestionnairePct(questionnaireResponses);
  const expPct = calcExperiencePct(questionnaireResponses, experienceData, assignedUnits);
  const answeredCount = questionnaireResponses.filter((r) => r.response).length;
  const overallPct = Math.round((profilePct + questPct + (expPct ?? 0)) / 3);

  // Derived approval states for section headers and tab icons
  const profileStatus = trainerProfile?.profile_status;
  const credApprovalStatus = profileStatus === "Approved" ? "approved" : profileStatus === "Rejected" ? "rejected" : (trainerProfile?.tae_qualification || trainerProfile?.under_direction_qualification) ? "pending" : null;
  const qualsApprovalStatus = trainerProfile?.industry_quals_approved === true ? "approved" : trainerProfile?.industry_quals_approved === false ? "rejected" : industryQuals.length > 0 ? "pending" : null;

  const expAllApproved = assignedUnits.length > 0 && assignedUnits.every((a) => experienceData.find((e) => e.unit_code === a.unit_code && e.competency_confirmed === true));
  const expAnyRejected = experienceData.some((e) => e.competency_confirmed === false);
  const expHasUpdates = experienceData.some((e) => e.competency_confirmed === null && Object.values(e.element_descriptions || {}).some((v) => v?.trim()));

  const getTabIcon = (tabId) => {
    if (tabId === "profile") {
      if (credApprovalStatus === "approved" && qualsApprovalStatus === "approved") return { icon: "✓", color: "#16a34a" };
      if (credApprovalStatus === "rejected" || qualsApprovalStatus === "rejected") return { icon: "✗", color: "#c93535" };
      if (credApprovalStatus === "pending" || qualsApprovalStatus === "pending") return { icon: "⚠", color: "#e8a020" };
      return null;
    }
    if (tabId === "questionnaire") return questPct === 100 ? { icon: "✓", color: "#16a34a" } : null;
    if (tabId === "streams") return assignedUnits.length > 0 ? { icon: "✓", color: "#16a34a" } : null;
    if (tabId === "experience") {
      if (expAllApproved) return { icon: "✓", color: "#16a34a" };
      if (expAnyRejected && !expHasUpdates) return { icon: "✗", color: "#c93535" };
      if (expHasUpdates) return { icon: "⚠", color: "#e8a020" };
      return null;
    }
    if (tabId === "evidence") return evidenceFiles.length > 0 ? { icon: "✓", color: "#16a34a" } : null;
    return null;
  };

  const TABS = [
    { id: "profile", label: "Profile & Credentials" },
    { id: "questionnaire", label: "Skills Questionnaire" },
    { id: "streams", label: "Stream Assignment" },
    { id: "experience", label: "Industry Experience" },
    { id: "evidence", label: "Evidence" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-400">Loading trainer...</p></div>;
  if (!trainer) return <div className="text-center py-20"><p className="text-sm text-gray-400 mb-3">Trainer not found</p><button onClick={() => navigate("/trainers")} className="text-sm font-medium" style={{ color: "#1c5ea8" }}>← Back to trainers</button></div>;

  const initials = trainer.full_name ? trainer.full_name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  const statusStyle = STATUS_STYLES[trainer.compliance_status] || STATUS_STYLES["Incomplete"];
  const taeFiles = evidenceFiles.filter((f) => f.document_type === "TAE Credential" || f.document_type === "TAE Enrolment Evidence");
  const industryFiles = evidenceFiles.filter((f) => f.document_type === "Industry Qualification");

  return (
    <div>
      <button onClick={() => navigate("/trainers")} className="flex items-center gap-2 text-sm mb-5 transition-colors" style={{ color: "#1c5ea8" }}>← Back to trainers</button>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{initials}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-gray-800">{trainer.full_name}</h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>{trainer.compliance_status || "Incomplete"}</span>
          </div>
          <p className="text-sm text-gray-400">{trainer.email}</p>
          <p className="text-sm text-gray-400">{trainer.position || "Position not set"} · {trainer.employment_status || "Employment not set"}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${overallPct}%`, backgroundColor: overallPct >= 100 ? "#32ba9a" : overallPct >= 60 ? "#e8a020" : "#c93535" }} />
            </div>
            <span className="text-xs font-semibold text-gray-500">{overallPct}% overall</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setNewStatus("Compliant"); setShowStatusModal(true); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: trainer.compliance_status === "Compliant" ? "#16a34a" : "#6b7280" }}>
            {trainer.compliance_status === "Compliant" ? "✓ Compliant" : "Mark Compliant"}
          </button>
          <button onClick={() => { setNewStatus("Under Review"); setShowStatusModal(true); }} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
            style={trainer.compliance_status === "Under Review" ? { backgroundColor: "#e6f0ff", color: "#1c5ea8", borderColor: "#93c5fd" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
            {trainer.compliance_status === "Under Review" ? "🔍 Under Review" : "Under Review"}
          </button>
          <button onClick={() => { setNewStatus("Incomplete"); setShowStatusModal(true); }} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
            style={trainer.compliance_status === "Incomplete" ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#fca5a5" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
            Incomplete
          </button>
        </div>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <CompletionCard title="Sections 1–4 — Profile" value={profilePct} sub={profilePct === 0 ? "Not started" : profilePct === 100 ? "Complete" : "In progress"} icon="📄" />
        <CompletionCard title="Section 5 — Questionnaire" value={questPct} sub={`${answeredCount} of ${UNITS.length} units answered`} icon="📋" />
        <CompletionCard title="Section 6 — Experience" value={expPct ?? 0} sub={expPct === null ? "Awaiting stream assignment" : expPct === 100 ? `All ${assignedUnits.length} units assessed` : `${experienceData.filter((e) => e.competency_confirmed !== null).length} of ${assignedUnits.length} units assessed`} icon="🔬" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {TABS.map((tab) => {
          const tabIcon = getTabIcon(tab.id);
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
              style={activeTab === tab.id ? { backgroundColor: "#fff", color: "#081a47", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { backgroundColor: "transparent", color: "#6b7280" }}>
              <span className="flex items-center justify-center gap-1.5">
                {tabIcon && <span className="text-xs font-bold" style={{ color: tabIcon.color }}>{tabIcon.icon}</span>}
                {tab.label}
                {tab.id === "streams" && assignedUnits.length > 0 && !tabIcon && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{assignedUnits.length}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── PROFILE & CREDENTIALS TAB ── */}
      {activeTab === "profile" && (
        <>
          {/* Section 1 — personal details, 3 columns */}
          <Section title="Section 1 — Personal Details">
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <DetailCell label="Full Name" value={trainer.full_name} />
              <DetailCell label="Email" value={trainer.email} />
              <DetailCell label="Phone" value={trainer.phone} />
              <DetailCell label="Position" value={trainer.position} />
              <DetailCell label="Employment Status" value={trainer.employment_status} />
              <DetailCell label="State" value={trainer.state} />
            </div>
          </Section>

          {/* Section 2 — training credentials with approval status in header */}
          <Section title="Section 2 — Training Credentials"
            statusBadge={<SectionStatusBadge status={credApprovalStatus} />}>
            {trainerProfile?.tae_qualification || trainerProfile?.under_direction_qualification ? (
              <>
                {trainerProfile.tae_qualification && (
                  <div className="grid grid-cols-4 gap-x-6 gap-y-4 mb-4">
                    <DetailCell label="TAE Qualification" value={trainerProfile.tae_qualification} />
                    <DetailCell label="Provider Name" value={trainerProfile.tae_provider} />
                    <DetailCell label="Provider ID" value={trainerProfile.tae_provider_id} />
                    <DetailCell label="Issue Date" value={trainerProfile.tae_issue_date} />
                  </div>
                )}
                {trainerProfile.under_direction_qualification && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-2 pt-2 border-t border-gray-100">Under Direction</p>
                    <div className="grid grid-cols-4 gap-x-6 gap-y-4 mb-4">
                      <DetailCell label="Qualification" value={trainerProfile.under_direction_qualification} />
                      <DetailCell label="Provider Name" value={trainerProfile.under_direction_provider} />
                      <DetailCell label="Provider ID" value={trainerProfile.under_direction_provider_id} />
                      <DetailCell label="Commencement" value={trainerProfile.under_direction_commencement} />
                    </div>
                  </>
                )}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Uploaded Evidence</p>
                    <AdminUpload trainerId={id} documentType="TAE Credential" onDone={fetchAll} />
                  </div>
                  <FileList files={taeFiles} emptyMessage="No credential file uploaded yet" />
                </div>
                <ApprovalButtons
                  approved={profileStatus === "Approved" ? true : profileStatus === "Rejected" ? false : null}
                  onApprove={() => updateCredentialApproval(true)}
                  onReject={() => updateCredentialApproval(false)}
                  saving={savingCredApproval}
                  approveLabel="Approve Credentials"
                  rejectLabel="Not Approved"
                />
              </>
            ) : (
              <p className="text-sm text-gray-400">Trainer has not submitted their profile yet</p>
            )}
          </Section>

          {/* Section 3 — industry quals with approval status in header */}
          <Section title="Section 3 — Industry Competencies"
            statusBadge={<SectionStatusBadge status={qualsApprovalStatus} />}
            action={<span className="text-xs text-white opacity-60">{industryQuals.length} qualification{industryQuals.length !== 1 ? "s" : ""}</span>}>
            {industryQuals.length === 0 ? (
              <p className="text-sm text-gray-400">No industry qualifications submitted yet</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Code", "Title", "Provider Name", "Provider ID", "Issue Date"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>
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
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Certificates</p>
                    <AdminUpload trainerId={id} documentType="Industry Qualification" onDone={fetchAll} />
                  </div>
                  <FileList files={industryFiles} emptyMessage="No certificates uploaded yet" />
                </div>
                <ApprovalButtons
                  approved={trainerProfile?.industry_quals_approved === true ? true : trainerProfile?.industry_quals_approved === false ? false : null}
                  onApprove={() => updateQualsApproval(true)}
                  onReject={() => updateQualsApproval(false)}
                  saving={savingQualsApproval}
                  approveLabel="Approve Industry Quals"
                  rejectLabel="Not Approved"
                />
              </>
            )}
          </Section>

          {/* Section 4 — declaration, 1 row */}
          <Section title="Section 4 — Credentials Declaration">
            {trainerProfile ? (
              <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                <DetailCell label="Credentials Declared" value={trainerProfile.declaration_credentials ? "✓ Confirmed" : "Not confirmed"} />
                <DetailCell label="Copies Provided" value={trainerProfile.declaration_copies ? "✓ Confirmed" : "Not confirmed"} />
                <DetailCell label="Signature" value={trainerProfile.declaration_signature} />
                <DetailCell label="Date" value={trainerProfile.declaration_date} />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Trainer has not submitted their declaration yet</p>
            )}
          </Section>
        </>
      )}

      {/* ── QUESTIONNAIRE TAB ── */}
      {activeTab === "questionnaire" && (
        <Section title="Section 5 — Skills Questionnaire"
          action={<span className="text-xs text-white opacity-60">{answeredCount} of {UNITS.length} answered</span>}>
          {questionnaireResponses.length === 0 ? (
            <p className="text-sm text-gray-400">Trainer has not completed the questionnaire yet</p>
          ) : (
            <div className="grid grid-cols-6 gap-1.5">
              {[...questionnaireResponses].sort((a, b) => a.unit_code.localeCompare(b.unit_code)).map((r) => {
                const expEntry = experienceData.find((e) => e.unit_code === r.unit_code);
                const approved = r.response === "yes" && expEntry?.competency_confirmed === true;
                const notApproved = r.response === "yes" && expEntry?.competency_confirmed === false;
                const experienced = r.response === "yes" && expEntry?.competency_confirmed == null;
                let bg, border, codeColor, pillBg, pillColor, pillLabel;
                if (approved) { bg = "#f0fdf4"; border = "#86efac"; codeColor = "#166534"; pillBg = "#dcfce7"; pillColor = "#166534"; pillLabel = "✓ Approved"; }
                else if (notApproved) { bg = "#fef2f2"; border = "#fca5a5"; codeColor = "#c93535"; pillBg = "#fdeaea"; pillColor = "#c93535"; pillLabel = "✗ Not Approved"; }
                else if (experienced) { bg = "#eff6ff"; border = "#bfdbfe"; codeColor = "#1c5ea8"; pillBg = "#dbeafe"; pillColor = "#1c5ea8"; pillLabel = "Experience"; }
                else { bg = "#fafafa"; border = "#e5e7eb"; codeColor = "#9ca3af"; pillBg = "#f3f4f6"; pillColor = "#9ca3af"; pillLabel = "No Experience"; }
                return (
                  <div key={r.id} className="flex flex-col gap-1 rounded-lg px-2.5 py-2 border" style={{ backgroundColor: bg, borderColor: border }}>
                    <span className="text-xs font-bold font-mono" style={{ color: codeColor }}>{r.unit_code}</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-center" style={{ backgroundColor: pillBg, color: pillColor }}>{pillLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {activeTab === "streams" && <StreamsTab trainerId={id} responses={questionnaireResponses} assignedUnits={assignedUnits} experienceData={experienceData} onAssignmentChange={fetchAll} />}
      {activeTab === "experience" && <ExperienceTab trainerId={id} assignedUnits={assignedUnits} experienceData={experienceData} adminProfile={adminProfile} onUpdate={fetchAll} />}

      {/* ── EVIDENCE TAB ── */}
      {activeTab === "evidence" && (
        <Section title="Evidence Documents"
          action={<span className="text-xs text-white opacity-60">{evidenceFiles.length} file{evidenceFiles.length !== 1 ? "s" : ""}</span>}>
          {evidenceFiles.length === 0 ? <p className="text-sm text-gray-400">No evidence files uploaded yet</p> : (
            <div className="divide-y divide-gray-100">
              {evidenceFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📎</span>
                    <div><p className="text-sm font-medium text-gray-800">{f.file_name}</p><p className="text-xs text-gray-400">{f.document_type}</p></div>
                  </div>
                  <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                    onClick={async () => { const { data } = await supabase.storage.from("evidence-files").createSignedUrl(f.file_path, 60); if (data) window.open(data.signedUrl, "_blank"); }}>View</button>
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
            <p className="text-sm text-gray-400 mb-5">Mark this trainer as <strong>{newStatus}</strong></p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
              <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Add any review notes..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" rows={3} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowStatusModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => updateStatus(newStatus)} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1c5ea8" }}>{saving ? "Saving..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}