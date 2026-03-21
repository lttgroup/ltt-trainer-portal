import { useEffect, useState } from "react";
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

function FieldGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400" />;
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
          style={value === opt ? { backgroundColor: "#e6f0ff", color: "#1c5ea8", borderColor: "#1c5ea8" } : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function Profile({ profile }) {
  const navigate = useNavigate();
  const [trainerId, setTrainerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [yesUnits, setYesUnits] = useState([]);

  // Form state
  const [form, setForm] = useState({
    // Section 1
    full_name: "",
    state: "",
    position: "",
    employment_status: "",
    phone: "",
    // Section 2
    tae_qualification: "",
    tae_provider: "",
    tae_issue_date: "",
    tae_verified_by: "",
    tae_copy_held: false,
    under_direction_qualification: "",
    under_direction_provider: "",
    under_direction_commencement: "",
    under_direction_verified_by: "",
    // Section 4
    declaration_credentials: false,
    declaration_copies: false,
    declaration_signature: "",
    declaration_date: "",
  });

  // Section 5 experience state
  const [experience, setExperience] = useState({});

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const { data: trainer } = await supabase.from("trainers").select("*").eq("email", profile.email).maybeSingle();

    if (!trainer) {
      setLoading(false);
      return;
    }

    setTrainerId(trainer.id);

    // Pre-fill section 1 from trainer record
    setForm((prev) => ({
      ...prev,
      full_name: trainer.full_name || "",
      state: trainer.state || "",
      position: trainer.position || "",
      employment_status: trainer.employment_status || "",
      phone: trainer.phone || "",
    }));

    // Load existing profile
    const { data: existingProfile } = await supabase.from("trainer_profiles").select("*").eq("trainer_id", trainer.id).maybeSingle();

    if (existingProfile) {
      setForm((prev) => ({ ...prev, ...existingProfile }));
    }

    // Load yes responses for Section 5
    const { data: responses } = await supabase.from("questionnaire_responses").select("*").eq("trainer_id", trainer.id).eq("response", "yes");

    if (responses) {
      const units = responses.map((r) => UNITS.find((u) => u.code === r.unit_code)).filter(Boolean);
      setYesUnits(units);

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
    }

    setLoading(false);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const updateExperience = (unitCode, field, value) => {
    setExperience((prev) => ({
      ...prev,
      [unitCode]: { ...prev[unitCode], [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!trainerId) {
      setError("No trainer record found.");
      return;
    }

    setSaving(true);
    setError("");

    // Update trainer record (Section 1)
    await supabase
      .from("trainers")
      .update({
        full_name: form.full_name,
        state: form.state,
        position: form.position,
        employment_status: form.employment_status,
        phone: form.phone,
      })
      .eq("id", trainerId);

    // Upsert trainer profile (Sections 2-4)
    const { error: profileError } = await supabase.from("trainer_profiles").upsert(
      {
        trainer_id: trainerId,
        tae_qualification: form.tae_qualification,
        tae_provider: form.tae_provider,
        tae_issue_date: form.tae_issue_date || null,
        tae_verified_by: form.tae_verified_by,
        tae_copy_held: form.tae_copy_held,
        under_direction_qualification: form.under_direction_qualification,
        under_direction_provider: form.under_direction_provider,
        under_direction_commencement: form.under_direction_commencement || null,
        under_direction_verified_by: form.under_direction_verified_by,
        declaration_credentials: form.declaration_credentials,
        declaration_copies: form.declaration_copies,
        declaration_signature: form.declaration_signature,
        declaration_date: form.declaration_date || null,
        profile_status: "Draft",
      },
      { onConflict: "trainer_id" },
    );

    if (profileError) {
      setError("Failed to save profile: " + profileError.message);
      setSaving(false);
      return;
    }

    // Save Section 5 experience entries
    if (Object.keys(experience).length > 0) {
      const expUpserts = Object.entries(experience).map(([unitCode, data]) => ({
        trainer_id: trainerId,
        unit_code: unitCode,
        unit_title: UNITS.find((u) => u.code === unitCode)?.title || "",
        experience_description: data.experience_description,
        professional_development: data.professional_development,
        competency_confirmed: data.competency_confirmed,
      }));

      await supabase.from("industry_experience").upsert(expUpserts, { onConflict: "trainer_id,unit_code" });
    }

    setSaved(true);
    setSaving(false);
  };

  const handleSubmit = async () => {
    await handleSave();

    // Update profile status to Submitted
    await supabase
      .from("trainer_profiles")
      .update({
        profile_status: "Submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("trainer_id", trainerId);

    // Update trainer compliance status
    await supabase.from("trainers").update({ compliance_status: "Pending" }).eq("id", trainerId);

    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

      {/* Section 1 */}
      <Section number="1" title="Section 1 — Trainer Assessor Details">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FieldGroup label="Full Name">
            <Input value={form.full_name} onChange={(v) => updateForm("full_name", v)} placeholder="As per official ID" />
          </FieldGroup>
          <FieldGroup label="State">
            <select value={form.state || ""} onChange={(e) => updateForm("state", e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400">
              <option value="">Select state</option>
              {["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>

        <div className="mb-4">
          <FieldGroup label="Position">
            <RadioGroup options={["Trainer Assessor", "Trainer", "Assessor", "Industry Expert", "Qualified Secondary School Teacher"]} value={form.position} onChange={(v) => updateForm("position", v)} />
          </FieldGroup>
        </div>

        <div className="mb-4">
          <FieldGroup label="Employment Status">
            <RadioGroup options={["Full-time", "Part-time", "Casual", "Third-Party", "Under Direction"]} value={form.employment_status} onChange={(v) => updateForm("employment_status", v)} />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Phone">
            <Input value={form.phone} onChange={(v) => updateForm("phone", v)} placeholder="04XX XXX XXX" />
          </FieldGroup>
          <FieldGroup label="LTT Email">
            <Input value={profile?.email || ""} onChange={() => {}} placeholder="name@ltt.edu.au" />
          </FieldGroup>
        </div>
      </Section>

      {/* Section 2 */}
      <Section number="2" title="Section 2 — Training Credentials">
        <p className="text-xs text-gray-400 mb-4">Approved credential held for Training and/or Assessment</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FieldGroup label="Qualification Code and Title">
            <Input value={form.tae_qualification} onChange={(v) => updateForm("tae_qualification", v)} placeholder="e.g. TAE40122 Cert IV Training & Assessment" />
          </FieldGroup>
          <FieldGroup label="Provider Name and ID">
            <Input value={form.tae_provider} onChange={(v) => updateForm("tae_provider", v)} placeholder="e.g. TAFE QLD 0275" />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <FieldGroup label="Issue Date">
            <Input type="date" value={form.tae_issue_date} onChange={(v) => updateForm("tae_issue_date", v)} />
          </FieldGroup>
          <FieldGroup label="Verified By">
            <Input value={form.tae_verified_by} onChange={(v) => updateForm("tae_verified_by", v)} placeholder="Initials" />
          </FieldGroup>
          <FieldGroup label="Copy Held">
            <RadioGroup options={["Yes", "No"]} value={form.tae_copy_held ? "Yes" : "No"} onChange={(v) => updateForm("tae_copy_held", v === "Yes")} />
          </FieldGroup>
        </div>

        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-xs text-gray-400 mb-4">If training under direction — credential enrolled in</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FieldGroup label="Qualification Code and Title">
              <Input value={form.under_direction_qualification} onChange={(v) => updateForm("under_direction_qualification", v)} placeholder="Qualification currently enrolled in" />
            </FieldGroup>
            <FieldGroup label="Provider Name and ID">
              <Input value={form.under_direction_provider} onChange={(v) => updateForm("under_direction_provider", v)} placeholder="Provider name + ID" />
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Commencement Date">
              <Input type="date" value={form.under_direction_commencement} onChange={(v) => updateForm("under_direction_commencement", v)} />
            </FieldGroup>
            <FieldGroup label="Verified By">
              <Input value={form.under_direction_verified_by} onChange={(v) => updateForm("under_direction_verified_by", v)} placeholder="Initials" />
            </FieldGroup>
          </div>
        </div>
      </Section>

      {/* Section 3 */}
      <Section number="3" title="Section 3 — Industry Competencies">
        <p className="text-xs text-gray-400 mb-4">List all current industry-related qualifications you hold</p>
        <IndustryQualifications trainerId={trainerId} />
      </Section>

      {/* Section 4 */}
      <Section number="4" title="Section 4 — Credentials Declaration">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <label className="flex gap-3 cursor-pointer">
            <input type="checkbox" checked={form.declaration_credentials} onChange={(e) => updateForm("declaration_credentials", e.target.checked)} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">I declare the information provided above regarding my training and industry credentials is true and correct.</span>
          </label>
          <label className="flex gap-3 cursor-pointer">
            <input type="checkbox" checked={form.declaration_copies} onChange={(e) => updateForm("declaration_copies", e.target.checked)} className="mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">I have provided copies of all qualifications, records of results, statements of attainment and a verifiable USI transcript.</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Signature (type full legal name)">
            <Input value={form.declaration_signature} onChange={(v) => updateForm("declaration_signature", v)} placeholder="Type your full legal name" />
          </FieldGroup>
          <FieldGroup label="Date">
            <Input type="date" value={form.declaration_date} onChange={(v) => updateForm("declaration_date", v)} />
          </FieldGroup>
        </div>
      </Section>

      {/* Section 5 */}
      <Section number="5" title="Section 5 — Industry Experience, Skills and Currency">
        {yesUnits.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400 mb-3">No units marked as Yes in your Skills Questionnaire yet.</p>
            <button onClick={() => navigate("/questionnaire")} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
              Complete Skills Questionnaire first
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-gray-400">For each unit you indicated Yes in the Skills Questionnaire, describe your workplace experience below.</p>
            {yesUnits.map((unit) => (
              <div key={unit.code} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold px-2 py-1 rounded font-mono" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                    {unit.code}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{unit.title}</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <FieldGroup label="Industry Experience Description">
                    <textarea
                      value={experience[unit.code]?.experience_description || ""}
                      onChange={(e) => updateExperience(unit.code, "experience_description", e.target.value)}
                      placeholder="Describe your experience, skills and knowledge related to this unit. Include specific workplace examples..."
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                      rows={4}
                    />
                  </FieldGroup>
                  <FieldGroup label="Relevant Training / Professional Development">
                    <textarea
                      value={experience[unit.code]?.professional_development || ""}
                      onChange={(e) => updateExperience(unit.code, "professional_development", e.target.value)}
                      placeholder="List any relevant qualifications, units or CPD activities..."
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
                      rows={4}
                    />
                  </FieldGroup>
                </div>
                <div className="px-4 pb-4">
                  <FieldGroup label="Competency Confirmation">
                    <RadioGroup
                      options={["Yes — I confirm experience, skills and knowledge", "No"]}
                      value={experience[unit.code]?.competency_confirmed ? "Yes — I confirm experience, skills and knowledge" : experience[unit.code]?.competency_confirmed === false ? "No" : ""}
                      onChange={(v) => updateExperience(unit.code, "competency_confirmed", v === "Yes — I confirm experience, skills and knowledge")}
                    />
                  </FieldGroup>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button onClick={() => navigate("/questionnaire")} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
          ← Back to Questionnaire
        </button>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Draft"}
          </button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1c5ea8" }}>
            Submit for Review ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// Industry qualifications sub-component (Section 3)
function IndustryQualifications({ trainerId }) {
  const [rows, setRows] = useState([{ qualification_code: "", qualification_title: "", provider_name: "", provider_id: "", issue_date: "", verified_by: "", copy_held: false }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!trainerId) return;
    supabase
      .from("industry_qualifications")
      .select("*")
      .eq("trainer_id", trainerId)
      .then(({ data }) => {
        if (data && data.length > 0) setRows(data);
      });
  }, [trainerId]);

  const updateRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setSaved(false);
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        qualification_code: "",
        qualification_title: "",
        provider_name: "",
        provider_id: "",
        issue_date: "",
        verified_by: "",
        copy_held: false,
      },
    ]);
  };

  const saveQuals = async () => {
    if (!trainerId) return;
    setSaving(true);
    const upserts = rows.filter((r) => r.qualification_code || r.qualification_title).map((r) => ({ ...r, trainer_id: trainerId }));

    await supabase.from("industry_qualifications").upsert(upserts);

    setSaved(true);
    setSaving(false);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {["Qual Code", "Title", "Provider", "Issue Date", "Verified By", "Copy Held"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-2 py-2">
                  <input
                    value={row.qualification_code || ""}
                    onChange={(e) => updateRow(i, "qualification_code", e.target.value)}
                    placeholder="MSL40122"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.qualification_title || ""}
                    onChange={(e) => updateRow(i, "qualification_title", e.target.value)}
                    placeholder="Cert IV Laboratory Techniques"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.provider_name || ""}
                    onChange={(e) => updateRow(i, "provider_name", e.target.value)}
                    placeholder="TAFE QLD 0275"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-2 py-2">
                  <input type="date" value={row.issue_date || ""} onChange={(e) => updateRow(i, "issue_date", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.verified_by || ""}
                    onChange={(e) => updateRow(i, "verified_by", e.target.value)}
                    placeholder="Initials"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-2 py-2">
                  <select value={row.copy_held ? "Yes" : "No"} onChange={(e) => updateRow(i, "copy_held", e.target.value === "Yes")} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none">
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button onClick={addRow} className="text-xs font-medium flex items-center gap-1" style={{ color: "#1c5ea8" }}>
          + Add qualification
        </button>
        <button onClick={saveQuals} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
