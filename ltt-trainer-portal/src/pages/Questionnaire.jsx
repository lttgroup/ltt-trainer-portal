import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS } from "../lib/units";

const RESPONSE_OPTIONS = [
  {
    value: "yes",
    label: "Yes — I have this experience",
    bg: "#e6f9f4",
    color: "#0f7a5a",
    border: "#32ba9a",
  },
  {
    value: "no",
    label: "No experience",
    bg: "#fdeaea",
    color: "#c93535",
    border: "#c93535",
  },
  {
    value: "hold",
    label: "I hold this unit",
    bg: "#e6f0ff",
    color: "#1c5ea8",
    border: "#1c5ea8",
  },
];

function UnitCard({ unit, response, onChange }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
          {unit.code}
        </span>
        <p className="text-sm font-medium text-gray-800 flex-1">{unit.title}</p>
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 px-2">
          {expanded ? "▲ Hide" : "▼ Elements"}
        </button>
      </div>
      {/* Experience question */}
      <div className="px-5 pb-3">
        <p className="text-sm text-gray-600 leading-relaxed">{unit.question}</p>
      </div>
      {/* Expandable elements */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Unit elements</p>
          <div className="space-y-1">
            {unit.elements.map((el, i) => (
              <div key={i} className="flex gap-2 text-sm text-gray-500">
                <span className="text-gray-300 flex-shrink-0">→</span>
                {el}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Response options */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 self-center mr-1 flex-shrink-0">Workplace experience:</span>
          {[
            { value: "yes", label: "Yes", bg: "#e6f9f4", color: "#0f7a5a", border: "#32ba9a" },
            { value: "no", label: "No", bg: "#fdeaea", color: "#c93535", border: "#c93535" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const currentExp = response?.experience;
                onChange(unit.code, {
                  experience: currentExp === opt.value ? null : opt.value,
                  holds: response?.holds || false,
                });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={response?.experience === opt.value ? { backgroundColor: opt.bg, color: opt.color, borderColor: opt.border } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
            >
              {response?.experience === opt.value ? "✓ " : ""}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
          <span className="text-xs text-gray-400 self-center mr-1 flex-shrink-0">Qualification held:</span>
          <button
            onClick={() => {
              if (!response?.experience) return;
              onChange(unit.code, {
                experience: response.experience,
                holds: !response?.holds,
              });
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
            style={
              response?.holds
                ? { backgroundColor: "#e6f0ff", color: "#1c5ea8", borderColor: "#1c5ea8" }
                : !response?.experience
                  ? { backgroundColor: "#f9fafb", color: "#d1d5db", borderColor: "#e5e7eb", cursor: "not-allowed" }
                  : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
            }
          >
            {response?.holds ? "✓ " : ""}I hold this unit
          </button>
          {!response?.experience && <span className="text-xs text-gray-400 italic">Select Yes or No first</span>}
        </div>
      </div>{" "}
    </div>
  );
}
export default function Questionnaire({ profile }) {
  const navigate = useNavigate();
  const [trainerId, setTrainerId] = useState(null);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Group units by industry
  const byIndustry = UNITS.reduce((acc, unit) => {
    if (!acc[unit.industry]) acc[unit.industry] = [];
    acc[unit.industry].push(unit);
    return acc;
  }, {});

  useEffect(() => {
    fetchTrainerAndResponses();
  }, [profile]);

  const fetchTrainerAndResponses = async () => {
    if (!profile) return;

    const { data: trainer, error } = await supabase.from("trainers").select("id").eq("email", profile.email).maybeSingle();

    if (error) {
      setError("Error loading trainer record: " + error.message);
      setLoading(false);
      return;
    }

    if (!trainer) {
      setError("No trainer record found for your account. Please contact your compliance officer.");
      setLoading(false);
      return;
    }

    setTrainerId(trainer.id);

    const { data: existing } = await supabase.from("questionnaire_responses").select("*").eq("trainer_id", trainer.id);

    if (existing) {
      const mapped = {};
      existing.forEach((r) => {
        mapped[r.unit_code] = {
          experience: r.response,
          holds: r.holds_unit || false,
        };
      });
      setResponses(mapped);
    }
    setLoading(false);
  };
  const handleResponse = (unitCode, value) => {
    setResponses((prev) => ({ ...prev, [unitCode]: value }));
    setSaved(false);
  };
  const handleSave = async () => {
    if (!trainerId) {
      setError("No trainer record found. Please contact your compliance officer.");
      return;
    }

    setSaving(true);
    setError("");

    const upserts = Object.entries(responses)
      .map(([unitCode, response]) => {
        const unit = UNITS.find((u) => u.code === unitCode);
        // Handle both old string format and new object format
        const experience = typeof response === "object" ? response?.experience : response;
        const holds = typeof response === "object" ? response?.holds : false;
        return {
          trainer_id: trainerId,
          unit_code: unitCode,
          unit_title: unit?.title || "",
          industry: unit?.industry || "",
          response: experience || "no",
          holds_unit: holds || false,
        };
      })
      .filter((u) => u.response);
    const { error: saveError } = await supabase.from("questionnaire_responses").upsert(upserts, { onConflict: "trainer_id,unit_code" });

    if (saveError) {
      setError("Failed to save. Please try again.");
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    await handleSave();
    navigate("/profile");
  };

  const completedCount = Object.values(responses).filter((r) => (typeof r === "object" ? r?.experience : r)).length;
  const totalCount = UNITS.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading questionnaire...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Progress header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Skills Questionnaire</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {completedCount} of {totalCount} units completed
            </p>
          </div>
          <span className="text-lg font-bold" style={{ color: pct === 100 ? "#32ba9a" : "#1c5ea8" }}>
            {pct}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? "#32ba9a" : "#1c5ea8",
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-3">
          For each unit, select <strong>Yes</strong> if you have workplace experience, <strong>No</strong> if you do not, or <strong>I hold this unit</strong> if you have previously been deemed competent in this unit.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {/* Units by industry */}
      {Object.entries(byIndustry).map(([industry, units]) => {
        const industryName = units[0].industryName;
        return (
          <div key={industry} className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "#081a47" }}>
                {industry}
              </span>
              <span className="text-sm font-semibold text-gray-600">{industryName}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {units.map((unit) => (
              <UnitCard key={unit.code} unit={unit} response={responses[unit.code]} onChange={handleResponse} />
            ))}
          </div>
        );
      })}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Progress"}
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || completedCount === 0}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{
            backgroundColor: completedCount === 0 ? "#9ca3af" : "#1c5ea8",
          }}
        >
          Save & Continue to Trainer Profile →
        </button>
      </div>
    </div>
  );
}
