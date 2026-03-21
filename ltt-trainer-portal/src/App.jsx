import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// Pages
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";

// Loading spinner shown while we check if user is logged in
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: "#081a47", borderTopColor: "transparent" }} />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// Protects pages that require login
function PrivateRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Check if a user is already logged in when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Still checking auth status — show spinner
  if (session === undefined) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        {/* Protected routes — more pages will be added here soon */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute session={session}>
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold text-gray-800 mb-2">🎉 You are logged in!</h1>
                  <p className="text-gray-500 text-sm">Dashboard coming next...</p>
                  <button onClick={() => supabase.auth.signOut()} className="mt-6 px-4 py-2 text-sm text-white rounded-lg" style={{ backgroundColor: "#081a47" }}>
                    Sign out
                  </button>
                </div>
              </div>
            </PrivateRoute>
          }
        />

        {/* Catch all — redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
