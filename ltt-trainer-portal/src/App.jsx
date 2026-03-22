import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

import Shell from "./components/layout/Shell";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/Dashboard";
import Trainers from "./pages/Trainers";
import TrainerDetail from "./pages/TrainerDetail";
import Profile from "./pages/Profile";
import Questionnaire from "./pages/Questionnaire";
import Experience from "./pages/Experience";
import CredentialRegister from "./pages/CredentialRegister";
import EvidenceVault from "./pages/EvidenceVault";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#081a47", borderTopColor: "transparent" }} />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function PrivateRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function AppShell({ session, profile, title, children }) {
  return (
    <PrivateRoute session={session}>
      <Shell user={session?.user} profile={profile} title={title}>
        {children}
      </Shell>
    </PrivateRoute>
  );
}

// Admins see full dashboard; trainers see their own progress dashboard
function AdminRoute({ session, profile, title, children }) {
  if (!session) return <Navigate to="/login" replace />;
  // ❌ REMOVE the trainer redirect — trainers CAN access /dashboard now
  return (
    <Shell user={session?.user} profile={profile} title={title}>
      {children}
    </Shell>
  );
}
export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  if (session === undefined) return <LoadingScreen />;

  // Once profile is loaded, decide where to send the user on login
  // Both roles land on dashboard; dashboard component handles the split view
  const defaultRoute = "/dashboard";
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={session ? <Navigate to={defaultRoute} replace /> : <Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* ── ADMIN ROUTES ── */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute session={session} profile={profile} title="Dashboard">
              <Dashboard profile={profile} />
            </AdminRoute>
          }
        />
        <Route
          path="/trainers"
          element={
            <AdminRoute session={session} profile={profile} title="Trainers">
              <Trainers />
            </AdminRoute>
          }
        />
        <Route
          path="/trainers/invite"
          element={
            <AdminRoute session={session} profile={profile} title="Trainers">
              <Trainers showInviteOnLoad={true} />
            </AdminRoute>
          }
        />
        <Route
          path="/trainers/:id"
          element={
            <AdminRoute session={session} profile={profile} title="Trainer Detail">
              <TrainerDetail profile={profile} />
            </AdminRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AdminRoute session={session} profile={profile} title="Credential Register">
              <CredentialRegister />
            </AdminRoute>
          }
        />
        <Route
          path="/evidence"
          element={
            <AdminRoute session={session} profile={profile} title="Evidence Vault">
              <EvidenceVault profile={profile} />
            </AdminRoute>
          }
        />

        {/* ── TRAINER ROUTES (accessible by both trainers and admins) ── */}
        <Route
          path="/profile"
          element={
            <AppShell session={session} profile={profile} title="Trainer Profile (AF3.21)">
              <Profile profile={profile} />
            </AppShell>
          }
        />
        <Route
          path="/questionnaire"
          element={
            <AppShell session={session} profile={profile} title="Section 5 — Skills Questionnaire">
              <Questionnaire profile={profile} />
            </AppShell>
          }
        />
        <Route
          path="/experience"
          element={
            <AppShell session={session} profile={profile} title="Section 6 — Industry Experience">
              <Experience profile={profile} />
            </AppShell>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
