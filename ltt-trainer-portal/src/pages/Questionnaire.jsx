import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { UNITS, INDUSTRIES } from "../lib/units";

// ─── UNIT CARD ───────────────────────────────────────────────────────────────
function UnitCard({ unit, response, onChange }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white rounded-xl overflow-hidden mb-2 border transition-all"
      style={{
        borderColor: response ? "#e5e7eb" : "#e5e7eb",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded font-mono flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
          {unit.code}
        </span>
        <p className="text-sm font-medium text-gray-800 flex-1 leading-snug">{unit.title}</p>
        {response && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              backgroundColor: response === "yes" ? "#e6f9f4" : "#fdeaea",
              color: response === "yes" ? "#0f7a5a" : "#c93535",
            }}
          >
            {response === "yes" ? "✓ Yes" : "✗ No"}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="px-4 pb-2">
        <p className="text-sm text-gray-600 leading-relaxed">{unit.question}</p>
      </div>

      {/* Elements toggle */}
      <div className="px-4 pb-2">
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

      {/* Yes / No */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100" style={{ backgroundColor: "#f9fafb" }}>
        <span className="text-xs text-gray-400 mr-1 flex-shrink-0">Workplace experience:</span>
        {[
          { value: "yes", label: "Yes", bg: "#e6f9f4", color: "#0f7a5a", border: "#32ba9a" },
          { value: "no", label: "No", bg: "#fdeaea", color: "#c93535", border: "#c93535" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(unit.code, response === opt.value ? null : opt.value)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border"
            style={response === opt.value ? { backgroundColor: opt.bg, color: opt.color, borderColor: opt.border } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
          >
            {response === opt.value ? "✓ " : ""}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── INDUSTRY SECTION ────────────────────────────────────────────────────────
function IndustrySection({ industry, units, responses, onChange }) {
  const answered = units.filter((u) => responses[u.code]).length;
  const total = units.length;
  const allAnswered = answered === total;

  // Auto-collapse when all answered, allow manual toggle
  const [collapsed, setCollapsed] = useState(false);
  const prevAllAnswered = useRef(false);

  useEffect(() => {
    if (allAnswered && !prevAllAnswered.current) {
      setCollapsed(true);
    }
    prevAllAnswered.current = allAnswered;
  }, [allAnswered]);

  return (
    <div className="mb-3">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-left transition-all"
        style={{
          backgroundColor: allAnswered ? "#e6f9f4" : "#081a47",
          border: allAnswered ? "1px solid #32ba9a" : "none",
        }}
      >
        <span
          className="text-xs font-bold px-2.5 py-1 rounded font-mono flex-shrink-0"
          style={{
            backgroundColor: allAnswered ? "#32ba9a" : "rgba(255,255,255,0.15)",
            color: allAnswered ? "#fff" : "#fff",
          }}
        >
          {industry.code}
        </span>
        <span className="text-sm font-semibold flex-1" style={{ color: allAnswered ? "#0f7a5a" : "#fff" }}>
          {industry.name}
        </span>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            backgroundColor: allAnswered ? "#32ba9a" : "rgba(255,255,255,0.15)",
            color: "#fff",
          }}
        >
          {answered}/{total}
        </span>
        {allAnswered && (
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#0f7a5a" }}>
            ✓ Complete
          </span>
        )}
        <span
          style={{
            color: allAnswered ? "#0f7a5a" : "rgba(255,255,255,0.6)",
            fontSize: "11px",
          }}
        >
          {collapsed ? "▼" : "▲"}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-2">
          {units.map((unit) => (
            <UnitCard key={unit.code} unit={unit} response={responses[unit.code]} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Questionnaire({ profile }) {
  const navigate = useNavigate();
  const topRef = useRef(null);

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
        mapped[r.unit_code] = r.response;
      });
      setResponses(mapped);
    }

    setLoading(false);
  };

  const handleResponse = (unitCode, value) => {
    setResponses((prev) => {
      const updated = { ...prev };
      if (value === null) {
        delete updated[unitCode];
      } else {
        updated[unitCode] = value;
      }
      return updated;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!trainerId) return;
    setSaving(true);
    setError("");

    const upserts = Object.entries(responses).map(([unitCode, response]) => {
      const unit = UNITS.find((u) => u.code === unitCode);
      return {
        trainer_id: trainerId,
        unit_code: unitCode,
        unit_title: unit?.title || "",
        industry: unit?.industry || "",
        response,
        holds_unit: false,
      };
    });

    // Delete any responses that were cleared
    const clearedCodes = UNITS.map((u) => u.code).filter((code) => !responses[code]);

    if (clearedCodes.length > 0 && Object.keys(responses).length > 0) {
      await supabase.from("questionnaire_responses").delete().eq("trainer_id", trainerId).in("unit_code", clearedCodes);
    }

    if (upserts.length > 0) {
      const { error: saveError } = await supabase.from("questionnaire_responses").upsert(upserts, { onConflict: "trainer_id,unit_code" });

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
    const unanswered = UNITS.filter((u) => !responses[u.code]);
    if (unanswered.length > 0) {
      setShowIncomplete(true);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    await handleSave();
    navigate("/experience");
  };

  const answeredCount = Object.keys(responses).length;
  const totalCount = UNITS.length;
  const pct = Math.round((answeredCount / totalCount) * 100);

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

      {/* Progress header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Section 5 — Skills Questionnaire</h2>
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
          Select <strong>Yes</strong> or <strong>No</strong> for each unit. Each industry section will collapse automatically once all units are answered. You must respond to every unit before submitting.
        </p>
      </div>

      {/* Incomplete warning */}
      {showIncomplete && (
        <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: "#fff8ed", border: "1px solid #fcd34d" }}>
          <p className="text-sm font-semibold text-amber-800 mb-1">
            {totalCount - answeredCount} unit{totalCount - answeredCount !== 1 ? "s" : ""} still need a response
          </p>
          <p className="text-xs text-amber-700">Please scroll through all sections and complete every unit. Completed sections will collapse automatically to help you track your progress.</p>
          <button onClick={() => setShowIncomplete(false)} className="text-xs font-medium mt-2" style={{ color: "#b45309" }}>
            Dismiss
          </button>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {/* Industry sections */}
      {INDUSTRIES.map((industry) => (
        <IndustrySection key={industry.code} industry={industry} units={UNITS.filter((u) => u.industry === industry.code)} responses={responses} onChange={handleResponse} />
      ))}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save progress"}
        </button>
        <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: pct === 100 ? "#32ba9a" : "#1c5ea8" }}>
          {pct === 100 ? "Submit & continue to Section 6 →" : `Submit & continue → (${totalCount - answeredCount} remaining)`}
        </button>
      </div>
    </div>
  );
}
