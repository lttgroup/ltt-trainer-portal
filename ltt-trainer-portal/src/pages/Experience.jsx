import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

// ── Single unit card ──────────────────────────────────────────────────────────
function UnitExperienceCard({ unit, exp, approvalStatus, qualityNotes, onUpdateElement, onUpdatePD, onUpdateHasPD, onComplete, isFirst }) {
  const [openElement, setOpenElement] = useState(isFirst ? 0 : null);
  const [collapsed, setCollapsed] = useState(false);

  const elementsComplete = unit.elements.length > 0 ? unit.elements.every((_, i) => exp.element_descriptions?.[i]?.trim()) : !!exp.element_descriptions?.[0]?.trim();

  const pdComplete = exp.has_pd === false || (exp.has_pd === true && exp.professional_development?.trim());
  const unitComplete = elementsComplete && pdComplete;

  // When unit becomes complete, collapse after a short delay
  useEffect(() => {
    if (unitComplete && !collapsed) {
      const timer = setTimeout(() => {
        setCollapsed(true);
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [unitComplete]);

  const handleElementChange = (idx, value) => {
    onUpdateElement(unit.code, idx, value);
  };

  const handleElementBlur = (idx) => {
    if (exp.element_descriptions?.[idx]?.trim()) {
      const nextIncomplete = unit.elements.findIndex((_, i) => i > idx && !exp.element_descriptions?.[i]?.trim());
      setOpenElement(nextIncomplete !== -1 ? nextIncomplete : null);
    }
  };

  const handleHasPD = (value) => {
    onUpdateHasPD(unit.code, value);
    if (!value) {
      // No PD — collapse unit immediately
      setTimeout(() => {
        setCollapsed(true);
        onComplete();
      }, 300);
    }
  };

  const handlePDBlur = () => {
    if (exp.professional_development?.trim()) {
      // Has text — collapse unit
      setTimeout(() => {
        setCollapsed(true);
        onComplete();
      }, 400);
    }
  };

  // Collapsed view — colour by approval status if available
  if (collapsed) {
    let colBg = "#f0fdf4",
      colBorder = "#bbf7d0",
      colCode = "#1c5ea8",
      colCodeBg = "#e6f0ff";
    let pillBg = "#e6f9f4",
      pillColor = "#0f7a5a",
      pillLabel = "✓ Complete";

    if (approvalStatus === true) {
      colBg = "#f0fdf4";
      colBorder = "#86efac";
      pillBg = "#dcfce7";
      pillColor = "#166534";
      pillLabel = "✓ Quality Approved";
    } else if (approvalStatus === false) {
      colBg = "#fef2f2";
      colBorder = "#fca5a5";
      pillBg = "#fdeaea";
      pillColor = "#c93535";
      pillLabel = "✗ Not Approved";
    }

    return (
      <div className="bg-white border rounded-xl overflow-hidden cursor-pointer transition-all" style={{ borderColor: colBorder, backgroundColor: colBg }} onClick={() => setCollapsed(false)}>
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: colCodeBg, color: colCode }}>
            {unit.code}
          </span>
          <span className="text-sm font-medium text-gray-700 flex-1">{unit.title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: pillBg, color: pillColor }}>
            {pillLabel}
          </span>
          <span className="text-xs text-gray-400 ml-1">▼ expand</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden transition-all" style={{ borderColor: unitComplete ? "#bbf7d0" : "#e5e7eb" }}>
      {/* Unit header */}
      {(() => {
        let hBg = unitComplete ? "#dcfce7" : "#f9fafb";
        let hBorder = unitComplete ? "#bbf7d0" : "#f3f4f6";
        if (approvalStatus === true) {
          hBg = "#dcfce7";
          hBorder = "#86efac";
        }
        if (approvalStatus === false) {
          hBg = "#fef2f2";
          hBorder = "#fca5a5";
        }
        return (
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ backgroundColor: hBg, borderColor: hBorder }}>
            <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
              {unit.code}
            </span>
            <span className="text-sm font-medium text-gray-800 flex-1">{unit.title}</span>
            {approvalStatus === true && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
                ✓ Approved
              </span>
            )}
            {approvalStatus === false && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>
                ✗ Not Approved
              </span>
            )}
            {approvalStatus == null && !elementsComplete && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                {unit.elements.filter((_, i) => exp.element_descriptions?.[i]?.trim()).length}/{unit.elements.length} elements
              </span>
            )}
            {approvalStatus == null && unitComplete && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>
                ✓ Complete
              </span>
            )}
          </div>
        );
      })()}

      <div className="p-5">
        {/* Quality feedback panel for not-approved units */}
        {approvalStatus === false && (
          <div className="rounded-xl p-4 mb-5 border" style={{ backgroundColor: "#fef2f2", borderColor: "#fca5a5" }}>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#c93535" }}>
                <span className="text-white font-bold text-xs">!</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold mb-1" style={{ color: "#c93535" }}>
                  Not Approved — Additional evidence required
                </p>
                {qualityNotes ? (
                  <>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Quality team feedback:</p>
                    <p className="text-sm text-gray-700 leading-relaxed italic">"{qualityNotes}"</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Please review your experience descriptions below and contact your compliance officer if you can provide additional evidence.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approved read-only notice */}
        {approvalStatus === true && (
          <div className="rounded-xl p-4 mb-5 border" style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac" }}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#16a34a" }}>
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4.5l3 3L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: "#166534" }}>
                Approved by quality team — your experience evidence has been verified.
              </p>
            </div>
          </div>
        )}
        {/* Element descriptions */}
        {unit.elements.length > 0 ? (
          <div className="space-y-2 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Industry Experience — describe your experience for each element</p>
            {unit.elements.map((element, idx) => {
              const value = exp.element_descriptions?.[idx] || "";
              const isDone = !!value.trim();
              const isOpen = openElement === idx;

              return (
                <div
                  key={idx}
                  className="rounded-lg border overflow-hidden transition-all"
                  style={{
                    borderColor: isDone ? "#bbf7d0" : isOpen ? "#93c5fd" : "#e5e7eb",
                    backgroundColor: isDone && !isOpen ? "#f0fdf4" : "#fff",
                  }}
                >
                  <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpenElement(isOpen ? null : idx)}>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: "#f0f4ff", color: "#1c5ea8" }}>
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-gray-700 flex-1 text-left">{element}</span>
                    {isDone ? (
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#0f7a5a" }}>
                        ✓
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 flex-shrink-0">{isOpen ? "▲" : "▼"}</span>
                    )}
                  </button>

                  {isDone && !isOpen && (
                    <div className="px-3 pb-2.5">
                      <p className="text-xs text-gray-500 line-clamp-2 italic">{value}</p>
                    </div>
                  )}

                  {isOpen && (
                    <div className="px-3 pb-3">
                      <textarea
                        value={value}
                        onChange={(e) => handleElementChange(idx, e.target.value)}
                        onBlur={() => handleElementBlur(idx)}
                        placeholder={`Describe your experience related to: ${element.toLowerCase()}...`}
                        className="w-full px-3 py-2.5 border border-blue-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Industry Experience Description</label>
            <textarea
              value={exp.element_descriptions?.[0] || ""}
              onChange={(e) => onUpdateElement(unit.code, 0, e.target.value)}
              placeholder="Describe your experience, skills and knowledge related to this unit..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
              rows={4}
            />
          </div>
        )}

        {/* PD yes/no — only show once all elements complete */}
        {elementsComplete && (
          <div className="rounded-xl p-4 border" style={{ backgroundColor: "#f8faff", borderColor: "#e0e7ff" }}>
            <p className="text-sm font-semibold text-gray-700 mb-3">Have you completed relevant training or professional development for this unit?</p>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => handleHasPD(true)}
                className="px-5 py-2 rounded-lg text-sm font-semibold border transition-all"
                style={exp.has_pd === true ? { backgroundColor: "#dbeafe", color: "#1c5ea8", borderColor: "#93c5fd" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
              >
                Yes
              </button>
              <button
                onClick={() => handleHasPD(false)}
                className="px-5 py-2 rounded-lg text-sm font-semibold border transition-all"
                style={exp.has_pd === false ? { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
              >
                No
              </button>
            </div>

            {exp.has_pd === true && (
              <textarea
                value={exp.professional_development || ""}
                onChange={(e) => onUpdatePD(unit.code, e.target.value)}
                onBlur={handlePDBlur}
                placeholder="List any relevant qualifications, units or CPD activities..."
                className="w-full px-3 py-2.5 border border-blue-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                rows={3}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Experience({ profile }) {
  const navigate = useNavigate();
  const unitRefs = useRef({});
  const [trainerId, setTrainerId] = useState(null);
  const [assignedUnits, setAssignedUnits] = useState(null);
  const [experience, setExperience] = useState({});
  const [approval, setApproval] = useState({}); // unit_code -> competency_confirmed (null|true|false)
  const [qualityNotes, setQualityNotes] = useState({}); // unit_code -> quality_notes
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const { data: trainers } = await supabase.from("trainers").select("id").eq("email", profile.email).order("created_at", { ascending: false }).limit(1);

    const trainer = trainers?.[0] || null;
    if (!trainer) {
      setError("No trainer record found. Please contact your compliance officer.");
      setLoading(false);
      return;
    }

    setTrainerId(trainer.id);

    const { data: responses } = await supabase.from("questionnaire_responses").select("unit_code, response").eq("trainer_id", trainer.id);

    if (!responses || responses.length === 0) {
      setQuestionnaireSubmitted(false);
      setLoading(false);
      return;
    }

    setQuestionnaireSubmitted(true);

    const { data: assigned } = await supabase.from("assigned_units").select("unit_code").eq("trainer_id", trainer.id);

    setAssignedUnits(assigned || []);

    const { data: expData } = await supabase.from("industry_experience").select("*").eq("trainer_id", trainer.id);

    if (expData) {
      const mapped = {};
      const approvalMapped = {};
      expData.forEach((e) => {
        const hasPd = e.professional_development?.trim() ? true : e.element_descriptions && Object.keys(e.element_descriptions).length > 0 ? false : null;
        mapped[e.unit_code] = {
          professional_development: e.professional_development || "",
          element_descriptions: e.element_descriptions || {},
          has_pd: hasPd,
        };
        approvalMapped[e.unit_code] = e.competency_confirmed; // null | true | false
      });
      const notesMapped = {};
      expData.forEach((e) => {
        if (e.quality_notes) notesMapped[e.unit_code] = e.quality_notes;
      });
      setExperience(mapped);
      setApproval(approvalMapped);
      setQualityNotes(notesMapped);
    }

    setLoading(false);
  };

  const updateElement = (unitCode, idx, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: {
        ...prev[unitCode],
        element_descriptions: { ...(prev[unitCode]?.element_descriptions || {}), [idx]: value },
      },
    }));
    setSaved(false);
  };

  const updatePD = (unitCode, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: { ...prev[unitCode], professional_development: value },
    }));
    setSaved(false);
  };

  const updateHasPD = (unitCode, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: {
        ...prev[unitCode],
        has_pd: value,
        professional_development: value ? prev[unitCode]?.professional_development || "" : "",
      },
    }));
    setSaved(false);
  };

  // Called when a unit completes and collapses — scroll to next incomplete
  const handleUnitComplete = (unitCode) => {
    const units = unitsToShow;
    const currentIdx = units.findIndex((u) => u.code === unitCode);
    const nextUnit = units[currentIdx + 1];
    if (nextUnit && unitRefs.current[nextUnit.code]) {
      setTimeout(() => {
        unitRefs.current[nextUnit.code].scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  };

  const handleSave = async () => {
    if (!trainerId) return;
    setSaving(true);
    setError("");

    const upserts = Object.entries(experience).map(([unitCode, data]) => ({
      trainer_id: trainerId,
      unit_code: unitCode,
      unit_title: UNITS.find((u) => u.code === unitCode)?.title || "",
      professional_development: data.has_pd ? data.professional_development : "",
      element_descriptions: data.element_descriptions || {},
    }));

    if (upserts.length > 0) {
      const { error: saveError } = await supabase.from("industry_experience").upsert(upserts, { onConflict: "trainer_id,unit_code" });

      if (saveError) {
        setError("Failed to save. Please try again.");
        setSaving(false);
        return;
      }
    }

    setSaved(true);
    setSaving(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await handleSave();

    await supabase.from("trainer_profiles").update({ profile_status: "Submitted", submitted_at: new Date().toISOString() }).eq("trainer_id", trainerId);

    await supabase.from("trainers").update({ compliance_status: "Pending" }).eq("id", trainerId);

    // Create in-app notification for admin
    await supabase.from("notifications").insert({
      trainer_id: trainerId,
      trainer_name: profile?.full_name || "A trainer",
      type: "experience_submitted",
      message: `${profile?.full_name || "A trainer"} has submitted their industry experience and is awaiting quality review.`,
      read: false,
    });

    // Send email notification via Resend (once DNS is verified)
    // const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY
    // if (RESEND_KEY) {
    //   await fetch('https://api.resend.com/emails', {
    //     method: 'POST',
    //     headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       from: 'noreply@ltt.edu.au',
    //       to: 'quality@ltt.edu.au',
    //       subject: `Industry Experience Submitted — ${profile?.full_name}`,
    //       html: `<p>${profile?.full_name} has submitted their industry experience for quality review.</p><p><a href="https://ltt-trainer-portal.pages.dev/trainers/${trainerId}">Review now →</a></p>`,
    //     }),
    //   })
    // }

    setSubmitting(false);
    navigate("/dashboard");
  };

  const unitsToShow =
    assignedUnits && assignedUnits.length > 0
      ? assignedUnits
          .map((a) => UNITS.find((u) => u.code === a.unit_code))
          .filter(Boolean)
          .sort((a, b) => a.code.localeCompare(b.code))
      : [];

  const completedCount = unitsToShow.filter((unit) => {
    const exp = experience[unit.code];
    if (!exp) return false;
    const elsDone = unit.elements.length > 0 ? unit.elements.every((_, i) => exp.element_descriptions?.[i]?.trim()) : !!exp.element_descriptions?.[0]?.trim();
    const pdDone = exp.has_pd === false || (exp.has_pd === true && exp.professional_development?.trim());
    return elsDone && pdDone;
  }).length;

  const pct = unitsToShow.length > 0 ? Math.round((completedCount / unitsToShow.length) * 100) : 0;

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );

  return (
    <div>
      {/* Section header */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
        {(() => {
          const approvedCount = Object.values(approval).filter((v) => v === true).length;
          const notApprovedCount = Object.values(approval).filter((v) => v === false).length;
          const totalAssigned = assignedUnits?.length || 0;
          const allQualApproved = totalAssigned > 0 && approvedCount === totalAssigned;
          const s6BgColor = allQualApproved ? "#166534" : "#081a47";
          return (
            <div className="flex items-center gap-3 px-6 py-4" style={{ backgroundColor: s6BgColor }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
                {allQualApproved ? "✓" : "6"}
              </div>
              <h3 className="text-sm font-semibold text-white flex-1">Section 6 — Industry Experience, Skills and Currency</h3>
              {allQualApproved && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
                  Quality Approved
                </span>
              )}
              {!allQualApproved && unitsToShow.length > 0 && (
                <span className="text-sm font-bold" style={{ color: pct === 100 ? "#32ba9a" : "rgba(255,255,255,0.7)" }}>
                  {pct}%
                </span>
              )}
              {notApprovedCount > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#fdeaea", color: "#c93535" }}>
                  {notApprovedCount} not approved
                </span>
              )}
            </div>
          );
        })()}
        <div className="px-6 py-4">
          {!questionnaireSubmitted ? (
            <p className="text-xs text-gray-400">Complete Section 5 — Skills Questionnaire before proceeding.</p>
          ) : assignedUnits && assignedUnits.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-2">
                {completedCount} of {unitsToShow.length} units completed
              </p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#32ba9a" : "#1c5ea8" }} />
              </div>
              <p className="text-xs text-gray-400 mt-3">Work through each unit — describe your experience for every element, then indicate whether you have completed relevant professional development. Completed units collapse automatically.</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">Your Skills Questionnaire has been submitted. Your compliance officer is reviewing your responses and will assign units for this section.</p>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {!questionnaireSubmitted && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400 mb-3">Complete Section 5 before accessing this section.</p>
          <button onClick={() => navigate("/questionnaire")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
            ← Go to Skills Questionnaire
          </button>
        </div>
      )}

      {questionnaireSubmitted && assignedUnits !== null && assignedUnits.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4" style={{ backgroundColor: "#e6f0ff" }}>
            ⏳
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Awaiting unit assignment</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">Your compliance officer is reviewing your responses and will assign the units required for Section 6.</p>
        </div>
      )}

      {questionnaireSubmitted && assignedUnits && assignedUnits.length > 0 && (
        <div className="space-y-3">
          {unitsToShow.map((unit, idx) => (
            <div key={unit.code} ref={(el) => (unitRefs.current[unit.code] = el)}>
              <UnitExperienceCard
                unit={unit}
                exp={experience[unit.code] || {}}
                approvalStatus={approval[unit.code]}
                qualityNotes={qualityNotes[unit.code] || ""}
                onUpdateElement={updateElement}
                onUpdatePD={updatePD}
                onUpdateHasPD={updateHasPD}
                onComplete={() => handleUnitComplete(unit.code)}
                isFirst={idx === 0}
              />
            </div>
          ))}
        </div>
      )}

      {questionnaireSubmitted && assignedUnits && assignedUnits.length > 0 && (
        <div className="flex items-center justify-between pt-4 pb-8">
          <button onClick={() => navigate("/questionnaire")} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            ← Back to Questionnaire
          </button>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Draft"}
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: submitting ? "#9ca3af" : "#32ba9a" }}>
              {submitting ? "Submitting..." : "Submit Profile for Review ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
