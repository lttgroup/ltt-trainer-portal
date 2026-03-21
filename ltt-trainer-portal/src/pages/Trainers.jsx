import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STATUS_STYLES = {
  Compliant: { bg: "#e6f9f4", color: "#0f7a5a" },
  Pending: { bg: "#fdf3e0", color: "#b8711a" },
  Incomplete: { bg: "#fdeaea", color: "#c93535" },
  "Under Review": { bg: "#e6f0ff", color: "#1c5ea8" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES["Incomplete"];
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
      {status || "Incomplete"}
    </span>
  );
}

function ProgressBar({ value }) {
  const color = value >= 100 ? "#32ba9a" : value >= 60 ? "#e8a020" : "#c93535";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-500 min-w-8 text-right">{value}%</span>
    </div>
  );
}

function InviteModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data: trainer, error: trainerError } = await supabase
        .from("trainers")
        .insert({
          full_name: name,
          email: email,
          compliance_status: "Incomplete",
        })
        .select()
        .single();

      if (trainerError) throw trainerError;

      onSuccess(trainer);
    } catch (err) {
      setError(err.message || "Failed to create trainer. Please try again.");
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Invite Trainer</h2>
            <p className="text-sm text-gray-400 mt-0.5">Add a new trainer to the register</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>}

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jessica Brown" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="trainer@ltt.edu.au" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors" style={{ backgroundColor: "#1c5ea8" }}>
              {loading ? "Sending invite..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Trainers() {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    const { data, error } = await supabase.from("trainers").select("*").order("created_at", { ascending: false });

    if (!error && data) setTrainers(data);
    setLoading(false);
  };

  const handleInviteSuccess = (newTrainer) => {
    setTrainers((prev) => [newTrainer, ...prev]);
    setShowInvite(false);
  };

  const filtered = trainers.filter((t) => {
    const matchSearch = t.full_name?.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.compliance_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSuccess={handleInviteSuccess} />}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">⌕</span>
          <input type="text" placeholder="Search trainers..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white" />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none">
          <option value="All">All statuses</option>
          <option value="Compliant">Compliant</option>
          <option value="Pending">Pending</option>
          <option value="Incomplete">Incomplete</option>
          <option value="Under Review">Under Review</option>
        </select>

        <button onClick={() => setShowInvite(true)} className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "#1c5ea8" }}>
          + Invite Trainer
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Trainer</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Position</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Employment</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Profile</th>
              <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <p className="text-sm text-gray-400 mb-3">{search || statusFilter !== "All" ? "No trainers match your search" : "No trainers yet"}</p>
                  {!search && statusFilter === "All" && (
                    <button onClick={() => setShowInvite(true)} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ backgroundColor: "#1c5ea8" }}>
                      Invite your first trainer
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((trainer) => {
                const initials = trainer.full_name
                  ? trainer.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "?";
                return (
                  <tr key={trainer.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/trainers/${trainer.id}`)}>
                    {" "}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#e6f0ff", color: "#1c5ea8" }}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{trainer.full_name}</p>
                          <p className="text-xs text-gray-400">{trainer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{trainer.position || "—"}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{trainer.employment_status || "—"}</td>
                    <td className="px-5 py-4 w-40">
                      <ProgressBar value={0} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={trainer.compliance_status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trainers/${trainer.id}`);
                        }}
                      >
                        View
                      </button>{" "}
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
