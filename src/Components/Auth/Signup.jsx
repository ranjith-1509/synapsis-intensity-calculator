import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import AuthForm from "./AuthForm";
import { auth } from "../../firebaseConfig";

const formatSignupError = (error) => {
  if (!error?.code) return "Unable to create your account. Please try again.";
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with that email already exists.";
    case "auth/invalid-email":
      return "Please provide a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    default:
      return "Unable to create your account. Please try again.";
  }
};

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async ({ fullName, email, password, confirmPassword }) => {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const credentials = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      if (credentials.user && fullName.trim()) {
        await updateProfile(credentials.user, { displayName: fullName.trim() });
      }
      navigate("/login", { replace: true, state: { signupSuccess: true } });
    } catch (err) {
      setError(formatSignupError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="signup"
      title="Create your account"
      subtitle="Join us to start tracking your wellness insights."
      onSubmit={handleSignup}
      loading={loading}
      error={error}
      switchPrompt={{
        text: "Already have an account?",
        linkLabel: "Log in",
        to: "/login",
      }}
    />
  );
};

export default Signup;


