import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

export default function Experience({ profile }) {
  const navigate = useNavigate();
  const topRef = useRef(null);
  const [trainerId, setTrainerId] = useState(null);
  const [assignedUnits, setAssignedUnits] = useState(null);
  const [experience, setExperience] = useState({});
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

    // Check questionnaire submitted
    const { data: responses } = await supabase.from("questionnaire_responses").select("unit_code, response").eq("trainer_id", trainer.id);

    if (!responses || responses.length === 0) {
      setQuestionnaireSubmitted(false);
      setLoading(false);
      return;
    }

    setQuestionnaireSubmitted(true);

    // Check assigned units
    const { data: assigned } = await supabase.from("assigned_units").select("unit_code").eq("trainer_id", trainer.id);

    setAssignedUnits(assigned || []);

    // Load existing experience
    const { data: expData } = await supabase.from("industry_experience").select("*").eq("trainer_id", trainer.id);

    if (expData) {
      const mapped = {};
      expData.forEach((e) => {
        mapped[e.unit_code] = {
          professional_development: e.professional_development || "",
          element_descriptions: e.element_descriptions || {},
        };
      });
      setExperience(mapped);
    }

    setLoading(false);
  };

  const updatePD = (unitCode, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: {
        ...prev[unitCode],
        professional_development: value,
      },
    }));
    setSaved(false);
  };

  const updateElement = (unitCode, elementIndex, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: {
        ...prev[unitCode],
        element_descriptions: {
          ...(prev[unitCode]?.element_descriptions || {}),
          [elementIndex]: value,
        },
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!trainerId) return;
    setSaving(true);
    setError("");

    const upserts = Object.entries(experience).map(([unitCode, data]) => ({
      trainer_id: trainerId,
      unit_code: unitCode,
      unit_title: UNITS.find((u) => u.code === unitCode)?.title || "",
      professional_development: data.professional_development,
      element_descriptions: data.element_descriptions || {},
      // Keep these null — admin sets them
      competency_confirmed: null,
      holds_unit: false,
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

    await supabase
      .from("trainer_profiles")
      .update({
        profile_status: "Submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("trainer_id", trainerId);

    await supabase.from("trainers").update({ compliance_status: "Pending" }).eq("id", trainerId);

    setSubmitting(false);
    navigate("/dashboard");
  };

  // Units to show — assigned units that trainer marked yes
  const unitsToShow =
    assignedUnits && assignedUnits.length > 0
      ? assignedUnits
          .map((a) => UNITS.find((u) => u.code === a.unit_code))
          .filter(Boolean)
          .sort((a, b) => a.code.localeCompare(b.code))
      : [];

  // Progress — a unit is complete when all its elements have descriptions
  const completedCount = unitsToShow.filter((unit) => {
    const exp = experience[unit.code];
    if (!exp) return false;
    if (unit.elements.length === 0) return !!exp.professional_development?.trim();
    return unit.elements.every((_, i) => exp.element_descriptions?.[i]?.trim());
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
      <div ref={topRef} />

      {/* Section 6 header */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
        <div className="flex items-center gap-3 px-6 py-4" style={{ backgroundColor: "#081a47" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}>
            6
          </div>
          <h3 className="text-sm font-semibold text-white flex-1">Section 6 — Industry Experience, Skills and Currency</h3>
          {unitsToShow.length > 0 && (
            <span className="text-sm font-bold" style={{ color: pct === 100 ? "#32ba9a" : "rgba(255,255,255,0.7)" }}>
              {pct}%
            </span>
          )}
        </div>
        <div className="px-6 py-4">
          {!questionnaireSubmitted ? (
            <p className="text-xs text-gray-400">Complete Section 5 — Skills Questionnaire before proceeding to this section.</p>
          ) : assignedUnits && assignedUnits.length > 0 ? (
            <>
              <p className="text-xs text-gray-400 mb-2">
                {completedCount} of {unitsToShow.length} units completed
              </p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct === 100 ? "#32ba9a" : "#1c5ea8",
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-3">For each assigned unit describe your workplace experience against each element. Include specific examples of real practice.</p>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              {questionnaireSubmitted
                ? "Your Skills Questionnaire has been submitted. Your compliance officer is reviewing your responses and will assign the units required for this section. You will be notified when Section 6 is ready to complete."
                : "Complete Section 5 — Skills Questionnaire before proceeding to this section."}
            </p>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {/* Not submitted yet */}
      {!questionnaireSubmitted && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400 mb-3">You need to complete Section 5 before accessing this section.</p>
          <button onClick={() => navigate("/questionnaire")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
            ← Go to Skills Questionnaire
          </button>
        </div>
      )}

      {/* Awaiting assignment */}
      {questionnaireSubmitted && assignedUnits !== null && assignedUnits.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4" style={{ backgroundColor: "#e6f0ff" }}>
            ⏳
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-2">Awaiting unit assignment</p>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Your Skills Questionnaire has been submitted successfully. Your compliance officer is reviewing your responses and will assign the units required for Section 6. You will be notified when this section is ready.
          </p>
        </div>
      )}

      {/* Unit experience forms */}
      {questionnaireSubmitted && assignedUnits && assignedUnits.length > 0 && (
        <div className="space-y-5">
          {unitsToShow.map((unit) => {
            const exp = experience[unit.code] || {};
            const unitComplete = unit.elements.length > 0 ? unit.elements.every((_, i) => exp.element_descriptions?.[i]?.trim()) : !!exp.professional_development?.trim();

            return (
              <div key={unit.code} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Unit header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                  <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                    {unit.code}
                  </span>
                  <span className="text-sm font-medium text-gray-800 flex-1">{unit.title}</span>
                  {unitComplete && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>
                      ✓ Complete
                    </span>
                  )}
                </div>

                <div className="p-5">
                  {/* Element-level descriptions */}
                  {unit.elements.length > 0 ? (
                    <div className="space-y-4 mb-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Industry Experience — describe your experience for each element</p>
                      {unit.elements.map((element, idx) => (
                        <div key={idx}>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">
                            <span className="inline-block mr-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#f0f4ff", color: "#1c5ea8" }}>
                              {idx + 1}
                            </span>
                            {element}
                          </label>
                          <textarea
                            value={exp.element_descriptions?.[idx] || ""}
                            onChange={(e) => updateElement(unit.code, idx, e.target.value)}
                            placeholder={`Describe your experience related to: ${element.toLowerCase()}...`}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                            rows={3}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-5">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Industry Experience Description</label>
                      <textarea
                        value={exp.element_descriptions?.[0] || ""}
                        onChange={(e) => updateElement(unit.code, 0, e.target.value)}
                        placeholder="Describe your experience, skills and knowledge related to this unit..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Professional development */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Relevant Training / Professional Development</label>
                    <textarea
                      value={exp.professional_development || ""}
                      onChange={(e) => updatePD(unit.code, e.target.value)}
                      placeholder="List any relevant qualifications, units or CPD activities..."
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      {questionnaireSubmitted && assignedUnits && assignedUnits.length > 0 && (
        <div className="flex items-center justify-between pt-4 pb-8">
          <button onClick={() => navigate("/questionnaire")} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            ← Back to Questionnaire
          </button>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Draft"}
            </button>
            <button onClick={handleSubmit} disabled={submitting || unitsToShow.length === 0} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: submitting ? "#9ca3af" : "#32ba9a" }}>
              {submitting ? "Submitting..." : "Submit Profile for Review ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
