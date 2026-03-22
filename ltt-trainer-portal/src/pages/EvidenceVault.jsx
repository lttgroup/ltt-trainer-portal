import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

const DOC_TYPES = ["TAE Qualification", "Industry Qualification", "Statement of Attainment", "USI Transcript", "Enrolment Confirmation", "CPD Evidence", "Employment Reference", "Other"];

const TYPE_STYLES = {
  "TAE Qualification": { bg: "#e6f0ff", color: "#1c5ea8" },
  "Industry Qualification": { bg: "#e6f9f4", color: "#0f7a5a" },
  "Statement of Attainment": { bg: "#e6f9f4", color: "#0f7a5a" },
  "USI Transcript": { bg: "#fdf3e0", color: "#b8711a" },
  "Enrolment Confirmation": { bg: "#fdf3e0", color: "#b8711a" },
  "CPD Evidence": { bg: "#f3e6ff", color: "#7c3aed" },
  "Employment Reference": { bg: "#f1f5f9", color: "#475569" },
  Other: { bg: "#f1f5f9", color: "#475569" },
};

function formatFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EvidenceVault({ profile }) {
  const isAdmin = profile?.role === "admin" || profile?.role === "compliance_officer";

  const [files, setFiles] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [trainerFilter, setTrainerFilter] = useState("All");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload form
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [selectedType, setSelectedType] = useState("TAE Qualification");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;

    if (isAdmin) {
      // Admin — load all files and trainer list
      const [{ data: fileData }, { data: trainerData }] = await Promise.all([
        supabase.from("evidence_files").select("*, trainers(full_name)").order("uploaded_at", { ascending: false }),
        supabase.from("trainers").select("id, full_name").order("full_name"),
      ]);
      setFiles(fileData || []);
      setTrainers(trainerData || []);
    } else {
      // Trainer — load only their own files
      const { data: trainers } = await supabase.from("trainers").select("id").eq("email", profile.email).order("created_at", { ascending: false }).limit(1);

      const trainer = trainers?.[0] || null;
      if (trainerData) {
        setTrainerId(trainerData.id);
        setSelectedTrainer(trainerData.id);

        const { data: fileData } = await supabase.from("evidence_files").select("*, trainers(full_name)").eq("trainer_id", trainerData.id).order("uploaded_at", { ascending: false });

        setFiles(fileData || []);
      }
    }

    setLoading(false);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }
    setSelectedFile(file);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    const uploadTrainerId = isAdmin ? selectedTrainer : trainerId;

    if (!selectedFile || !uploadTrainerId) {
      setError(isAdmin ? "Please select a trainer and a file." : "Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const filePath = `${uploadTrainerId}/${Date.now()}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage.from("evidence-files").upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("evidence_files").insert({
        trainer_id: uploadTrainerId,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        document_type: selectedType,
        uploaded_by: profile?.id,
      });

      if (dbError) throw dbError;

      setSuccess(`${selectedFile.name} uploaded successfully!`);
      setSelectedFile(null);
      if (isAdmin) setSelectedTrainer("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchData();
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    }

    setUploading(false);
  };

  const handleDownload = async (file) => {
    const { data, error } = await supabase.storage.from("evidence-files").createSignedUrl(file.file_path, 60);

    if (error) {
      setError("Could not generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete ${file.file_name}? This cannot be undone.`)) return;

    await supabase.storage.from("evidence-files").remove([file.file_path]);
    await supabase.from("evidence_files").delete().eq("id", file.id);

    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  const filtered = files.filter((f) => {
    const matchSearch = f.file_name?.toLowerCase().includes(search.toLowerCase()) || f.trainers?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || f.document_type === typeFilter;
    const matchTrainer = trainerFilter === "All" || f.trainer_id === trainerFilter;
    return matchSearch && matchType && matchTrainer;
  });

  return (
    <div>
      {/* Upload section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Upload Evidence Document</h3>
        <p className="text-xs text-gray-400 mb-4">{isAdmin ? "Upload qualification documents, USI transcripts or other evidence on behalf of a trainer." : "Upload your qualification documents, USI transcript or other supporting evidence here."}</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">✓ {success}</div>}

        <div className={`grid gap-4 mb-4 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
          {/* Trainer selector — admin only */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Trainer</label>
              <select value={selectedTrainer} onChange={(e) => setSelectedTrainer(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
                <option value="">Select trainer</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Document Type</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400">
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || (isAdmin && !selectedTrainer)}
              className="w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{
                backgroundColor: uploading || !selectedFile || (isAdmin && !selectedTrainer) ? "#9ca3af" : "#1c5ea8",
              }}
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{
            borderColor: isDragging ? "#1c5ea8" : selectedFile ? "#32ba9a" : "#e5e7eb",
            backgroundColor: isDragging ? "#e6f0ff" : selectedFile ? "#e6f9f4" : "#f9fafb",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => handleFileSelect(e.target.files[0])} />
          {selectedFile ? (
            <div>
              <p className="text-2xl mb-2">📎</p>
              <p className="text-sm font-semibold text-gray-800">{selectedFile.name}</p>
              <p className="text-xs text-gray-400 mt-1">{formatFileSize(selectedFile.size)} — Click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl mb-2">⬆</p>
              <p className="text-sm font-semibold text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, JPG, PNG — max 10MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Files list */}
      <div>
        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
            <input type="text" placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white" />
          </div>

          {/* Trainer filter — admin only */}
          {isAdmin && (
            <select value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none">
              <option value="All">All trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          )}

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none">
            <option value="All">All types</option>
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} file{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Files table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["File", ...(isAdmin ? ["Trainer"] : []), "Type", "Size", "Uploaded", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-sm text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-sm text-gray-400">
                    {search || typeFilter !== "All" ? "No files match your search" : isAdmin ? "No evidence files uploaded yet" : "You have not uploaded any documents yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((file) => {
                  const typeStyle = TYPE_STYLES[file.document_type] || TYPE_STYLES["Other"];
                  return (
                    <tr key={file.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📎</span>
                          <p className="text-sm font-medium text-gray-800">{file.file_name}</p>
                        </div>
                      </td>
                      {isAdmin && <td className="px-4 py-3 text-sm text-gray-600">{file.trainers?.full_name || "—"}</td>}
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}>
                          {file.document_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(file.file_size)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(file.uploaded_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => handleDownload(file)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                            View
                          </button>
                          {/* Only admins or the owning trainer can delete */}
                          {(isAdmin || file.trainer_id === trainerId) && (
                            <button onClick={() => handleDelete(file)} className="text-xs font-medium px-3 py-1.5 rounded-lg border text-red-500 border-red-200 hover:bg-red-50">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
