import { useState } from "react";
import { API_BASE_URL } from '../config/api';


interface RegisterProps {
  onLogin: () => void;
  onBack: () => void;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

const countries: Country[] = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
];

function Register({
  onLogin,
  onBack,
}: RegisterProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [countryCode, setCountryCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = countries.find(
    (country) => country.code === countryCode
  );

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedFullName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedFullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!trimmedUsername) {
      setError("Please choose a username.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!countryCode || !selectedCountry) {
      setError("Please select your country.");
      return;
    }

    if (!password) {
      setError("Please create a password.");
      return;
    }

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,

        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: trimmedFullName,
            username: trimmedUsername,
            email: trimmedEmail,
            password,
            countryCode: selectedCountry.code,
            countryName: selectedCountry.name,
            countryFlag: selectedCountry.flag,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Registration failed. Please try again."
        );
        return;
      }

      setSuccess(data.message);

      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setCountryCode("");
    } catch {
      setError(
        "Unable to connect to the Fortune Chat server."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">
            FC
          </div>

          <span>Fortune Chat</span>
        </div>

        {/* Registration Card */}
        <section className="auth-card">

          <div className="auth-header">
            <span className="auth-badge">
              CREATE ACCOUNT
            </span>

            <h1>Create your account</h1>

            <p>
              Join Fortune Chat and start connecting
              with people in real time.
            </p>
          </div>

          {/* Registration Form */}
          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            <div className="form-group">
              <label htmlFor="fullName">
                Full name
              </label>

              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                autoComplete="username"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email address
              </label>

              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />
            </div>

            {/* Country */}
            <div className="form-group">
              <label htmlFor="country">
                Country
              </label>

              <select
                id="country"
                value={countryCode}
                onChange={(event) =>
                  setCountryCode(event.target.value)
                }
              >
                <option value="">
                  Select your country
                </option>

                {countries.map((country) => (
                  <option
                    key={country.code}
                    value={country.code}
                  >
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Create a secure password"
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="form-message form-error">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="form-message form-success">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="auth-primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Creating account..."
                : "Create account"}
            </button>
          </form>

          {/* Login Link */}
          <div className="auth-switch">
            <span>
              Already have an account?
            </span>

            <button
              type="button"
              className="auth-link-button"
              onClick={onLogin}
            >
              Login
            </button>
          </div>
        </section>

        {/* Footer */}
        <div className="auth-footer">
          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back to Fortune Chat
          </button>

          <span>
            Built by Fortune Codes
          </span>
        </div>

      </div>
    </main>
  );
}

export default Register;