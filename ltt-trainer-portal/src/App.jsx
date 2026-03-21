import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// Layout
import Shell from "./components/layout/Shell";

// Pages
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/Dashboard";
import Trainers from "./pages/Trainers";
import TrainerDetail from "./pages/TrainerDetail";
import Questionnaire from "./pages/Questionnaire";
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

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <AppShell session={session} profile={profile} title="Dashboard">
              <Dashboard profile={profile} />
            </AppShell>
          }
        />
        <Route
          path="/trainers"
          element={
            <AppShell session={session} profile={profile} title="Trainers">
              <Trainers />
            </AppShell>
          }
        />

        <Route
          path="/trainers/invite"
          element={
            <AppShell session={session} profile={profile} title="Trainers">
              <Trainers showInviteOnLoad={true} />
            </AppShell>
          }
        />
        <Route
          path="/trainers/:id"
          element={
            <AppShell session={session} profile={profile} title="Trainer Detail">
              <TrainerDetail profile={profile} />
            </AppShell>
          }
        />
        <Route
          path="/questionnaire"
          element={
            <AppShell session={session} profile={profile} title="Skills Questionnaire">
              <Questionnaire profile={profile} />
            </AppShell>
          }
        />
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
