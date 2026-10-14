import { useState } from "react";

interface LoginProps {
  onRegister: () => void;
  onBack: () => void;
  onLoginSuccess: () => void;
}

const API_URL = "http://localhost:5000";

function Login({
  onRegister,
  onBack,
  onLoginSuccess,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const trimmedEmail =
      email.trim();

    if (!trimmedEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(
        "Attempting login..."
      );

      console.log(
        "Login URL:",
        `${API_URL}/api/auth/login`
      );

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
          }),
        }
      );

      console.log(
        "Login response status:",
        response.status
      );

      const data =
        await response.json();

      console.log(
        "Login response:",
        data
      );

      if (!response.ok) {
        setError(
          data.message ||
            "Login failed. Please check your details."
        );
        return;
      }

      if (!data.token) {
        setError(
          "Login succeeded, but the server did not return a login token."
        );
        return;
      }

      if (!data.user) {
        setError(
          "Login succeeded, but the server did not return user information."
        );
        return;
      }

      /*
      =========================================
      SAVE LOGIN INFORMATION
      =========================================
      */

      localStorage.setItem(
        "fortuneChatToken",
        data.token
      );

      localStorage.setItem(
        "fortuneChatUser",
        JSON.stringify(data.user)
      );

      console.log(
        "Logged in user:",
        data.user
      );

      console.log(
        "JWT token saved successfully."
      );

      setSuccess(
        data.message ||
          "Login successful."
      );

      /*
      =========================================
      NAVIGATE WITHOUT REFRESH
      =========================================
      */

      onLoginSuccess();

    } catch (error) {
      console.error(
        "FORTUNE CHAT LOGIN ERROR:",
        error
      );

      if (
        error instanceof TypeError
      ) {
        setError(
          "The website could not reach the Fortune Chat server. Check the browser console for the exact error."
        );
      } else if (
        error instanceof Error
      ) {
        setError(
          `Login error: ${error.message}`
        );
      } else {
        setError(
          "Unable to connect to the Fortune Chat server."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">

        <div className="auth-brand">
          <div className="auth-logo">
            FC
          </div>

          <span>
            Fortune Chat
          </span>
        </div>

        <section className="auth-card">

          <div className="auth-header">
            <span className="auth-badge">
              WELCOME BACK
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Sign in to your Fortune Chat
              account and continue your
              conversations.
            </p>
          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

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
                  setEmail(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
              />
            </div>

            {error && (
              <div className="form-message form-error">
                {error}
              </div>
            )}

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
                ? "Logging in..."
                : "Login"}
            </button>
          </form>

          <div className="auth-switch">
            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              className="auth-link-button"
              onClick={onRegister}
            >
              Create account
            </button>
          </div>

        </section>

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

export default Login;