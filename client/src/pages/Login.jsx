
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  GraduationCap,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  Code2,
  CheckCircle2,
} from "lucide-react";
import "./Login.css";

const roles = [
  {
    id: "student",
    title: "Student",
    description: "Take tests and view your results",
    icon: GraduationCap,
  },
  {
    id: "admin",
    title: "Administrator",
    description: "Manage tests and students",
    icon: ShieldCheck,
  },
];

export default function Login({ onLogin }) {
  const location = useLocation();

  const [selectedRole, setSelectedRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onLogin({
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(role) {
    setSelectedRole(role);
    setError("");
  }

  function RoleSelector() {
    return (
      <div className="tp-role-options" aria-label="Choose account type">
        {roles.map((role) => {
          const Icon = role.icon;
          const active = selectedRole === role.id;

          return (
            <button
              key={role.id}
              type="button"
              className={`tp-role-card ${active ? "is-selected" : ""}`}
              onClick={() => handleRoleChange(role.id)}
              disabled={loading}
              aria-pressed={active}
            >
              <span className="tp-role-icon">
                <Icon size={25} strokeWidth={1.8} />
              </span>

              <span className="tp-role-copy">
                <span className="tp-role-title">{role.title}</span>
                <span className="tp-role-description">
                  {role.description}
                </span>
              </span>

              <span className="tp-role-radio">
                {active && <span />}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <main className="tp-login">
      <div className="tp-login-glow tp-login-glow-one" />
      <div className="tp-login-glow tp-login-glow-two" />

      <div className="tp-login-shell">
        {/* LEFT PANEL: Branding and role selection */}
        <section className="tp-brand-panel">
          <div className="tp-brand">
            <div className="tp-brand-logo">
              <Code2 size={25} strokeWidth={2.3} />
            </div>

            <div>
              <div className="tp-brand-name">TestPilot</div>
              <div className="tp-brand-subtitle">
                TECHNICAL ASSESSMENT PLATFORM
              </div>
            </div>
          </div>

          <div className="tp-brand-content">
            <span className="tp-eyebrow">
              <span className="tp-status-dot" />
              YOUR NEXT CHALLENGE STARTS HERE
            </span>

            <h1>
              Learn more.
              <br />
              <span>Achieve more.</span>
            </h1>

            <p className="tp-brand-description">
              A smarter way to assess technical skills, measure progress,
              and turn knowledge into confidence.
            </p>

            <div className="tp-benefits">
              <div>
                <CheckCircle2 size={19} />
                <span>Structured technical assessments</span>
              </div>

              <div>
                <CheckCircle2 size={19} />
                <span>Performance tracking and results</span>
              </div>

              <div>
                <CheckCircle2 size={19} />
                <span>Secure account-based access</span>
              </div>
            </div>
          </div>

          <div className="tp-role-section">
            <div className="tp-role-heading">
              <span>01</span>
              <div>
                <h2>Choose your workspace</h2>
                <p>Select the account type you want to access.</p>
              </div>
            </div>

            <RoleSelector />

            <div className="tp-selected-label">
              <span />
              SELECTED:{" "}
              {selectedRole === "admin" ? "ADMINISTRATOR" : "STUDENT"}
            </div>
          </div>

          <div className="tp-brand-footer">
            <span>Built for learning. Designed for growth.</span>
            <span>© {new Date().getFullYear()} TestPilot</span>
          </div>
        </section>

        {/* RIGHT PANEL: Sign-in form */}
        <section className="tp-form-panel">
          <div className="tp-form-inner">
            <div className="tp-mobile-brand">
              <div className="tp-brand-logo">
                <Code2 size={23} />
              </div>
              <span className="tp-brand-name">TestPilot</span>
            </div>

            <div className="tp-form-heading">
              <span className="tp-section-label">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>
                Enter your credentials to continue to your workspace.
              </p>
            </div>

            <div className="tp-form-context">
              <div className="tp-context-icon">
                {selectedRole === "admin" ? (
                  <ShieldCheck size={21} />
                ) : (
                  <GraduationCap size={21} />
                )}
              </div>

              <div>
                <span className="tp-context-label">SIGNING IN AS</span>
                <strong>
                  {selectedRole === "admin" ? "Administrator" : "Student"}
                </strong>
              </div>

              <span className="tp-context-status">Selected</span>
            </div>

            {location.state?.from && (
              <div className="tp-info-message">
                Please sign in to continue to your requested page.
              </div>
            )}

            {error && (
              <div className="tp-error-message" role="alert">
                {error}
              </div>
            )}

            <form className="tp-login-form" onSubmit={handleSubmit}>
              <div className="tp-field">
                <label htmlFor="tp-email">Email address</label>

                <div className="tp-input-wrap">
                  <Mail size={19} />

                  <input
                    id="tp-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    maxLength={254}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="tp-field">
                <label htmlFor="tp-password">Password</label>

                <div className="tp-input-wrap">
                  <LockKeyhole size={19} />

                  <input
                    id="tp-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    maxLength={128}
                    required
                    disabled={loading}
                  />

                  <button
                    className="tp-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="tp-submit-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="tp-spinner" size={19} />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to TestPilot
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>

            <div className="tp-register-link">
              <span>New to TestPilot?</span>{" "}
              <Link to="/register">Register as a student</Link>
            </div>

            <div className="tp-form-bottom">
              <div className="tp-security-note">
                <ShieldCheck size={17} />
                <span>Your account is protected by secure authentication.</span>
              </div>

              <p>Need administrator access? Contact your administrator.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
