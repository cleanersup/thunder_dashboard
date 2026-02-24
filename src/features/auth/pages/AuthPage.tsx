import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthBackground } from "../components/AuthBackground";
import { LoginForm } from "../components/LoginForm";
import { SignupForm } from "../components/SignupForm";

/**
 * AuthPage — login / signup toggle page.
 * Redirects to /home if a valid session already exists.
 * Applies the dark futuristic background from thunder-web-version.
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  // Redirect already-authenticated users
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/home", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-auto">
      <AuthBackground />

      {isLogin ? (
        <LoginForm
          onSwitchToSignup={() => setIsLogin(false)}
          onForgotPassword={() => navigate("/forgot-password")}
        />
      ) : (
        // White bg on mobile, transparent (shows AuthBackground) on desktop
        <>
          <div className="fixed inset-0 bg-white lg:hidden -z-10" />
          <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
        </>
      )}
    </div>
  );
}
