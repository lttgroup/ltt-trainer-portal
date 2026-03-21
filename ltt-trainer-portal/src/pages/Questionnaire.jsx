import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS, INDUSTRIES } from "../lib/units";

const RESPONSE_OPTIONS = [
  { value: "yes", label: "Yes", bg: "#e6f9f4", color: "#0f7a5a", border: "#32ba9a" },
  { value: "no", label: "No", bg: "#fdeaea", color: "#c93535", border: "#c93535" },
];

// ─── STEP 1: Industry Selection ───
function IndustryStep({ onContinue }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const unitCount = (code) => UNITS.filter((u) => u.industry === code).length;

  const selectedUnits = [...selected].reduce((a, c) => a + unitCount(c), 0);
  const remainingUnits = UNITS.length - selectedUnits;

  return (
    <div>
      {/* Header card */}
      <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: "#081a47" }}>
        <h2 className="text-lg font-semibold text-white mb-1">Step 1 — Select your relevant industries</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Select the industries where you have workplace experience. These will appear first in your questionnaire. You must still actively review and respond to every unit — no units will be skipped.
        </p>
      </div>

      {/* Industry grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {INDUSTRIES.map((ind) => {
          const count = unitCount(ind.code);
          const isSelected = selected.has(ind.code);
          return (
            <button
              key={ind.code}
              onClick={() => toggle(ind.code)}
              className="text-left rounded-xl p-4 border transition-all"
              style={{
                backgroundColor: isSelected ? "#e6f0ff" : "#fff",
                borderColor: isSelected ? "#1c5ea8" : "#e5e7eb",
                borderWidth: isSelected ? "2px" : "1px",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded mb-2 inline-block font-mono" style={{ backgroundColor: isSelected ? "#1c5ea8" : "#f0f4f8", color: isSelected ? "#fff" : "#1c5ea8" }}>
                    {ind.code}
                  </span>
                  <p className="text-sm font-medium text-gray-800 leading-tight">{ind.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {count} unit{count !== 1 ? "s" : ""}
                  </p>
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
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="rounded-xl p-4 mb-5 text-sm" style={{ backgroundColor: "#f0f5ff", border: "1px solid #c7d9f5" }}>
        {selected.size === 0 ? (
          <p style={{ color: "#1c5ea8" }}>Select at least one industry to continue. You can still answer all units.</p>
        ) : (
          <p style={{ color: "#1c5ea8" }}>
            <strong>
              {selected.size} industr{selected.size === 1 ? "y" : "ies"} selected
            </strong>{" "}
            — {selectedUnits} units will appear first.
            {remainingUnits > 0 && <span style={{ color: "#4b7dc8" }}> The remaining {remainingUnits} units from other industries will appear below and must also be completed.</span>}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">You must respond to all {UNITS.length} units before submitting</p>
        <button onClick={() => onContinue([...selected])} disabled={selected.size === 0} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: selected.size === 0 ? "#9ca3af" : "#1c5ea8" }}>
          Continue to questionnaire →
        </button>
      </div>
    </div>
  );
}

// ─── UNIT CARD ───
function UnitCard({ unit, response, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const exp = response?.experience;
  const holds = response?.holds;

  return (
    <div className="bg-white rounded-xl overflow-hidden mb-3 border transition-all" style={{ borderColor: exp ? "#e5e7eb" : "#e5e7eb" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
          {unit.code}
        </span>
        <p className="text-sm font-medium text-gray-800 flex-1 leading-snug">{unit.title}</p>
        {exp && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: exp === "yes" ? "#e6f9f4" : "#fdeaea",
              color: exp === "yes" ? "#0f7a5a" : "#c93535",
            }}
          >
            {exp === "yes" ? "✓ Yes" : "✗ No"}
            {holds ? " + holds" : ""}
          </span>
        )}
      </div>

      {/* Experience question */}
      <div className="px-5 pb-2">
        <p className="text-sm text-gray-600 leading-relaxed">{unit.question}</p>
      </div>

      {/* Expandable elements */}
      <div className="px-5 pb-2">
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-medium transition-colors" style={{ color: "#1c5ea8" }}>
          {expanded ? "▲ Hide unit elements" : "▼ View unit elements"}
        </button>
        {expanded && (
          <div className="mt-2 space-y-1">
            {unit.elements.map((el, i) => (
              <div key={i} className="flex gap-2 text-xs text-gray-500">
                <span className="text-gray-300 flex-shrink-0">→</span>
                {el}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response options */}
      <div className="px-5 py-3 border-t" style={{ backgroundColor: "#f9fafb", borderColor: "#f0f0f0" }}>
        {/* Yes / No */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 mr-1 flex-shrink-0">Workplace experience:</span>
          {RESPONSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                onChange(unit.code, {
                  experience: exp === opt.value ? null : opt.value,
                  holds: holds || false,
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={exp === opt.value ? { backgroundColor: opt.bg, color: opt.color, borderColor: opt.border } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
            >
              {exp === opt.value ? "✓ " : ""}
              {opt.label}
            </button>
          ))}
        </div>

        {/* I hold this unit — separate row */}
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "#e9e9e9" }}>
          <span className="text-xs text-gray-400 mr-1 flex-shrink-0">Qualification held:</span>
          <button
            onClick={() => {
              if (!exp) return;
              onChange(unit.code, { experience: exp, holds: !holds });
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
            style={
              holds
                ? { backgroundColor: "#eef2ff", color: "#4f46e5", borderColor: "#a5b4fc" }
                : !exp
                  ? { backgroundColor: "#f9fafb", color: "#d1d5db", borderColor: "#e5e7eb", cursor: "not-allowed" }
                  : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
            }
          >
            {holds ? "✓ " : ""}I hold this unit
          </button>
          {!exp && <span className="text-xs italic text-gray-400">Select Yes or No first</span>}
        </div>
      </div>
    </div>
  );
}

// ─── INDUSTRY SECTION ───
function IndustrySection({ industry, units, responses, onChange, isRelevant }) {
  const [collapsed, setCollapsed] = useState(!isRelevant);

  const answered = units.filter((u) => responses[u.code]?.experience).length;
  const total = units.length;
  const allAnswered = answered === total;

  return (
    <div className="mb-4">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border text-left transition-all"
        style={{
          backgroundColor: isRelevant ? "#081a47" : "#f9fafb",
          borderColor: isRelevant ? "#081a47" : "#e5e7eb",
        }}
      >
        <span
          className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0"
          style={{
            backgroundColor: isRelevant ? "rgba(255,255,255,0.15)" : "#e6f0ff",
            color: isRelevant ? "#fff" : "#1c5ea8",
          }}
        >
          {industry.code}
        </span>
        <span className="text-sm font-semibold flex-1" style={{ color: isRelevant ? "#fff" : "#1e2535" }}>
          {industry.name}
        </span>

        {/* Progress pill */}
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            backgroundColor: allAnswered ? "#e6f9f4" : isRelevant ? "rgba(255,255,255,0.15)" : "#f0f4f8",
            color: allAnswered ? "#0f7a5a" : isRelevant ? "#fff" : "#6b7280",
          }}
        >
          {answered}/{total} answered
        </span>

        {!isRelevant && <span className="text-xs text-gray-400 flex-shrink-0 mr-1">Other industry</span>}

        <span style={{ color: isRelevant ? "rgba(255,255,255,0.6)" : "#9ca3af", fontSize: "11px" }}>{collapsed ? "▼" : "▲"}</span>
      </button>

      {/* Units */}
      {!collapsed && (
        <div className="mt-3">
          {units.map((unit) => (
            <UnitCard key={unit.code} unit={unit} response={responses[unit.code]} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN QUESTIONNAIRE ───
export default function Questionnaire({ profile }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [relevantIndustries, setRelevantIndustries] = useState([]);
  const [trainerId, setTrainerId] = useState(null);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);

  useEffect(() => {
    fetchTrainerAndResponses();
  }, [profile]);

  const fetchTrainerAndResponses = async () => {
    if (!profile) return;

    const { data: trainer } = await supabase.from("trainers").select("id").eq("email", profile.email).maybeSingle();

    if (!trainer) {
      setError("No trainer record found. Please contact your compliance officer.");
      setLoading(false);
      return;
    }

    setTrainerId(trainer.id);

    const { data: existing } = await supabase.from("questionnaire_responses").select("*").eq("trainer_id", trainer.id);

    if (existing && existing.length > 0) {
      const mapped = {};
      existing.forEach((r) => {
        mapped[r.unit_code] = {
          experience: r.response,
          holds: r.holds_unit || false,
        };
      });
      setResponses(mapped);
      // Skip step 1 if already started
      setStep(2);
    }

    setLoading(false);
  };

  const handleResponse = (unitCode, value) => {
    setResponses((prev) => ({ ...prev, [unitCode]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!trainerId) return;
    setSaving(true);
    setError("");

    const upserts = Object.entries(responses)
      .filter(([, r]) => r?.experience)
      .map(([unitCode, response]) => {
        const unit = UNITS.find((u) => u.code === unitCode);
        return {
          trainer_id: trainerId,
          unit_code: unitCode,
          unit_title: unit?.title || "",
          industry: unit?.industry || "",
          response: response.experience,
          holds_unit: response.holds || false,
        };
      });

    const { error: saveError } = await supabase.from("questionnaire_responses").upsert(upserts, { onConflict: "trainer_id,unit_code" });

    if (saveError) {
      setError("Failed to save. Please try again.");
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    // Check all units answered
    const unanswered = UNITS.filter((u) => !responses[u.code]?.experience);
    if (unanswered.length > 0) {
      setShowIncomplete(true);
      return;
    }
    await handleSave();
    navigate("/profile");
  };

  const answeredCount = UNITS.filter((u) => responses[u.code]?.experience).length;
  const totalCount = UNITS.length;
  const pct = Math.round((answeredCount / totalCount) * 100);

  // Sort industries — relevant ones first
  const orderedIndustries = [...INDUSTRIES.filter((i) => relevantIndustries.includes(i.code)), ...INDUSTRIES.filter((i) => !relevantIndustries.includes(i.code))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading questionnaire...</p>
      </div>
    );
  }

  // ── Step 1: Industry selection ──
  if (step === 1) {
    return (
      <IndustryStep
        onContinue={(selected) => {
          setRelevantIndustries(selected);
          setStep(2);
        }}
      />
    );
  }

  // ── Step 2: Unit questions ──
  return (
    <div>
      {/* Progress header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Step 2 — Skills Questionnaire</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {answeredCount} of {totalCount} units completed
              {relevantIndustries.length > 0 && (
                <button onClick={() => setStep(1)} className="ml-3 underline" style={{ color: "#1c5ea8" }}>
                  ← Change industries
                </button>
              )}
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
          For each unit select <strong>Yes</strong> or <strong>No</strong> for workplace experience. If you have previously been deemed competent in the unit, also select <strong>I hold this unit</strong>. You must respond to every unit before
          submitting.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {/* Incomplete warning */}
      {showIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-semibold text-amber-800 mb-1">{totalCount - answeredCount} units still need a response</p>
          <p className="text-xs text-amber-700">Every unit requires a Yes or No response before you can submit. Please scroll through all sections — including the collapsed industries below — and complete any remaining units.</p>
          <button onClick={() => setShowIncomplete(false)} className="text-xs font-medium mt-2" style={{ color: "#b45309" }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Industries and units */}
      {orderedIndustries.map((industry) => {
        const units = UNITS.filter((u) => u.industry === industry.code);
        return <IndustrySection key={industry.code} industry={industry} units={units} responses={responses} onChange={handleResponse} isRelevant={relevantIndustries.includes(industry.code)} />;
      })}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Progress"}
        </button>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: pct === 100 ? "#32ba9a" : "#1c5ea8" }}>
          {pct === 100 ? "Submit & continue to profile →" : `Continue to profile → (${totalCount - answeredCount} remaining)`}
        </button>
      </div>
    </div>
  );
}
