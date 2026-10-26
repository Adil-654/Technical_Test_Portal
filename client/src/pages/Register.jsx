
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Eye, EyeOff, UserPlus } from "lucide-react";
import api from "../services/api";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    studentId: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/register", {
        name: form.name,
        studentId: form.studentId,
        email: form.email,
        password: form.password,
      });

      setSuccess("Account created successfully. Redirecting to login...");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-shell">
        <aside className="register-brand">
          <div className="register-logo">
            <BookOpen size={24} />
          </div>

          <p className="register-eyebrow">WELCOME TO TESTPILOT</p>
          <h1>Start your learning journey.</h1>

          <p className="register-description">
            Create your student account to access technical
            assessments and track your progress.
          </p>

          <div className="register-feature">
            <span>01</span>
            <div>
              <strong>Practice with purpose</strong>
              <p>Prepare for technical assessments.</p>
            </div>
          </div>

          <div className="register-feature">
            <span>02</span>
            <div>
              <strong>Track your progress</strong>
              <p>Review your performance as you learn.</p>
            </div>
          </div>

          <p className="register-brand-footer">
            TestPilot · Technical Assessment Platform
          </p>
        </aside>

        <main className="register-form-panel">
          <Link to="/login" className="register-back">
            <ArrowLeft size={17} />
            Back to login
          </Link>

          <div className="register-heading">
            <div className="register-mobile-logo">
              <BookOpen size={22} />
            </div>

            <p className="register-eyebrow">STUDENT ACCOUNT</p>
            <h2>Create your account</h2>
            <p>Enter your details to get started.</p>
          </div>

          {error && (
            <div className="register-alert register-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div
              className="register-alert register-success"
              role="status"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={100}
              required
            />

            <label htmlFor="studentId">Student ID</label>
            <input
              id="studentId"
              name="studentId"
              value={form.studentId}
              onChange={handleChange}
              placeholder="e.g. STU001"
              maxLength={50}
              required
            />

            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
            />

            <label htmlFor="password">Password</label>
            <div className="register-password-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="At least 12 characters"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />

              <button
                type="button"
                className="register-eye"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              maxLength={128}
              required
            />

            <button
              type="submit"
              className="register-submit"
              disabled={submitting}
            >
              <UserPlus size={18} />
              {submitting ? "Creating account..." : "Create student account"}
            </button>
          </form>

          <p className="register-login-link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>

          <p className="register-security-note">
            Student accounts only. Administrator access is managed separately.
          </p>
        </main>
      </div>
    </div>
  );
}
