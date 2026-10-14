import { useState } from "react";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import WorldChat from "./pages/WorldChat";

type Page =
  | "landing"
  | "register"
  | "login"
  | "chat"
  | "world";

function App() {
  const [currentPage, setCurrentPage] =
    useState<Page>(() => {
      const token =
        localStorage.getItem("fortuneChatToken");

      const user =
        localStorage.getItem("fortuneChatUser");

      if (token && user) {
        return "chat";
      }

      return "landing";
    });

  /*
  =========================================
  LOGIN SUCCESS
  =========================================
  */

  const handleLoginSuccess = () => {
    setCurrentPage("chat");
  };

  /*
  =========================================
  LOGOUT
  =========================================
  */

  const handleLogout = () => {
    localStorage.removeItem(
      "fortuneChatToken"
    );

    localStorage.removeItem(
      "fortuneChatUser"
    );

    setCurrentPage("login");
  };

  /*
  =========================================
  CURRENT AUTH STATE
  =========================================
  */

  const token =
    localStorage.getItem("fortuneChatToken");

  const user =
    localStorage.getItem("fortuneChatUser");

  /*
  =========================================
  WORLD CHAT
  =========================================
  */

  if (
    currentPage === "world" &&
    token &&
    user
  ) {
    return (
      <WorldChat
        onBackToChat={() =>
          setCurrentPage("chat")
        }
      />
    );
  }

  /*
  =========================================
  PRIVATE CHAT
  =========================================
  */

  if (
    currentPage === "chat" &&
    token &&
    user
  ) {
    return (
      <Chat
        onOpenWorldChat={() =>
          setCurrentPage("world")
        }
      />
    );
  }

  /*
  =========================================
  LOGIN
  =========================================
  */

  if (currentPage === "login") {
    return (
      <Login
        onRegister={() =>
          setCurrentPage("register")
        }
        onBack={() =>
          setCurrentPage("landing")
        }
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  /*
  =========================================
  REGISTER
  =========================================
  */

  if (currentPage === "register") {
    return (
      <Register
        onLogin={() =>
          setCurrentPage("login")
        }
        onBack={() =>
          setCurrentPage("landing")
        }
      />
    );
  }

  /*
  =========================================
  LOGGED-IN LANDING
  =========================================
  */

  if (token && user) {
    let loggedInUser: {
      fullName?: string;
    } = {};

    try {
      loggedInUser = JSON.parse(user);
    } catch {
      handleLogout();
      return null;
    }

    return (
      <main className="landing-page">
        <div className="landing-content">

          <div className="landing-logo">
            FC
          </div>

          <span className="landing-badge">
            FORTUNE CHAT
          </span>

          <h1>
            Welcome back,
            <br />
            <span>
              {loggedInUser.fullName ||
                "Fortune Chat User"}
            </span>
          </h1>

          <p>
            You are successfully logged in to
            Fortune Chat.
          </p>

          <div className="landing-actions">

            <button
              className="primary-button"
              onClick={() =>
                setCurrentPage("chat")
              }
            >
              Continue to Chat
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setCurrentPage("world")
              }
            >
              🌍 World Chat
            </button>

            <button
              className="secondary-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

          <span className="landing-footer">
            Built by Fortune Codes
          </span>

        </div>
      </main>
    );
  }

  /*
  =========================================
  MAIN LANDING PAGE
  =========================================
  */

  return (
    <main className="landing-page">
      <div className="landing-content">

        <div className="landing-logo">
          FC
        </div>

        <span className="landing-badge">
          PRIVATE • FAST • SIMPLE
        </span>

        <h1>
          Stay connected
          <br />
          with <span>Fortune Chat</span>
        </h1>

        <p>
          A modern messaging experience built
          for simple, private, and real-time
          conversations.
        </p>

        <div className="landing-actions">

          <button
            className="primary-button"
            onClick={() =>
              setCurrentPage("register")
            }
          >
            Get Started
          </button>

          <button
            className="secondary-button"
            onClick={() =>
              setCurrentPage("login")
            }
          >
            Login
          </button>

        </div>

        <span className="landing-footer">
          Built by Fortune Codes
        </span>

      </div>
    </main>
  );
}

export default App;