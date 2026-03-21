import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS, INDUSTRIES } from "../lib/units";

const RESPONSE_OPTIONS = [
  { value: "yes", label: "Yes", bg: "#e6f9f4", color: "#0f7a5a", border: "#32ba9a" },
  { value: "no", label: "No", bg: "#fdeaea", color: "#c93535", border: "#c93535" },
];

// ─── STEP 1: Industry Selection ───
function Step1({ onContinue }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (code) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const unitCount = (code) => UNITS.filter((u) => u.industry === code).length;
  const selectedUnitCount = [...selected].reduce((a, c) => a + unitCount(c), 0);
  const unselectedUnitCount = UNITS.length - selectedUnitCount;
  const unselectedIndustries = INDUSTRIES.filter((i) => !selected.has(i.code));

  return (
    <div>
      <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: "#081a47" }}>
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
          STEP 1 OF 3
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Select your relevant industries</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Select all industries where you have workplace experience. You will be asked to confirm no experience in the remaining industries, then complete unit-level questions for your selected industries only.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {INDUSTRIES.map((ind) => {
          const count = unitCount(ind.code);
          const isSelected = selected.has(ind.code);
          return (
            <button
              key={ind.code}
              onClick={() => toggle(ind.code)}
              className="text-left rounded-xl p-4 transition-all"
              style={{
                backgroundColor: isSelected ? "#e6f0ff" : "#fff",
                border: isSelected ? "2px solid #1c5ea8" : "1px solid #e5e7eb",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded mb-2 inline-block font-mono"
                    style={{
                      backgroundColor: isSelected ? "#1c5ea8" : "#f0f4f8",
                      color: isSelected ? "#fff" : "#1c5ea8",
                    }}
                  >
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

      {selected.size > 0 && (
        <div className="rounded-xl p-4 mb-5 text-sm" style={{ backgroundColor: "#f0f5ff", border: "1px solid #c7d9f5" }}>
          <p style={{ color: "#1c5ea8" }}>
            <strong>
              {selected.size} industr{selected.size === 1 ? "y" : "ies"} selected
            </strong>{" "}
            — {selectedUnitCount} units to complete actively.
            {unselectedIndustries.length > 0 && (
              <span style={{ color: "#4b7dc8" }}>
                {" "}
                {unselectedUnitCount} units across {unselectedIndustries.length} other industr{unselectedIndustries.length === 1 ? "y" : "ies"} will be reviewed for confirmation in the next step.
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Select at least one industry to continue</p>
        <button onClick={() => onContinue([...selected])} disabled={selected.size === 0} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: selected.size === 0 ? "#9ca3af" : "#1c5ea8" }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2: Confirm No Experience ───
function Step2({ relevantIndustries, onConfirm, onBack }) {
  const [confirmed, setConfirmed] = useState(false);

  const unselectedIndustries = INDUSTRIES.filter((i) => !relevantIndustries.includes(i.code));

  const totalUnits = unselectedIndustries.reduce((a, i) => a + UNITS.filter((u) => u.industry === i.code).length, 0);

  if (unselectedIndustries.length === 0) {
    onConfirm();
    return null;
  }

  return (
    <div>
      <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: "#081a47" }}>
        <div className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}>
          STEP 2 OF 3
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Confirm no experience in remaining industries</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          The {totalUnits} units below will be automatically recorded as <strong>No</strong> based on your industry selections. Please review carefully and confirm.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        {unselectedIndustries.map((ind, idx) => {
          const units = UNITS.filter((u) => u.industry === ind.code);
          return (
            <div key={ind.code} className={idx < unselectedIndustries.length - 1 ? "mb-6 pb-6 border-b border-gray-100" : ""}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded font-mono" style={{ backgroundColor: "#f0f4f8", color: "#1c5ea8" }}>
                  {ind.code}
                </span>
                <span className="text-sm font-semibold text-gray-800">{ind.name}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {units.length} unit{units.length !== 1 ? "s" : ""} → marked No
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {units.map((unit) => (
                  <div key={unit.code} className="rounded-lg p-2.5" style={{ backgroundColor: "#fdeaea", border: "0.5px solid #fca5a5" }}>
                    <div className="text-xs font-bold font-mono mb-1" style={{ color: "#c93535" }}>
                      {unit.code}
                    </div>
                    <div className="text-xs leading-snug" style={{ color: "#7f1d1d" }}>
                      {unit.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning */}
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "#fff8ed", border: "1px solid #fcd34d" }}>
        <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Please review carefully before confirming</p>
        <p className="text-xs text-amber-700 mb-2">
          If you have <strong>any</strong> experience in an industry listed above — even partial experience in just one unit — you should go back and select that industry. All units within unselected industries will be permanently recorded as No.
        </p>
        <button onClick={onBack} className="text-xs font-semibold underline" style={{ color: "#b45309" }}>
          ← Go back and review my industry selections
        </button>
      </div>

      {/* Confirmation checkbox */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: "#fff8ed", border: "1px solid #fcd34d" }}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 flex-shrink-0" style={{ accentColor: "#081a47" }} />
          <span className="text-sm text-gray-700">
            I confirm that I have <strong>no workplace experience</strong> in the industries listed above. I understand that all {totalUnits} units within these industries will be recorded as <strong>No</strong> on my Skills Questionnaire.
          </span>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onBack} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          ← Back to industry selection
        </button>
        <button onClick={onConfirm} disabled={!confirmed} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: confirmed ? "#1c5ea8" : "#9ca3af" }}>
          Confirm and continue →
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
    <div className="bg-white rounded-xl overflow-hidden mb-3 border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
          {unit.code}
        </span>
        <p className="text-sm font-medium text-gray-800 flex-1 leading-snug">{unit.title}</p>
        {exp && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: exp === "yes" ? "#e6f9f4" : "#fdeaea",
              color: exp === "yes" ? "#0f7a5a" : "#c93535",
            }}
          >
            {exp === "yes" ? "✓ Yes" : "✗ No"}
            {holds ? " + holds unit" : ""}
          </span>
        )}
      </div>

      {/* Experience question */}
      <div className="px-5 pb-2">
        <p className="text-sm text-gray-600 leading-relaxed">{unit.question}</p>
      </div>

      {/* Expandable elements */}
      <div className="px-5 pb-2">
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-medium" style={{ color: "#1c5ea8" }}>
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
      <div className="px-5 py-3 border-t border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
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

        {/* I hold this unit */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
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
function IndustrySection({ industry, units, responses, onChange }) {
  const answered = units.filter((u) => responses[u.code]?.experience).length;
  const total = units.length;
  const allAnswered = answered === total;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border text-left transition-all" style={{ backgroundColor: "#081a47", borderColor: "#081a47" }}>
        <span className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}>
          {industry.code}
        </span>
        <span className="text-sm font-semibold text-white flex-1">{industry.name}</span>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            backgroundColor: allAnswered ? "#e6f9f4" : "rgba(255,255,255,0.15)",
            color: allAnswered ? "#0f7a5a" : "#fff",
          }}
        >
          {answered}/{total} answered
        </span>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px" }}>{collapsed ? "▼" : "▲"}</span>
      </button>

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

// ─── STEP 3: Unit Questions ───
function Step3({ relevantIndustries, responses, onChange, onSave, onSubmit, saving, saved, error }) {
  const [showIncomplete, setShowIncomplete] = useState(false);

  const relevantUnits = UNITS.filter((u) => relevantIndustries.includes(u.industry));
  const answeredCount = relevantUnits.filter((u) => responses[u.code]?.experience).length;
  const totalCount = relevantUnits.length;
  const pct = Math.round((answeredCount / totalCount) * 100);

  const handleSubmitClick = () => {
    const unanswered = relevantUnits.filter((u) => !responses[u.code]?.experience);
    if (unanswered.length > 0) {
      setShowIncomplete(true);
      return;
    }
    onSubmit();
  };

  const orderedIndustries = INDUSTRIES.filter((i) => relevantIndustries.includes(i.code));

  return (
    <div>
      {/* Progress header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Step 3 of 3</div>
            <h2 className="text-sm font-semibold text-gray-800">Skills Questionnaire — your selected industries</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {answeredCount} of {totalCount} units completed
            </p>
          </div>
          <span className="text-2xl font-bold" style={{ color: pct === 100 ? "#32ba9a" : "#1c5ea8" }}>
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
          Select <strong>Yes</strong> or <strong>No</strong> for each unit. If you have previously been deemed competent, also select <strong>I hold this unit</strong>.
        </p>
      </div>

      {showIncomplete && (
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: "#fff8ed", border: "1px solid #fcd34d" }}>
          <p className="text-sm font-semibold text-amber-800 mb-1">
            {totalCount - answeredCount} unit{totalCount - answeredCount !== 1 ? "s" : ""} still need a response
          </p>
          <p className="text-xs text-amber-700">Please scroll through each section and complete all remaining units before submitting.</p>
          <button onClick={() => setShowIncomplete(false)} className="text-xs font-medium mt-2" style={{ color: "#b45309" }}>
            Dismiss
          </button>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {orderedIndustries.map((industry) => (
        <IndustrySection key={industry.code} industry={industry} units={UNITS.filter((u) => u.industry === industry.code)} responses={responses} onChange={onChange} />
      ))}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={onSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save progress"}
        </button>
        <button onClick={handleSubmitClick} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: pct === 100 ? "#32ba9a" : "#1c5ea8" }}>
          {pct === 100 ? "Submit & continue to Industry Experience →" : `Submit & continue → (${totalCount - answeredCount} remaining)`}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ───
export default function Questionnaire({ profile }) {
  const navigate = useNavigate();
  const topRef = useRef(null);
  const [step, setStep] = useState(1);
  const [relevantIndustries, setRelevantIndustries] = useState([]);
  const [trainerId, setTrainerId] = useState(null);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const answeredIndustries = new Set(
        existing
          .filter((r) => r.response === "yes")
          .map((r) => UNITS.find((u) => u.code === r.unit_code)?.industry)
          .filter(Boolean),
      );
      if (answeredIndustries.size > 0) {
        setRelevantIndustries([...answeredIndustries]);
        setStep(3);
      } else {
        setStep(1);
      }
    }

    setLoading(false);
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const handleConfirmStep2 = async () => {
    if (!trainerId) return;

    const unselectedUnits = UNITS.filter((u) => !relevantIndustries.includes(u.industry));

    const upserts = unselectedUnits.map((unit) => ({
      trainer_id: trainerId,
      unit_code: unit.code,
      unit_title: unit.title,
      industry: unit.industry,
      response: "no",
      holds_unit: false,
    }));

    await supabase.from("questionnaire_responses").upsert(upserts, { onConflict: "trainer_id,unit_code" });

    const updated = { ...responses };
    unselectedUnits.forEach((unit) => {
      updated[unit.code] = { experience: "no", holds: false };
    });
    setResponses(updated);
    setStep(3);
    scrollToTop();
  };

  const handleSubmit = async () => {
    await handleSave();
    navigate("/experience");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading questionnaire...</p>
      </div>
    );
  }

  return (
    <div>
      <div ref={topRef} />

      {step === 1 && (
        <Step1
          onContinue={(selected) => {
            setRelevantIndustries(selected);
            setStep(2);
            scrollToTop();
          }}
        />
      )}

      {step === 2 && (
        <Step2
          relevantIndustries={relevantIndustries}
          onConfirm={handleConfirmStep2}
          onBack={() => {
            setStep(1);
            scrollToTop();
          }}
        />
      )}

      {step === 3 && <Step3 relevantIndustries={relevantIndustries} responses={responses} onChange={handleResponse} onSave={handleSave} onSubmit={handleSubmit} saving={saving} saved={saved} error={error} />}
    </div>
  );
}
