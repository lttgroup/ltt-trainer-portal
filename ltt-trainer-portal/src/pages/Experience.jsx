import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

function Section({ number, title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
      <div className="flex items-center gap-3 px-6 py-4" style={{ backgroundColor: "#081a47" }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}>
          {number}
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function Experience({ profile }) {
  const navigate = useNavigate();
  const topRef = useRef(null);
  const [trainerId, setTrainerId] = useState(null);
  const [yesUnits, setYesUnits] = useState([]);
  const [experience, setExperience] = useState({});
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

    const { data: trainer } = await supabase.from("trainers").select("id").eq("email", profile.email).maybeSingle();

    if (!trainer) {
      setError("No trainer record found. Please contact your compliance officer.");
      setLoading(false);
      return;
    }

    setTrainerId(trainer.id);

    // Load yes responses
    const { data: responses } = await supabase.from("questionnaire_responses").select("*").eq("trainer_id", trainer.id).eq("response", "yes");

    if (responses) {
      const units = responses.map((r) => UNITS.find((u) => u.code === r.unit_code)).filter(Boolean);
      setYesUnits(units);
    }

    // Load existing experience entries
    const { data: expData } = await supabase.from("industry_experience").select("*").eq("trainer_id", trainer.id);

    if (expData) {
      const mapped = {};
      expData.forEach((e) => {
        mapped[e.unit_code] = {
          experience_description: e.experience_description || "",
          professional_development: e.professional_development || "",
          competency_confirmed: e.competency_confirmed || false,
        };
      });
      setExperience(mapped);
    }

    setLoading(false);
  };

  const updateExperience = (unitCode, field, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: { ...prev[unitCode], [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!trainerId) return;
    setSaving(true);
    setError("");

    if (Object.keys(experience).length > 0) {
      const upserts = Object.entries(experience).map(([unitCode, data]) => ({
        trainer_id: trainerId,
        unit_code: unitCode,
        unit_title: UNITS.find((u) => u.code === unitCode)?.title || "",
        experience_description: data.experience_description,
        professional_development: data.professional_development,
        competency_confirmed: data.competency_confirmed,
      }));

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

  const completedCount = yesUnits.filter((u) => experience[u.code]?.experience_description?.trim()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={topRef} />

      {/* Progress header */}
      <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: "#081a47" }}>
        <h2 className="text-lg font-semibold text-white mb-1">Section 6 — Industry Experience, Skills and Currency</h2>{" "}
        <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>
          For each unit you indicated <strong>Yes</strong> in the Skills Questionnaire, describe your workplace experience, skills and knowledge below.
        </p>
        {yesUnits.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round((completedCount / yesUnits.length) * 100)}%`,
                  backgroundColor: "#32ba9a",
                }}
              />
            </div>
            <span className="text-xs font-semibold text-white">
              {completedCount}/{yesUnits.length} completed
            </span>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {yesUnits.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-400 mb-3">No units marked as Yes in your Skills Questionnaire yet.</p>
          <button onClick={() => navigate("/questionnaire")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
            ← Complete Skills Questionnaire first
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {yesUnits.map((unit) => (
            <div key={unit.code} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Unit header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
                <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                  {unit.code}
                </span>
                <span className="text-sm font-medium text-gray-800">{unit.title}</span>
                {experience[unit.code]?.experience_description?.trim() && (
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#e6f9f4", color: "#0f7a5a" }}>
                    ✓ Completed
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Industry Experience Description</label>
                    <textarea
                      value={experience[unit.code]?.experience_description || ""}
                      onChange={(e) => updateExperience(unit.code, "experience_description", e.target.value)}
                      placeholder="Describe your experience, skills and knowledge related to this unit. Include specific workplace examples..."
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                      rows={4}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Relevant Training / Professional Development</label>
                    <textarea
                      value={experience[unit.code]?.professional_development || ""}
                      onChange={(e) => updateExperience(unit.code, "professional_development", e.target.value)}
                      placeholder="List any relevant qualifications, units or CPD activities..."
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                      rows={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Competency Confirmation</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateExperience(unit.code, "competency_confirmed", true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                      style={experience[unit.code]?.competency_confirmed === true ? { backgroundColor: "#e6f9f4", color: "#0f7a5a", borderColor: "#32ba9a" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
                    >
                      {experience[unit.code]?.competency_confirmed === true ? "✓ " : ""}
                      Yes — I confirm experience, skills and knowledge
                    </button>
                    <button
                      onClick={() => updateExperience(unit.code, "competency_confirmed", false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                      style={
                        experience[unit.code]?.competency_confirmed === false && experience[unit.code]?.competency_confirmed !== undefined
                          ? { backgroundColor: "#fdeaea", color: "#c93535", borderColor: "#c93535" }
                          : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                      }
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 pb-8">
        <button onClick={() => navigate("/questionnaire")} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          ← Back to Questionnaire
        </button>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Draft"}
          </button>
          <button onClick={handleSubmit} disabled={submitting || yesUnits.length === 0} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: submitting ? "#9ca3af" : "#32ba9a" }}>
            {submitting ? "Submitting..." : "Submit Profile for Review ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
