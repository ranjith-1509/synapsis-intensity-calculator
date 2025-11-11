import React, { useState } from "react";
import { Link } from "react-router-dom";
import PrimaryButton from "../ui/PrimaryButton";
import { SpykLogo } from "../../images/spykLogo.js";

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f8fafc",
  padding: "32px 16px",
};

const cardStyle = { 
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  borderRadius: 24,
  boxShadow: "0 24px 64px rgba(15, 23, 42, 0.12)",
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const logoStyle = {
  display: "inline-flex",
  minWidth: 48,
  alignItems: "center",
  justifyContent: "center",
};

const AuthForm = ({
  mode = "login",
  title,
  subtitle,
  onSubmit,
  loading = false,
  error = "",
  switchPrompt,
}) => {
  const isSignup = mode === "signup";
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (field) => (event) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(formValues);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={logoStyle}><SpykLogo /></span>
          <div>
            <h1
              style={{
                margin: "12px 0 4px 0",
                fontSize: 26,
                lineHeight: "32px",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: "20px",
                  color: "#64748b",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {isSignup && (
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: "#0f172a",
                }}
              >
                Full Name
              </span>
              <input
                type="text"
                required
                value={formValues.fullName}
                onChange={handleChange("fullName")}
                placeholder="Your full name"
                style={{
                  borderRadius: 12,
                  border: "1px solid #dbeafe",
                  padding: "14px 16px",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: "#0f172a",
              }}
            >
              Email
            </span>
            <input
              type="email"
              required
              value={formValues.email}
              onChange={handleChange("email")}
              placeholder="you@example.com"
              style={{
                borderRadius: 12,
                border: "1px solid #dbeafe",
                padding: "14px 16px",
                fontSize: 14,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: "#0f172a",
              }}
            >
              Password
            </span>
            <input
              type="password"
              required
              value={formValues.password}
              onChange={handleChange("password")}
              placeholder="••••••••"
              style={{
                borderRadius: 12,
                border: "1px solid #dbeafe",
                padding: "14px 16px",
                fontSize: 14,
                outline: "none",
              }}
              minLength={6}
            />
          </label>

          {isSignup && (
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: "#0f172a",
                }}
              >
                Confirm Password
              </span>
              <input
                type="password"
                required
                value={formValues.confirmPassword}
                onChange={handleChange("confirmPassword")}
                placeholder="Confirm password"
                style={{
                  borderRadius: 12,
                  border: "1px solid #dbeafe",
                  padding: "14px 16px",
                  fontSize: 14,
                  outline: "none",
                }}
                minLength={6}
              />
            </label>
          )}

          {error && (
            <div
              role="alert"
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 13,
                lineHeight: "18px",
              }}
            >
              {error}
            </div>
          )}

          <PrimaryButton
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 15,
              borderRadius: 14,
            }}
          >
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </PrimaryButton>
        </form>

        {switchPrompt && (
          <div
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "#475569",
            }}
          >
            {switchPrompt.text}{" "}
            <Link
              to={switchPrompt.to}
              style={{ color: "red", fontWeight: 600 }}
            >
              {switchPrompt.linkLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForm;


