import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const CREDENTIAL_TYPES = ["TAE Qualification", "Industry Qualification", "Statement of Attainment", "USI Transcript", "Enrolment Confirmation", "CPD Activity", "Employment Reference", "Other"];

const TYPE_STYLES = {
  "TAE Qualification": { bg: "#e6f0ff", color: "#1c5ea8" },
  "Industry Qualification": { bg: "#e6f9f4", color: "#0f7a5a" },
  "Statement of Attainment": { bg: "#e6f9f4", color: "#0f7a5a" },
  "USI Transcript": { bg: "#fdf3e0", color: "#b8711a" },
  "Enrolment Confirmation": { bg: "#fdf3e0", color: "#b8711a" },
  "CPD Activity": { bg: "#f3e6ff", color: "#7c3aed" },
  "Employment Reference": { bg: "#f1f5f9", color: "#475569" },
  Other: { bg: "#f1f5f9", color: "#475569" },
};

function AddCredentialModal({ trainers, onClose, onSuccess }) {
  const [form, setForm] = useState({
    trainer_id: "",
    credential_name: "",
    credential_type: "TAE Qualification",
    provider_name: "",
    issue_date: "",
    expiry_date: "",
    verified_by: "",
    copy_held: true,
    next_review_date: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.trainer_id || !form.credential_name) {
      setError("Please select a trainer and enter a credential name.");
      return;
    }
    setSaving(true);
    const { data, error: saveError } = await supabase.from("credential_register").insert(form).select().single();

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
    } else {
      onSuccess(data);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Add Credential</h2>
            <p className="text-sm text-gray-400 mt-0.5">Add to the credential register</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Trainer</label>
            <select required value={form.trainer_id} onChange={(e) => update("trainer_id", e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
              <option value="">Select trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Credential Name</label>
            <input
              required
              type="text"
              value={form.credential_name}
              onChange={(e) => update("credential_name", e.target.value)}
              placeholder="e.g. TAE40122 Certificate IV in Training and Assessment"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Credential Type</label>
            <select value={form.credential_type} onChange={(e) => update("credential_type", e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Provider</label>
              <input
                type="text"
                value={form.provider_name}
                onChange={(e) => update("provider_name", e.target.value)}
                placeholder="Provider name + ID"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Verified By</label>
              <input
                type="text"
                value={form.verified_by}
                onChange={(e) => update("verified_by", e.target.value)}
                placeholder="Initials"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={(e) => update("issue_date", e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Next Review Date</label>
              <input type="date" value={form.next_review_date} onChange={(e) => update("next_review_date", e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="copy_held" checked={form.copy_held} onChange={(e) => update("copy_held", e.target.checked)} />
            <label htmlFor="copy_held" className="text-sm text-gray-700 cursor-pointer">
              Copy held on file
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1c5ea8" }}>
              {saving ? "Saving..." : "Add Credential"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CredentialRegister() {
  const [credentials, setCredentials] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: creds }, { data: trainerData }] = await Promise.all([
      supabase.from("credential_register").select("*, trainers(full_name)").order("created_at", { ascending: false }),
      supabase.from("trainers").select("id, full_name").order("full_name"),
    ]);

    setCredentials(creds || []);
    setTrainers(trainerData || []);
    setLoading(false);
  };

  const handleAddSuccess = (newCred) => {
    setCredentials((prev) => [newCred, ...prev]);
    setShowModal(false);
    fetchData();
  };

  const filtered = credentials.filter((c) => {
    const matchSearch = c.credential_name?.toLowerCase().includes(search.toLowerCase()) || c.trainers?.full_name?.toLowerCase().includes(search.toLowerCase()) || c.provider_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || c.credential_type === typeFilter;
    return matchSearch && matchType;
  });

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      {showModal && <AddCredentialModal trainers={trainers} onClose={() => setShowModal(false)} onSuccess={handleAddSuccess} />}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
          <input
            type="text"
            placeholder="Search credentials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
          />
        </div>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none">
          <option value="All">All types</option>
          {CREDENTIAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button onClick={() => setShowModal(true)} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1c5ea8" }}>
          + Add Credential
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Trainer", "Credential", "Type", "Provider", "Issued", "Verified By", "Copy Held", "Next Review"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <p className="text-sm text-gray-400 mb-3">{search || typeFilter !== "All" ? "No credentials match your search" : "No credentials on register yet"}</p>
                  {!search && typeFilter === "All" && (
                    <button onClick={() => setShowModal(true)} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
                      Add first credential
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((cred) => {
                const typeStyle = TYPE_STYLES[cred.credential_type] || TYPE_STYLES["Other"];
                const isExpiringSoon = cred.next_review_date && new Date(cred.next_review_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={cred.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{cred.trainers?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-xs">
                      <p className="font-medium truncate">{cred.credential_name}</p>
                      {cred.notes && <p className="text-xs text-gray-400 truncate">{cred.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}>
                        {cred.credential_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cred.provider_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(cred.issue_date)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{cred.verified_by || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={cred.copy_held ? { backgroundColor: "#e6f9f4", color: "#0f7a5a" } : { backgroundColor: "#fdeaea", color: "#c93535" }}>
                        {cred.copy_held ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: isExpiringSoon ? "#c93535" : "#6b7280" }}>
                      {formatDate(cred.next_review_date)}
                      {isExpiringSoon && (
                        <span className="ml-1 text-xs font-semibold" style={{ color: "#c93535" }}>
                          ⚠ Soon
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
