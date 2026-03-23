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
    const mapped = {}, initialCollapsed = {};
    experienceData.forEach((e) => {
      mapped[e.unit_code] = {
        competency_confirmed: e.competency_confirmed,
        holds_unit: e.holds_unit || false,
        quality_notes: e.quality_notes || "",
        professional_development: e.professional_development || "",
        element_descriptions: e.element_descriptions || {},
        trainer_updated_at: e.trainer_updated_at || null,
        reviewed_at: e.reviewed_at || null,
      };
      if (e.competency_confirmed !== null && e.competency_confirmed !== undefined) initialCollapsed[e.unit_code] = true;
    });
    setLocalExp(mapped);
    setCollapsed((prev) => ({ ...initialCollapsed, ...prev }));
  }, [experienceData]);

  const unitsToShow = assignedUnits.map((a) => UNITS.find((u) => u.code === a.unit_code)).filter(Boolean).sort((a, b) => a.code.localeCompare(b.code));

  const unitHasChanges = (unitCode) => {
    const exp = localExp[unitCode];
    if (!exp || !exp.trainer_updated_at) return false;
    if (!exp.reviewed_at) return exp.competency_confirmed !== null; // reviewed but no timestamp recorded yet
    return new Date(exp.trainer_updated_at) > new Date(exp.reviewed_at);
  };

  const changedUnits = unitsToShow.filter((u) => unitHasChanges(u.code));
  const completedCount = experienceData.filter((e) => {
    const unit = UNITS.find((u) => u.code === e.unit_code);
    if (!unit) return false;
    if (unit.elements.length === 0) return !!e.professional_development?.trim();
    return unit.elements.every((_, i) => (e.element_descriptions || {})[i]?.trim());
  }).length;

  const saveUnit = async (unitCode) => {
    setSaving((prev) => ({ ...prev, [unitCode]: true }));
    const data = localExp[unitCode] || {};
    const now = new Date().toISOString();
    // Only save the assessment decision — never overwrite trainer content
    const payload = {
      competency_confirmed: data.competency_confirmed,
      holds_unit: data.holds_unit ?? false,
      quality_notes: data.quality_notes || null,
      reviewed_by: adminProfile?.full_name || null,
      reviewed_at: now,
    };
    const { data: updated, error } = await supabase.from("industry_experience").update(payload).eq("trainer_id", trainerId).eq("unit_code", unitCode).select();
    if (!error && (!updated || updated.length === 0)) {
      // Row doesn't exist yet — insert
      await supabase.from("industry_experience").upsert({ trainer_id: trainerId, unit_code: unitCode, unit_title: UNITS.find((u) => u.code === unitCode)?.title || "", element_descriptions: {}, ...payload }, { onConflict: "trainer_id,unit_code" });
    }
    // Update local reviewed_at so "changed" badge clears
    setLocalExp((prev) => ({ ...prev, [unitCode]: { ...prev[unitCode], reviewed_at: now } }));
    setSaving((prev) => ({ ...prev, [unitCode]: false }));
    setCollapsed((prev) => ({ ...prev, [unitCode]: true }));
    // Scroll to next unit needing review
    setTimeout(() => {
      const allCodes = unitsToShow.map((u) => u.code);
      const currentIdx = allCodes.indexOf(unitCode);
      const nextCode = allCodes.slice(currentIdx + 1).find((code) => {
        const e = localExp[code] || {};
        return e.competency_confirmed === null || e.competency_confirmed === undefined || unitHasChanges(code);
      }) || allCodes[currentIdx + 1];
      if (nextCode) { const el = document.getElementById(`unit-card-${nextCode}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }, 150);
    onUpdate();
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
          {changedUnits.length > 0 && <p className="text-xs font-semibold mt-1" style={{ color: "#7c3aed" }}>↺ {changedUnits.length} unit{changedUnits.length !== 1 ? "s" : ""} updated by trainer — need re-review only</p>}
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div><p className="text-xl font-bold" style={{ color: "#16a34a" }}>{Object.values(localExp).filter((e) => e.competency_confirmed === true).length}</p><p className="text-xs text-gray-400">Approved</p></div>
          <div><p className="text-xl font-bold" style={{ color: "#c93535" }}>{Object.values(localExp).filter((e) => e.competency_confirmed === false).length}</p><p className="text-xs text-gray-400">Not approved</p></div>
          <div><p className="text-xl font-bold" style={{ color: "#7c3aed" }}>{changedUnits.length}</p><p className="text-xs text-gray-400">Pending review</p></div>
          <div><p className="text-xl font-bold" style={{ color: "#32ba9a" }}>{Object.values(localExp).filter((e) => e.holds_unit).length}</p><p className="text-xs text-gray-400">Holds unit</p></div>
        </div>
      </div>

      {changedUnits.length > 0 && (
        <div className="rounded-xl p-4 mb-5 border" style={{ backgroundColor: "#f5f3ff", borderColor: "#c4b5fd" }}>
          <div className="flex items-center gap-3">
            <span className="text-lg">↺</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#6d28d9" }}>Trainer updated {changedUnits.length} unit{changedUnits.length !== 1 ? "s" : ""} since last review</p>
              <p className="text-xs text-gray-500 mt-0.5">Only these units require re-assessment. All other approvals are preserved.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {unitsToShow.map((unit) => {
          const exp = localExp[unit.code] || {};
          const submitted = experienceData.find((e) => e.unit_code === unit.code);
          const descs = submitted?.element_descriptions || {};
          const isCollapsed = collapsed[unit.code];
          const hasChanges = unitHasChanges(unit.code);
          let cardBorder = "#e5e7eb", collapsedBg = "#f9fafb";
          if (hasChanges) { cardBorder = "#c4b5fd"; collapsedBg = "#f5f3ff"; }
          else if (exp.competency_confirmed === true) { cardBorder = "#bfdbfe"; collapsedBg = "#eff6ff"; }
          else if (exp.competency_confirmed === false) { cardBorder = "#fca5a5"; collapsedBg = "#fef2f2"; }

          return (
            <div key={unit.code} id={`unit-card-${unit.code}`} className="bg-white border rounded-xl overflow-hidden"
              style={isCollapsed ? { borderColor: cardBorder } : { borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none"
                style={{ backgroundColor: isCollapsed ? collapsedBg : "#f9fafb", borderBottom: isCollapsed ? "none" : "1px solid #f3f4f6" }}
                onClick={() => setCollapsed((prev) => ({ ...prev, [unit.code]: !prev[unit.code] }))}>
                <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{unit.code}</span>
                <span className="text-sm font-medium text-gray-800 flex-1">{unit.title}</span>
                {hasChanges && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>↺ Updated</span>}
                {exp.holds_unit && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>Holds unit</span>}
                {!hasChanges && exp.competency_confirmed === true && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>✓ Approved</span>}
                {!hasChanges && exp.competency_confirmed === false && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>✗ Not Approved</span>}
                <span className="text-gray-400 text-xs ml-1 flex-shrink-0">{isCollapsed ? "▾" : "▴"}</span>
              </div>

              {!isCollapsed && (
                <div className="p-5">
                  {hasChanges && (
                    <div className="rounded-xl p-3 mb-4 border" style={{ backgroundColor: "#f5f3ff", borderColor: "#c4b5fd" }}>
                      <p className="text-xs font-semibold" style={{ color: "#7c3aed" }}>↺ Trainer updated this unit since last review — please re-assess below</p>
                    </div>
                  )}
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
                        <p className="text-xs font-medium text-gray-500 mb-2">Competency Decision</p>
                        <div className="flex gap-2">
                          <button onClick={() => update(unit.code, "competency_confirmed", true)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={exp.competency_confirmed === true ? { backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                            ✓ Approved
                          </button>
                          <button onClick={() => update(unit.code, "competency_confirmed", false)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={exp.competency_confirmed === false ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#fca5a5" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                            ✗ Not Approved
                          </button>
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
                          style={{ backgroundColor: saving[unit.code] ? "#9ca3af" : "#1c5ea8" }}>
                          {saving[unit.code] ? "Saving..." : "Save assessment"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <textarea value={exp.quality_notes || ""} onChange={(e) => update(unit.code, "quality_notes", e.target.value)}
                        placeholder="Quality notes (visible to trainer if not approved)..."
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

function SectionStatusBadge({ status }) {
  if (status === "approved") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>✓ Approved</span>;
  if (status === "rejected") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>✗ Not Approved</span>;
  if (status === "pending") return <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdf3e0", color: "#92500a" }}>⏳ Awaiting Approval</span>;
  return <span className="text-xs text-white opacity-50">Not submitted</span>;
}

function Section({ title, children, action, statusBadge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
      <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "#081a47" }}>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-3">{statusBadge}{action && <div>{action}</div>}</div>
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
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} /></div>
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

function calcProfilePct(trainer, tp) {
  const f = [trainer?.full_name, trainer?.state, trainer?.position, trainer?.employment_status, trainer?.phone, tp?.tae_qualification, tp?.tae_provider, tp?.tae_issue_date, tp?.declaration_credentials, tp?.declaration_copies, tp?.declaration_signature, tp?.declaration_date];
  return Math.round((f.filter(Boolean).length / f.length) * 100);
}
function calcQuestionnairePct(r) { return Math.round((r.filter((x) => x.response).length / UNITS.length) * 100); }
function calcExperiencePct(responses, expData, assigned) {
  if (!assigned || assigned.length === 0) return null;
  return Math.round((assigned.filter((a) => expData.find((e) => e.unit_code === a.unit_code && e.competency_confirmed !== null)).length / assigned.length) * 100);
}

function AdminUpload({ trainerId, documentType, onDone }) {
  const [uploading, setUploading] = useState(false);
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
      {uploading ? "Uploading..." : (<><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9V2M6 2L3.5 4.5M6 2l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v.5a1 1 0 001 1h8a1 1 0 001-1v-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>Upload</>)}
      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={uploading}
        onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return; setUploading(true);
          const path = `${trainerId}/${documentType.replace(/[^a-zA-Z0-9]/g, "_")}_admin_${Date.now()}.${f.name.split(".").pop()}`;
          const { error } = await supabase.storage.from("evidence-files").upload(path, f);
          if (!error) { await supabase.from("evidence_files").insert({ trainer_id: trainerId, file_name: f.name, file_path: path, file_size: f.size, document_type: documentType }); onDone?.(); }
          setUploading(false);
        }} />
    </label>
  );
}

function FileList({ files, emptyMessage }) {
  if (files.length === 0) return <p className="text-xs text-amber-600 p-2 rounded" style={{ backgroundColor: "#fdf3e0" }}>⚠ {emptyMessage}</p>;
  return (
    <div className="space-y-1.5">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
          <span className="text-sm">📎</span><span className="text-sm text-gray-700 flex-1">{f.file_name}</span>
          <button onClick={async () => { const { data } = await supabase.storage.from("evidence-files").createSignedUrl(f.file_path, 120); if (data?.signedUrl) window.open(data.signedUrl, "_blank"); }}
            className="text-xs font-medium px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100">View</button>
        </div>
      ))}
    </div>
  );
}

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
    if (!Object.keys(streamUnits).length) return;
    const pre = new Set();
    streams.forEach((s) => { const u = streamUnits[s.id] || []; if (u.length && u.every((c) => assignedSet.has(c))) pre.add(s.id); });
    setSelected(pre);
  }, [assignedUnits, streamUnits]);

  const fetchStreams = async () => {
    const { data: sd } = await supabase.from("streams").select("*").order("qualification_code").order("stream_name");
    if (!sd) { setLoading(false); return; }
    setStreams(sd);
    const { data: su } = await supabase.from("stream_units").select("stream_id, unit_code");
    const map = {};
    (su || []).forEach((r) => { if (!map[r.stream_id]) map[r.stream_id] = []; map[r.stream_id].push(r.unit_code); });
    setStreamUnits(map); setLoading(false);
  };

  const toggleStream = (id) => { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); setSaved(false); };
  const handleSave = async () => {
    setSaving(true);
    const codes = new Set([...selected].flatMap((sid) => streamUnits[sid] || []));
    await supabase.from("assigned_units").delete().eq("trainer_id", trainerId);
    if (codes.size) await supabase.from("assigned_units").insert([...codes].map((c) => ({ trainer_id: trainerId, unit_code: c })));
    setSaved(true); setSaving(false); onAssignmentChange();
  };
  const getCov = (sid) => { const u = streamUnits[sid] || []; if (!u.length) return { pct: 0, yes: 0, total: 0 }; const y = u.filter((c) => yesSet.has(c)).length; return { pct: Math.round((y / u.length) * 100), yes: y, total: u.length }; };
  const quals = [...new Set(streams.map((s) => s.qualification_code))].sort();
  const filtered = filterQual === "All" ? streams : streams.filter((s) => s.qualification_code === filterQual);
  const grouped = {};
  filtered.forEach((s) => { if (!grouped[s.qualification_code]) grouped[s.qualification_code] = []; grouped[s.qualification_code].push(s); });
  const selCount = new Set([...selected].flatMap((sid) => streamUnits[sid] || [])).size;

  if (loading) return <div className="flex items-center justify-center py-12"><p className="text-sm text-gray-400">Loading streams...</p></div>;

  return (
    <div>
      <div className="rounded-xl p-5 mb-5 flex items-center gap-6" style={{ backgroundColor: "#081a47" }}>
        <div className="flex-1"><p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Stream Assignment</p><p className="text-sm text-white">Select streams for Section 6.</p></div>
        <div className="text-right flex-shrink-0"><p className="text-2xl font-bold text-white">{selected.size}</p><p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>stream{selected.size !== 1 ? "s" : ""} selected</p>{selected.size > 0 && <p className="text-xs mt-1" style={{ color: "#65f6cc" }}>{selCount} units</p>}</div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {["All", ...quals].map((q) => <button key={q} onClick={() => setFilterQual(q)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all" style={filterQual === q ? { backgroundColor: "#081a47", color: "#fff", borderColor: "#081a47" } : { backgroundColor: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{q === "All" ? "All qualifications" : q}</button>)}
      </div>
      {Object.entries(grouped).map(([qual, qualStreams]) => (
        <div key={qual} className="mb-5">
          <div className="flex items-center gap-3 mb-3"><span className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "#16406f" }}>{qual}</span><div className="flex-1 h-px bg-gray-200" /></div>
          <div className="grid grid-cols-4 gap-3">
            {qualStreams.map((stream) => {
              const cov = getCov(stream.id);
              const isSel = selected.has(stream.id);
              const codes = streamUnits[stream.id] || [];
              const allApp = codes.length > 0 && codes.every((c) => experienceData.find((e) => e.unit_code === c && e.competency_confirmed === true));
              const anyNotApp = codes.some((c) => experienceData.find((e) => e.unit_code === c && e.competency_confirmed === false));
              const appCount = codes.filter((c) => experienceData.find((e) => e.unit_code === c && e.competency_confirmed === true)).length;
              const isAssigned = codes.length > 0 && codes.every((c) => assignedSet.has(c));
              let bg = "#fff", border = "#e5e7eb";
              if (allApp) { bg = "#f0fdf4"; border = "#86efac"; }
              else if (anyNotApp) { bg = "#fef2f2"; border = "#fca5a5"; }
              else if (isSel) { bg = "#eff6ff"; border = "#1c5ea8"; }
              else if (cov.pct === 100) { bg = "#f8faff"; border = "#bfdbfe"; }
              let bar = cov.pct === 100 ? "#1c5ea8" : cov.pct >= 60 ? "#e8a020" : "#c93535";
              if (allApp) bar = "#16a34a";
              return (
                <button key={stream.id} onClick={() => toggleStream(stream.id)} className="text-left rounded-xl p-4 transition-all border-2" style={{ borderColor: border, backgroundColor: bg }}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 leading-snug">{stream.stream_name}</p><p className="text-xs text-gray-400 mt-0.5">{stream.total_units} units</p></div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: allApp ? "#16a34a" : isSel ? "#1c5ea8" : "#d1d5db", backgroundColor: allApp ? "#16a34a" : isSel ? "#1c5ea8" : "transparent" }}>
                      {(allApp || isSel) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </div>
                  <div className="mb-1.5"><div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Trainer experience</span><span className="text-xs font-semibold" style={{ color: bar }}>{cov.yes}/{cov.total}</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${cov.pct}%`, backgroundColor: bar }} /></div></div>
                  {codes.length > 0 && <div className="mb-1.5"><div className="flex justify-between mb-1"><span className="text-xs text-gray-400">Quality approved</span><span className="text-xs font-semibold" style={{ color: allApp ? "#16a34a" : "#6b7280" }}>{appCount}/{codes.length}</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round((appCount / codes.length) * 100)}%`, backgroundColor: allApp ? "#16a34a" : "#32ba9a" }} /></div></div>}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {allApp && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>✓ Approved</span>}
                    {!allApp && cov.pct === 100 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dbeafe", color: "#1c5ea8" }}>Full experience</span>}
                    {cov.pct >= 60 && cov.pct < 100 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdf3e0", color: "#b8711a" }}>Partial</span>}
                    {cov.pct < 60 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>Limited</span>}
                    {isAssigned && !allApp && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>Assigned</span>}
                  </div>
                  <button className="w-full mt-2 py-1 text-xs text-gray-400 hover:text-gray-600 text-center" onClick={(e) => { e.stopPropagation(); setExpandedStream(expandedStream === stream.id ? null : stream.id); }}>
                    {expandedStream === stream.id ? "▲ Hide units" : "▼ Show units"}
                  </button>
                  {expandedStream === stream.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1" onClick={(e) => e.stopPropagation()}>
                      {codes.map((code) => {
                        const unit = UNITS.find((u) => u.code === code);
                        const exp = experienceData.find((e) => e.unit_code === code);
                        const isApp = exp?.competency_confirmed === true, isNotApp = exp?.competency_confirmed === false, hasExp = yesSet.has(code);
                        return (
                          <div key={code} className="flex items-center gap-2 px-1 py-1 rounded" style={{ backgroundColor: isApp ? "#f0fdf4" : isNotApp ? "#fef2f2" : "#f9fafb" }}>
                            <span className="text-xs font-bold font-mono flex-shrink-0" style={{ color: isApp ? "#166534" : isNotApp ? "#c93535" : hasExp ? "#1c5ea8" : "#9ca3af" }}>{code}</span>
                            <span className="text-xs text-gray-500 flex-1 truncate">{unit?.title}</span>
                            <span className="text-xs font-semibold" style={{ color: isApp ? "#166534" : isNotApp ? "#c93535" : hasExp ? "#1c5ea8" : "#9ca3af" }}>{isApp ? "✓" : isNotApp ? "✗" : hasExp ? "~" : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2 pb-4">
        <p className="text-xs text-gray-400">{selected.size === 0 ? "No streams selected" : `${selCount} units across ${selected.size} stream${selected.size !== 1 ? "s" : ""}`}</p>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: saving ? "#9ca3af" : "#1c5ea8" }}>{saving ? "Saving..." : saved ? "✓ Saved" : "Save Stream Assignment"}</button>
      </div>
    </div>
  );
}

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
  const [savingS1, setSavingS1] = useState(false);
  const [savingS4, setSavingS4] = useState(false);
  const [savingCred, setSavingCred] = useState(false);
  const [savingQuals, setSavingQuals] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    const [{ data: td }, { data: pd }, { data: resp }, { data: exp }, { data: quals }, { data: files }, { data: assigned }] = await Promise.all([
      supabase.from("trainers").select("*").eq("id", id).single(),
      supabase.from("trainer_profiles").select("*").eq("trainer_id", id).maybeSingle(),
      supabase.from("questionnaire_responses").select("*").eq("trainer_id", id),
      supabase.from("industry_experience").select("*").eq("trainer_id", id),
      supabase.from("industry_qualifications").select("*").eq("trainer_id", id),
      supabase.from("evidence_files").select("*").eq("trainer_id", id),
      supabase.from("assigned_units").select("*").eq("trainer_id", id),
    ]);
    setTrainer(td); setTrainerProfile(pd); setQuestionnaireResponses(resp || []); setExperienceData(exp || []); setIndustryQuals(quals || []); setEvidenceFiles(files || []); setAssignedUnits(assigned || []); setLoading(false);
  };

  // Individual section approval functions
  const approveSection = async (field, value, setSaving) => {
    setSaving(true);
    await supabase.from("trainer_profiles").upsert({ trainer_id: id, [field]: value, reviewed_by: adminProfile?.full_name, reviewed_at: new Date().toISOString() }, { onConflict: "trainer_id" });
    await fetchAll(); setSaving(false);
  };

  const updateCredentialApproval = async (approved) => {
    setSavingCred(true);
    await supabase.from("trainer_profiles").update({ profile_status: approved ? "Approved" : "Rejected", reviewed_by: adminProfile?.full_name, reviewed_at: new Date().toISOString() }).eq("trainer_id", id);
    await fetchAll(); setSavingCred(false);
  };

  const updateStatus = async (status) => {
    setSaving(true);
    await supabase.from("trainers").update({ compliance_status: status }).eq("id", id);
    setTrainer((p) => ({ ...p, compliance_status: status }));
    if (trainerProfile) await supabase.from("trainer_profiles").update({ profile_status: status === "Compliant" ? "Approved" : "Under Review", reviewed_by: adminProfile?.full_name, reviewed_at: new Date().toISOString(), review_notes: statusNote }).eq("trainer_id", id);
    setSaving(false); setShowStatusModal(false); setStatusNote("");
  };

  const profilePct = calcProfilePct(trainer, trainerProfile);
  const questPct = calcQuestionnairePct(questionnaireResponses);
  const expPct = calcExperiencePct(questionnaireResponses, experienceData, assignedUnits);
  const answeredCount = questionnaireResponses.filter((r) => r.response).length;
  const overallPct = Math.round((profilePct + questPct + (expPct ?? 0)) / 3);

  const s1Approved = trainerProfile?.s1_approved;
  const s4Approved = trainerProfile?.s4_approved;
  const profileStatus = trainerProfile?.profile_status;
  const s1Status = s1Approved === true ? "approved" : s1Approved === false ? "rejected" : trainer?.full_name ? "pending" : null;
  const s4Status = s4Approved === true ? "approved" : s4Approved === false ? "rejected" : trainerProfile?.declaration_signature ? "pending" : null;
  const credStatus = profileStatus === "Approved" ? "approved" : profileStatus === "Rejected" ? "rejected" : (trainerProfile?.tae_qualification || trainerProfile?.under_direction_qualification) ? "pending" : null;
  const qualsStatus = trainerProfile?.industry_quals_approved === true ? "approved" : trainerProfile?.industry_quals_approved === false ? "rejected" : industryQuals.length > 0 ? "pending" : null;

  const expAllApproved = assignedUnits.length > 0 && assignedUnits.every((a) => experienceData.find((e) => e.unit_code === a.unit_code && e.competency_confirmed === true));
  const expAnyRejected = experienceData.some((e) => e.competency_confirmed === false);
  const expHasUpdates = experienceData.some((e) => e.trainer_updated_at && (e.reviewed_at ? new Date(e.trainer_updated_at) > new Date(e.reviewed_at) : e.competency_confirmed !== null));

  const getTabIcon = (tabId) => {
    if (tabId === "profile") {
      const all = s1Status === "approved" && credStatus === "approved" && qualsStatus === "approved" && s4Status === "approved";
      const any = [s1Status, credStatus, qualsStatus, s4Status].includes("rejected");
      const pend = [s1Status, credStatus, qualsStatus, s4Status].includes("pending");
      if (all) return { icon: "✓", color: "#16a34a" };
      if (any) return { icon: "✗", color: "#c93535" };
      if (pend) return { icon: "⚠", color: "#e8a020" };
      return null;
    }
    if (tabId === "questionnaire") return questPct === 100 ? { icon: "✓", color: "#16a34a" } : null;
    if (tabId === "streams") return assignedUnits.length > 0 ? { icon: "✓", color: "#16a34a" } : null;
    if (tabId === "experience") {
      if (expHasUpdates) return { icon: "↺", color: "#7c3aed" };
      if (expAllApproved) return { icon: "✓", color: "#16a34a" };
      if (expAnyRejected) return { icon: "✗", color: "#c93535" };
      return null;
    }
    if (tabId === "evidence") return evidenceFiles.length > 0 ? { icon: "✓", color: "#16a34a" } : null;
    return null;
  };

  const TABS = [{ id: "profile", label: "Profile & Credentials" }, { id: "questionnaire", label: "Skills Questionnaire" }, { id: "streams", label: "Stream Assignment" }, { id: "experience", label: "Industry Experience" }, { id: "evidence", label: "Evidence" }];

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-400">Loading trainer...</p></div>;
  if (!trainer) return <div className="text-center py-20"><p className="text-sm text-gray-400 mb-3">Trainer not found</p><button onClick={() => navigate("/trainers")} className="text-sm font-medium" style={{ color: "#1c5ea8" }}>← Back to trainers</button></div>;

  const initials = trainer.full_name ? trainer.full_name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";
  const statusStyle = STATUS_STYLES[trainer.compliance_status] || STATUS_STYLES["Incomplete"];
  const taeFiles = evidenceFiles.filter((f) => f.document_type === "TAE Credential" || f.document_type === "TAE Enrolment Evidence");
  const industryFiles = evidenceFiles.filter((f) => f.document_type === "Industry Qualification");

  return (
    <div>
      <button onClick={() => navigate("/trainers")} className="flex items-center gap-2 text-sm mb-5" style={{ color: "#1c5ea8" }}>← Back to trainers</button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{initials}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1"><h2 className="text-xl font-semibold text-gray-800">{trainer.full_name}</h2><span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>{trainer.compliance_status || "Incomplete"}</span></div>
          <p className="text-sm text-gray-400">{trainer.email}</p>
          <p className="text-sm text-gray-400">{trainer.position || "Position not set"} · {trainer.employment_status || "Employment not set"}</p>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${overallPct}%`, backgroundColor: overallPct >= 100 ? "#32ba9a" : overallPct >= 60 ? "#e8a020" : "#c93535" }} /></div>
            <span className="text-xs font-semibold text-gray-500">{overallPct}% overall</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setNewStatus("Compliant"); setShowStatusModal(true); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: trainer.compliance_status === "Compliant" ? "#16a34a" : "#6b7280" }}>{trainer.compliance_status === "Compliant" ? "✓ Compliant" : "Mark Compliant"}</button>
          <button onClick={() => { setNewStatus("Under Review"); setShowStatusModal(true); }} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all" style={trainer.compliance_status === "Under Review" ? { backgroundColor: "#e6f0ff", color: "#1c5ea8", borderColor: "#93c5fd" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>{trainer.compliance_status === "Under Review" ? "🔍 Under Review" : "Under Review"}</button>
          <button onClick={() => { setNewStatus("Incomplete"); setShowStatusModal(true); }} className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all" style={trainer.compliance_status === "Incomplete" ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#fca5a5" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>Incomplete</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <CompletionCard title="Sections 1–4 — Profile" value={profilePct} sub={profilePct === 0 ? "Not started" : profilePct === 100 ? "Complete" : "In progress"} icon="📄" />
        <CompletionCard title="Section 5 — Questionnaire" value={questPct} sub={`${answeredCount} of ${UNITS.length} units answered`} icon="📋" />
        <CompletionCard title="Section 6 — Experience" value={expPct ?? 0} sub={expPct === null ? "Awaiting stream assignment" : `${experienceData.filter((e) => e.competency_confirmed !== null).length} of ${assignedUnits.length} units assessed`} icon="🔬" />
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {TABS.map((tab) => {
          const ti = getTabIcon(tab.id);
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
              style={activeTab === tab.id ? { backgroundColor: "#fff", color: "#081a47", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { backgroundColor: "transparent", color: "#6b7280" }}>
              <span className="flex items-center justify-center gap-1.5">
                {ti && <span style={{ color: ti.color }}>{ti.icon}</span>}
                {tab.label}
                {tab.id === "streams" && assignedUnits.length > 0 && !ti && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>{assignedUnits.length}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && (
        <>
          {/* Section 1 — own approval */}
          <Section title="Section 1 — Personal Details" statusBadge={<SectionStatusBadge status={s1Status} />}>
            <div className="grid grid-cols-3 gap-x-6 gap-y-4">
              <DetailCell label="Full Name" value={trainer.full_name} />
              <DetailCell label="Email" value={trainer.email} />
              <DetailCell label="Phone" value={trainer.phone} />
              <DetailCell label="Position" value={trainer.position} />
              <DetailCell label="Employment Status" value={trainer.employment_status} />
              <DetailCell label="State" value={trainer.state} />
            </div>
            <ApprovalButtons approved={s1Approved === true ? true : s1Approved === false ? false : null}
              onApprove={() => approveSection("s1_approved", true, setSavingS1)}
              onReject={() => approveSection("s1_approved", false, setSavingS1)}
              saving={savingS1} approveLabel="Approve Section 1" rejectLabel="Not Approved" />
          </Section>

          {/* Section 2 — training credentials */}
          <Section title="Section 2 — Training Credentials" statusBadge={<SectionStatusBadge status={credStatus} />}>
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
                <ApprovalButtons approved={profileStatus === "Approved" ? true : profileStatus === "Rejected" ? false : null}
                  onApprove={() => updateCredentialApproval(true)} onReject={() => updateCredentialApproval(false)}
                  saving={savingCred} approveLabel="Approve Credentials" rejectLabel="Not Approved" />
              </>
            ) : <p className="text-sm text-gray-400">Trainer has not submitted their profile yet</p>}
          </Section>

          {/* Section 3 — industry quals */}
          <Section title="Section 3 — Industry Competencies" statusBadge={<SectionStatusBadge status={qualsStatus} />}
            action={<span className="text-xs text-white opacity-60">{industryQuals.length} qualification{industryQuals.length !== 1 ? "s" : ""}</span>}>
            {industryQuals.length === 0 ? <p className="text-sm text-gray-400">No industry qualifications submitted yet</p> : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border-collapse">
                    <thead><tr className="bg-gray-50">{["Code", "Title", "Provider Name", "Provider ID", "Issue Date"].map((h) => <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">{h}</th>)}</tr></thead>
                    <tbody>{industryQuals.map((q, i) => <tr key={i} className="border-b border-gray-100 last:border-0"><td className="px-3 py-2.5 font-mono text-xs">{q.qualification_code || "—"}</td><td className="px-3 py-2.5 text-sm">{q.qualification_title || "—"}</td><td className="px-3 py-2.5 text-sm text-gray-600">{q.provider_name || "—"}</td><td className="px-3 py-2.5 text-sm text-gray-600">{q.provider_id || "—"}</td><td className="px-3 py-2.5 text-sm text-gray-600">{q.issue_date || "—"}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Certificates</p>
                    <AdminUpload trainerId={id} documentType="Industry Qualification" onDone={fetchAll} />
                  </div>
                  <FileList files={industryFiles} emptyMessage="No certificates uploaded yet" />
                </div>
                <ApprovalButtons approved={trainerProfile?.industry_quals_approved === true ? true : trainerProfile?.industry_quals_approved === false ? false : null}
                  onApprove={() => approveSection("industry_quals_approved", true, setSavingQuals)}
                  onReject={() => approveSection("industry_quals_approved", false, setSavingQuals)}
                  saving={savingQuals} approveLabel="Approve Industry Quals" rejectLabel="Not Approved" />
              </>
            )}
          </Section>

          {/* Section 4 — own approval */}
          <Section title="Section 4 — Credentials Declaration" statusBadge={<SectionStatusBadge status={s4Status} />}>
            {trainerProfile ? (
              <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                <DetailCell label="Credentials Declared" value={trainerProfile.declaration_credentials ? "✓ Confirmed" : "Not confirmed"} />
                <DetailCell label="Copies Provided" value={trainerProfile.declaration_copies ? "✓ Confirmed" : "Not confirmed"} />
                <DetailCell label="Signature" value={trainerProfile.declaration_signature} />
                <DetailCell label="Date" value={trainerProfile.declaration_date} />
              </div>
            ) : <p className="text-sm text-gray-400">Trainer has not submitted their declaration yet</p>}
            <ApprovalButtons approved={s4Approved === true ? true : s4Approved === false ? false : null}
              onApprove={() => approveSection("s4_approved", true, setSavingS4)}
              onReject={() => approveSection("s4_approved", false, setSavingS4)}
              saving={savingS4} approveLabel="Approve Section 4" rejectLabel="Not Approved" />
          </Section>
        </>
      )}

      {activeTab === "questionnaire" && (
        <Section title="Section 5 — Skills Questionnaire" action={<span className="text-xs text-white opacity-60">{answeredCount} of {UNITS.length} answered</span>}>
          {questionnaireResponses.length === 0 ? <p className="text-sm text-gray-400">Trainer has not completed the questionnaire yet</p> : (
            <div className="grid grid-cols-6 gap-1.5">
              {[...questionnaireResponses].sort((a, b) => a.unit_code.localeCompare(b.unit_code)).map((r) => {
                const exp = experienceData.find((e) => e.unit_code === r.unit_code);
                const app = r.response === "yes" && exp?.competency_confirmed === true;
                const notApp = r.response === "yes" && exp?.competency_confirmed === false;
                const hasExp = r.response === "yes" && exp?.competency_confirmed == null;
                let bg, border, cc, pb, pc, pl;
                if (app) { bg = "#f0fdf4"; border = "#86efac"; cc = "#166534"; pb = "#dcfce7"; pc = "#166534"; pl = "✓ Approved"; }
                else if (notApp) { bg = "#fef2f2"; border = "#fca5a5"; cc = "#c93535"; pb = "#fdeaea"; pc = "#c93535"; pl = "✗ Not Approved"; }
                else if (hasExp) { bg = "#eff6ff"; border = "#bfdbfe"; cc = "#1c5ea8"; pb = "#dbeafe"; pc = "#1c5ea8"; pl = "Experience"; }
                else { bg = "#fafafa"; border = "#e5e7eb"; cc = "#9ca3af"; pb = "#f3f4f6"; pc = "#9ca3af"; pl = "No Experience"; }
                return (
                  <div key={r.id} className="flex flex-col gap-1 rounded-lg px-2.5 py-2 border" style={{ backgroundColor: bg, borderColor: border }}>
                    <span className="text-xs font-bold font-mono" style={{ color: cc }}>{r.unit_code}</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-center" style={{ backgroundColor: pb, color: pc }}>{pl}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {activeTab === "streams" && <StreamsTab trainerId={id} responses={questionnaireResponses} assignedUnits={assignedUnits} experienceData={experienceData} onAssignmentChange={fetchAll} />}
      {activeTab === "experience" && <ExperienceTab trainerId={id} assignedUnits={assignedUnits} experienceData={experienceData} adminProfile={adminProfile} onUpdate={fetchAll} />}

      {activeTab === "evidence" && (
        <Section title="Evidence Documents" action={<span className="text-xs text-white opacity-60">{evidenceFiles.length} file{evidenceFiles.length !== 1 ? "s" : ""}</span>}>
          {evidenceFiles.length === 0 ? <p className="text-sm text-gray-400">No evidence files uploaded yet</p> : (
            <div className="divide-y divide-gray-100">
              {evidenceFiles.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3"><span className="text-lg">📎</span><div><p className="text-sm font-medium text-gray-800">{f.file_name}</p><p className="text-xs text-gray-400">{f.document_type}</p></div></div>
                  <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                    onClick={async () => { const { data } = await supabase.storage.from("evidence-files").createSignedUrl(f.file_path, 60); if (data) window.open(data.signedUrl, "_blank"); }}>View</button>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Update Status</h2>
            <p className="text-sm text-gray-400 mb-5">Mark this trainer as <strong>{newStatus}</strong></p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes (optional)</label>
              <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Add any review notes..." className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none" rows={3} />
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