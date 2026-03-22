import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const TAE_QUALIFICATIONS = [
  { code: "TAE40122", title: "Certificate IV in Training and Assessment" },
  { code: "TAE40116", title: "Certificate IV in Training and Assessment" },
  { code: "TAE50122", title: "Diploma of Vocational Education and Training" },
  { code: "TAE50216", title: "Diploma of Vocational Education and Training" },
  { code: "TAE80122", title: "Graduate Certificate in Adult Language, Literacy and Numeracy Practice" },
];

const TAE_SKILLSETS = [
  { code: "TAESS00001", title: "Assessor Skill Set" },
  { code: "TAESS00011", title: "Assessor Skill Set" },
  { code: "TAESS00014", title: "Enterprise Trainer and Assessor Skill Set" },
  { code: "TAESS00015", title: "Enterprise Trainer — Presenting Skill Set" },
];

// ── File upload component ──────────────────────────────────────────────────────
function FileUploadBox({ trainerId, documentType, label, hint, existingFile, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false); // ← must be at top, not after early return

  useEffect(() => {
    setFile(existingFile || null);
  }, [existingFile?.id]);

  const handleFile = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB");
      return;
    }
    setUploading(true);
    setError("");

    const ext = selected.name.split(".").pop();
    const safeType = documentType.replace(/[^a-zA-Z0-9]/g, "_");
    const path = `${trainerId}/${safeType}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from("evidence-files").upload(path, selected);
    if (uploadErr) {
      setError("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    const { data: record, error: insertErr } = await supabase
      .from("evidence_files")
      .insert({
        trainer_id: trainerId,
        file_name: selected.name,
        file_path: path,
        file_size: selected.size,
        document_type: documentType,
      })
      .select()
      .single();

    if (insertErr) {
      setError("Upload failed: " + insertErr.message);
      setUploading(false);
      return;
    }

    setFile(record);
    onUploaded?.(record);
    setUploading(false);
  };

  const handleRemove = async () => {
    if (!file) return;
    await supabase.storage.from("evidence-files").remove([file.file_path]);
    await supabase.from("evidence_files").delete().eq("id", file.id);
    setFile(null);
    onUploaded?.(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile({ target: { files: [dropped] } });
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#dcfce7" }}>
          <span className="text-sm">📎</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">{file.file_name}</p>
          <p className="text-xs" style={{ color: "#16a34a" }}>✓ Uploaded</p>
        </div>
        <button onClick={handleRemove} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all"
        style={{ borderColor: dragging ? "#1c5ea8" : "#d1d5db", backgroundColor: dragging ? "#eff6ff" : "#fafafa" }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: dragging ? "#dbeafe" : "#f3f4f6" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 13V4M10 4L7 7M10 4l3 3" stroke={dragging ? "#1c5ea8" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke={dragging ? "#1c5ea8" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">
            {uploading ? "Uploading..." : dragging ? "Drop to upload" : "Click to select or drag and drop"}
          </p>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
          <p className="text-xs text-gray-400 mt-1">PDF, DOCX, JPG, PNG — max 10MB</p>
        </div>
        <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFile} disabled={uploading} />
      </label>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ number, title, children, done }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-5" style={{ border: done ? "1px solid #86efac" : "1px solid #e5e7eb" }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{ backgroundColor: done ? "#166534" : "#081a47" }}>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: done ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.15)", color: "#fff" }}
        >
          {done ? "✓" : number}
        </div>
        <h3 className="text-sm font-semibold text-white flex-1">{title}</h3>
        {done && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
            Complete
          </span>
        )}
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

function Input({ value, onChange, placeholder, type = "text", disabled = false }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
    />
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
          style={
            value === opt
              ? { backgroundColor: "#e6f0ff", color: "#1c5ea8", borderColor: "#1c5ea8" }
              : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function QualificationDropdown({ value, onChange, placeholder }) {
  const [custom, setCustom] = useState(false);
  const allOptions = [
    { group: "Qualifications", items: TAE_QUALIFICATIONS },
    { group: "Skill Sets", items: TAE_SKILLSETS },
  ];
  const isKnown = [...TAE_QUALIFICATIONS, ...TAE_SKILLSETS].some((q) => `${q.code} ${q.title}` === value);

  useEffect(() => {
    if (value && !isKnown) setCustom(true);
  }, []);

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter qualification code and title"
          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={() => { setCustom(false); onChange(""); }}
          className="px-3 py-2.5 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          ← List
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={value || ""}
        onChange={(e) => {
          if (e.target.value === "__custom__") { setCustom(true); onChange(""); }
          else onChange(e.target.value);
        }}
        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400"
      >
        <option value="">{placeholder || "Select qualification or skill set"}</option>
        {allOptions.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map((q) => (
              <option key={q.code} value={`${q.code} ${q.title}`}>
                {q.code} — {q.title}
              </option>
            ))}
          </optgroup>
        ))}
        <option value="__custom__">Other — enter manually</option>
      </select>
    </div>
  );
}

// ── Section 3 — Industry qualifications table ──────────────────────────────────
function IndustryQualifications({ trainerId, saveRef }) {
  const [rows, setRows] = useState([{ qualification_code: "", qualification_title: "", provider_name: "", provider_id: "", issue_date: "" }]);

  useEffect(() => {
    if (!trainerId) return;
    supabase.from("industry_qualifications").select("*").eq("trainer_id", trainerId).then(({ data }) => {
      if (data && data.length > 0) setRows(data);
    });
  }, [trainerId]);

  useEffect(() => {
    if (saveRef) {
      saveRef.current = async () => {
        if (!trainerId) return;
        const upserts = rows
          .filter((r) => r.qualification_code || r.qualification_title)
          .map((r) => ({ ...r, trainer_id: trainerId }));
        if (upserts.length > 0) await supabase.from("industry_qualifications").upsert(upserts);
      };
    }
  }, [rows, trainerId, saveRef]);

  const updateRow = (i, field, value) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { qualification_code: "", qualification_title: "", provider_name: "", provider_id: "", issue_date: "" }]);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {["Qualification Code", "Title", "Provider Name", "Provider ID", "Issue Date"].map((h) => (
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
                  <input value={row.qualification_code || ""} onChange={(e) => updateRow(i, "qualification_code", e.target.value)} placeholder="MSL40122" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
                </td>
                <td className="px-2 py-2">
                  <input value={row.qualification_title || ""} onChange={(e) => updateRow(i, "qualification_title", e.target.value)} placeholder="Cert IV Laboratory Techniques" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
                </td>
                <td className="px-2 py-2">
                  <input value={row.provider_name || ""} onChange={(e) => updateRow(i, "provider_name", e.target.value)} placeholder="TAFE QLD" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
                </td>
                <td className="px-2 py-2">
                  <input value={row.provider_id || ""} onChange={(e) => updateRow(i, "provider_id", e.target.value)} placeholder="0275" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
                </td>
                <td className="px-2 py-2">
                  <input type="date" value={row.issue_date || ""} onChange={(e) => updateRow(i, "issue_date", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <button onClick={addRow} className="text-xs font-medium flex items-center gap-1" style={{ color: "#1c5ea8" }}>
          + Add qualification
        </button>
      </div>
    </div>
  );
}

// ── Main Profile component ─────────────────────────────────────────────────────
export default function Profile({ profile }) {
  const navigate = useNavigate();
  const [trainerId, setTrainerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState(null);
  const [experienceApproval, setExperienceApproval] = useState([]);
  const [taeFiles, setTaeFiles] = useState([]);       // ← array, supports multiple
  const [industryFiles, setIndustryFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const saveQualsRef = useRef(null);

  const [credentialChoice, setCredentialChoice] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    state: "",
    position: "",
    employment_status: "",
    phone: "",
    tae_qualification: "",
    tae_provider: "",
    tae_provider_id: "",
    tae_issue_date: "",
    under_direction_qualification: "",
    under_direction_provider: "",
    under_direction_provider_id: "",
    under_direction_commencement: "",
    declaration_credentials: false,
    declaration_copies: false,
    declaration_signature: "",
    declaration_date: "",
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    const { data: trainer } = await supabase.from("trainers").select("*").eq("email", profile.email).maybeSingle();
    if (!trainer) { setLoading(false); return; }

    setTrainerId(trainer.id);
    setForm((prev) => ({
      ...prev,
      full_name: trainer.full_name || "",
      state: trainer.state || "",
      position: trainer.position || "",
      employment_status: trainer.employment_status || "",
      phone: trainer.phone || "",
    }));

    const { data: existingProfile } = await supabase.from("trainer_profiles").select("*").eq("trainer_id", trainer.id).maybeSingle();
    if (existingProfile) {
      setForm((prev) => ({ ...prev, ...existingProfile }));
      setProfileStatus(existingProfile.profile_status || null);
      if (existingProfile.tae_qualification) setCredentialChoice("holds");
      else if (existingProfile.under_direction_qualification) setCredentialChoice("no_holds");
    }

    const { data: expData } = await supabase.from("industry_experience").select("unit_code, competency_confirmed").eq("trainer_id", trainer.id);
    setExperienceApproval(expData || []);

    const { data: files } = await supabase
      .from("evidence_files")
      .select("*")
      .eq("trainer_id", trainer.id)
      .in("document_type", ["TAE Credential", "TAE Enrolment Evidence", "Industry Qualification"]);

    if (files) {
      setTaeFiles(files.filter((f) => f.document_type === "TAE Credential" || f.document_type === "TAE Enrolment Evidence"));
      setIndustryFiles(files.filter((f) => f.document_type === "Industry Qualification"));
    }

    setLoading(false);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleCredentialChoice = (choice) => {
    setCredentialChoice(choice);
    if (choice === "holds") {
      updateForm("under_direction_qualification", "");
      updateForm("under_direction_provider", "");
      updateForm("under_direction_provider_id", "");
      updateForm("under_direction_commencement", "");
    } else {
      updateForm("tae_qualification", "");
      updateForm("tae_provider", "");
      updateForm("tae_provider_id", "");
      updateForm("tae_issue_date", "");
    }
    setSaved(false);
  };

  const handleSave = async () => {
    if (!trainerId) { setError("No trainer record found."); return; }
    setSaving(true);
    setError("");

    if (saveQualsRef.current) await saveQualsRef.current();

    await supabase.from("trainers").update({
      full_name: form.full_name,
      state: form.state,
      position: form.position,
      employment_status: form.employment_status,
      phone: form.phone,
    }).eq("id", trainerId);

    const { error: profileError } = await supabase.from("trainer_profiles").upsert(
      {
        trainer_id: trainerId,
        tae_qualification: form.tae_qualification,
        tae_provider: form.tae_provider,
        tae_provider_id: form.tae_provider_id,
        tae_issue_date: form.tae_issue_date || null,
        under_direction_qualification: form.under_direction_qualification,
        under_direction_provider: form.under_direction_provider,
        under_direction_provider_id: form.under_direction_provider_id,
        under_direction_commencement: form.under_direction_commencement || null,
        declaration_credentials: form.declaration_credentials,
        declaration_copies: form.declaration_copies,
        declaration_signature: form.declaration_signature,
        declaration_date: form.declaration_date || null,
        profile_status: "Draft",
      },
      { onConflict: "trainer_id" }
    );

    if (profileError) { setError("Failed to save profile: " + profileError.message); setSaving(false); return; }
    setSaved(true);
    setSaving(false);
  };

  const handleSubmit = async () => {
    await handleSave();
    navigate("/questionnaire");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading profile...</p>
      </div>
    );
  }

  // ── Section completion checks ──────────────────────────────────────────────
  const s1Done = !!(form.full_name && form.state && form.position && form.employment_status && form.phone);
  const s2Done = !!(form.tae_qualification || form.under_direction_qualification) && taeFiles.length > 0; // ← fixed
  const s4Done = !!(form.declaration_credentials && form.declaration_copies && form.declaration_signature && form.declaration_date);
  const s6Total = experienceApproval.length;
  const s6AllApproved = s6Total > 0 && experienceApproval.every((e) => e.competency_confirmed === true);
  const profileApproved = profileStatus === "Approved";

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>
      )}

      {/* Approval status banner */}
      {profileApproved && (
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #86efac" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#16a34a" }}>
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path d="M1 5.5l3.5 3.5L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#166534" }}>Profile Approved</p>
            <p className="text-xs" style={{ color: "#15803d" }}>Sections 1–4 have been verified and approved by the quality team.</p>
          </div>
          {s6AllApproved && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#166534" }}>
              ✓ All experience approved
            </span>
          )}
        </div>
      )}

      {/* Not-approved notice */}
      {!profileApproved && experienceApproval.some((e) => e.competency_confirmed === false) && (
        <div className="rounded-xl p-4 mb-5 flex items-center gap-3" style={{ backgroundColor: "#fef2f2", border: "1px solid #fca5a5" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#c93535" }}>
            <span className="text-white font-bold text-sm">!</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#c93535" }}>Some units require attention</p>
            <p className="text-xs text-gray-500">
              {experienceApproval.filter((e) => e.competency_confirmed === false).length} unit
              {experienceApproval.filter((e) => e.competency_confirmed === false).length !== 1 ? "s" : ""} in Section 6 were not approved.
              Please check your Industry Experience page for details.
            </p>
          </div>
        </div>
      )}

      {/* ── Section 1 ── */}
      <Section number="1" title="Section 1 — Trainer Assessor Details" done={s1Done}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FieldGroup label="Full Name">
            <Input value={form.full_name} onChange={(v) => updateForm("full_name", v)} placeholder="As per official ID" />
          </FieldGroup>
          <FieldGroup label="State">
            <select
              value={form.state || ""}
              onChange={(e) => updateForm("state", e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-blue-400"
            >
              <option value="">Select state</option>
              {["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FieldGroup>
        </div>
        <div className="mb-4">
          <FieldGroup label="Position">
            <RadioGroup
              options={["Trainer Assessor", "Trainer", "Assessor", "Industry Expert", "Qualified Secondary School Teacher"]}
              value={form.position}
              onChange={(v) => updateForm("position", v)}
            />
          </FieldGroup>
        </div>
        <div className="mb-4">
          <FieldGroup label="Employment Status">
            <RadioGroup
              options={["Full-time", "Part-time", "Casual", "Third-Party", "Under Direction"]}
              value={form.employment_status}
              onChange={(v) => updateForm("employment_status", v)}
            />
          </FieldGroup>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Phone">
            <Input value={form.phone} onChange={(v) => updateForm("phone", v)} placeholder="04XX XXX XXX" />
          </FieldGroup>
          <FieldGroup label="LTT Email">
            <Input value={profile?.email || ""} onChange={() => {}} placeholder="name@ltt.edu.au" disabled />
          </FieldGroup>
        </div>
      </Section>

      {/* ── Section 2 ── */}
      <Section number="2" title="Section 2 — Training Credentials" done={s2Done && profileApproved}>
        <p className="text-xs text-gray-500 mb-3">Select the option that applies to you:</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Option A — holds credential */}
          <button
            onClick={() => handleCredentialChoice("holds")}
            className="text-left p-4 rounded-xl border-2 transition-all"
            style={{ borderColor: credentialChoice === "holds" ? "#1c5ea8" : "#e5e7eb", backgroundColor: credentialChoice === "holds" ? "#e6f0ff" : "#fff" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ borderColor: credentialChoice === "holds" ? "#1c5ea8" : "#d1d5db", backgroundColor: credentialChoice === "holds" ? "#1c5ea8" : "transparent" }}
              >
                {credentialChoice === "holds" && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">I hold an approved Training and Assessment credential</p>
                <p className="text-xs text-gray-400 mt-1">You currently hold a TAE qualification or approved skill set</p>
              </div>
            </div>
          </button>

          {/* Option B — under direction */}
          <button
            onClick={() => handleCredentialChoice("no_holds")}
            className="text-left p-4 rounded-xl border-2 transition-all"
            style={{ borderColor: credentialChoice === "no_holds" ? "#1c5ea8" : "#e5e7eb", backgroundColor: credentialChoice === "no_holds" ? "#e6f0ff" : "#fff" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ borderColor: credentialChoice === "no_holds" ? "#1c5ea8" : "#d1d5db", backgroundColor: credentialChoice === "no_holds" ? "#1c5ea8" : "transparent" }}
              >
                {credentialChoice === "no_holds" && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">I do not hold an approved Training and Assessment credential</p>
                <p className="text-xs text-gray-400 mt-1">You are currently enrolled in or working towards a TAE qualification</p>
              </div>
            </div>
          </button>
        </div>

        {/* Holds credential — form + uploads */}
        {credentialChoice === "holds" && (
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Approved credential held for Training and/or Assessment</p>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <FieldGroup label="Qualification or Skill Set">
                <QualificationDropdown value={form.tae_qualification} onChange={(v) => updateForm("tae_qualification", v)} placeholder="Select qualification or skill set" />
              </FieldGroup>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <FieldGroup label="Provider Name">
                <Input value={form.tae_provider} onChange={(v) => updateForm("tae_provider", v)} placeholder="e.g. TAFE QLD" />
              </FieldGroup>
              <FieldGroup label="Provider ID">
                <Input value={form.tae_provider_id} onChange={(v) => updateForm("tae_provider_id", v)} placeholder="e.g. 0275" />
              </FieldGroup>
              <FieldGroup label="Issue Date">
                <Input type="date" value={form.tae_issue_date} onChange={(v) => updateForm("tae_issue_date", v)} />
              </FieldGroup>
            </div>
            {trainerId && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload a copy of your TAE qualification certificate *</p>
                <div className="space-y-2">
                  {taeFiles.map((f) => (
                    <FileUploadBox
                      key={f.id}
                      trainerId={trainerId}
                      documentType="TAE Credential"
                      label={f.file_name}
                      existingFile={f}
                      onUploaded={(updated) => {
                        if (!updated) setTaeFiles((prev) => prev.filter((x) => x.id !== f.id));
                        else setTaeFiles((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
                      }}
                    />
                  ))}
                  <FileUploadBox
                    trainerId={trainerId}
                    documentType="TAE Credential"
                    label="Upload TAE certificate or Statement of Attainment"
                    hint="This will be verified by the quality team"
                    existingFile={null}
                    onUploaded={(f) => { if (f) setTaeFiles((prev) => [...prev, f]); }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Under direction — form + uploads */}
        {credentialChoice === "no_holds" && (
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Credential currently enrolled in or working towards</p>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <FieldGroup label="Qualification or Skill Set">
                <QualificationDropdown value={form.under_direction_qualification} onChange={(v) => updateForm("under_direction_qualification", v)} placeholder="Select qualification or skill set" />
              </FieldGroup>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <FieldGroup label="Provider Name">
                <Input value={form.under_direction_provider} onChange={(v) => updateForm("under_direction_provider", v)} placeholder="e.g. TAFE QLD" />
              </FieldGroup>
              <FieldGroup label="Provider ID">
                <Input value={form.under_direction_provider_id} onChange={(v) => updateForm("under_direction_provider_id", v)} placeholder="e.g. 0275" />
              </FieldGroup>
              <FieldGroup label="Commencement Date">
                <Input type="date" value={form.under_direction_commencement} onChange={(v) => updateForm("under_direction_commencement", v)} />
              </FieldGroup>
            </div>
            {trainerId && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload evidence of enrolment *</p>
                <div className="space-y-2">
                  {taeFiles.map((f) => (
                    <FileUploadBox
                      key={f.id}
                      trainerId={trainerId}
                      documentType="TAE Enrolment Evidence"
                      label={f.file_name}
                      existingFile={f}
                      onUploaded={(updated) => {
                        if (!updated) setTaeFiles((prev) => prev.filter((x) => x.id !== f.id));
                        else setTaeFiles((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
                      }}
                    />
                  ))}
                  <FileUploadBox
                    trainerId={trainerId}
                    documentType="TAE Enrolment Evidence"
                    label="Upload confirmation of enrolment or letter from provider"
                    hint="e.g. enrolment confirmation email, letter from TAFE"
                    existingFile={null}
                    onUploaded={(f) => { if (f) setTaeFiles((prev) => [...prev, f]); }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Not yet chosen */}
        {credentialChoice === null && (
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "#f9fafb", border: "1px dashed #e5e7eb" }}>
            <p className="text-sm text-gray-400">Select an option above to continue</p>
          </div>
        )}
      </Section>

      {/* ── Section 3 ── */}
      <Section number="3" title="Section 3 — Industry Competencies" done={profileApproved}>
        <p className="text-xs text-gray-400 mb-4">List all current industry-related qualifications you hold, and upload a copy of each certificate.</p>
        <IndustryQualifications trainerId={trainerId} saveRef={saveQualsRef} />
        {trainerId && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upload copies of your industry qualification certificates *</p>
            <p className="text-xs text-gray-400 mb-3">Upload a separate file for each qualification. You can upload multiple files.</p>
            <div className="space-y-2">
              {industryFiles.map((f) => (
                <FileUploadBox
                  key={f.id}
                  trainerId={trainerId}
                  documentType="Industry Qualification"
                  label={f.file_name}
                  existingFile={f}
                  onUploaded={(updated) => {
                    if (!updated) setIndustryFiles((prev) => prev.filter((x) => x.id !== f.id));
                    else setIndustryFiles((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
                  }}
                />
              ))}
              <FileUploadBox
                trainerId={trainerId}
                documentType="Industry Qualification"
                label="Upload industry qualification certificate"
                hint="PDF, DOCX, JPG or PNG"
                existingFile={null}
                onUploaded={(f) => { if (f) setIndustryFiles((prev) => [...prev, f]); }}
              />
            </div>
          </div>
        )}
      </Section>

      {/* ── Section 4 ── */}
      <Section number="4" title="Section 4 — Credentials Declaration" done={s4Done}>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
          <label className="flex gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.declaration_credentials}
              onChange={(e) => updateForm("declaration_credentials", e.target.checked)}
              className="mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-gray-700">
              I declare the information provided above regarding my training and industry credentials is true and correct.
            </span>
          </label>
          <label className="flex gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.declaration_copies}
              onChange={(e) => updateForm("declaration_copies", e.target.checked)}
              className="mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-gray-700">
              I have copies of all qualifications, records of results, statements of attainment and a verifiable USI transcript which I will upload as part of this process.
            </span>
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

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          ← Back to Dashboard
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Draft"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#1c5ea8" }}
          >
            Save & Continue to Section 5 →
          </button>
        </div>
      </div>
    </div>
  );
}