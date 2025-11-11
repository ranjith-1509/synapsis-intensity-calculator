import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import AuthForm from "./AuthForm";
import { auth } from "../../firebaseConfig";

const formatErrorMessage = (error) => {
  if (!error?.code) return "Unable to sign in. Please try again.";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "The email or password you entered is incorrect.";
    case "auth/user-not-found":
      return "We couldn’t find an account with that email.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Unable to sign in. Please try again.";
  }
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtitle =
    location.state?.signupSuccess === true
      ? "Account created successfully. Sign in to continue."
      : "Enter your credentials to access your dashboard.";

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setError("");
    try {
      const credentials = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const token = await credentials.user.getIdToken();
      localStorage.setItem("firebaseToken", token);
      localStorage.setItem("authEmail", credentials.user.email || "");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      subtitle={subtitle}
      onSubmit={handleLogin}
      loading={loading}
      error={error}
      switchPrompt={{
        text: "Don't have an account?",
        linkLabel: "Create account",
        to: "/signup",
      }}
    />
  );
};

export default Login;


