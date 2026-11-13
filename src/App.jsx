import React, { useEffect, useRef, useState } from "react";

// Client-side mock accounts are for this demo only, not real authentication.
const DEMO_ACCOUNTS = {
  operator1: { password: "WeldDemo123", name: "Operator One" },
  operator2: { password: "WeldDemo456", name: "Operator Two" },
};
const STORAGE_KEY = "corob-demo-operator";

function getStoredOperator() {
  try {
    const username = localStorage.getItem(STORAGE_KEY);
    return Object.hasOwn(DEMO_ACCOUNTS, username) ? username : "";
  } catch {
    return "";
  }
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c.7-3.1 3.2-5 7-5s6.3 1.9 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Header() {
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="COROB Weld Cell home">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span className="brand-copy"><strong>COROB</strong><span>WELD CELL</span></span>
      </a>
      <div className="topbar-meta">
        <span className="status-dot" aria-hidden="true" />
        <span>OPERATOR INTERFACE</span>
        <span className="meta-divider" aria-hidden="true" />
        <span className="simulation-label">SIMULATION</span>
      </div>
    </header>
  );
}

function WeldingGraphic() {
  return (
    <div className="weld-graphic" aria-hidden="true">
      <div className="graphic-grid" />
      <div className="beam beam-one" />
      <div className="beam beam-two" />
      <div className="weld-core" />
      <div className="graphic-caption"><span>GMAW</span><span>·</span><span>BUTT WELD</span></div>
      <div className="graphic-coordinates">X 042.18&nbsp;&nbsp; Y 018.62&nbsp;&nbsp; Z 006.40</div>
    </div>
  );
}

function LoginView({ onSignIn, usernameRef }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const passwordRef = useRef(null);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const operatorId = username.trim();
    const account = DEMO_ACCOUNTS[operatorId];

    if (!account || account.password !== password) {
      setError("The operator ID or password is not recognized. Please try again.");
      setPassword("");
      passwordRef.current?.focus();
      return;
    }

    onSignIn(operatorId);
    setUsername("");
    setPassword("");
  }

  return (
    <section className="login-layout" aria-labelledby="login-title">
      <div className="intro-panel">
        <div className="eyebrow"><span className="eyebrow-line" /> SHOP FLOOR · CELL 01</div>
        <h1>Precision in<br /><span>every pass.</span></h1>
        <p className="intro-copy">Operator access for the multi-robot gas metal arc welding cell. Sign in to continue to your workspace.</p>
        <WeldingGraphic />
        <div className="cell-note"><span className="note-icon" aria-hidden="true">i</span> Interface preview · no machine connection</div>
      </div>

      <div className="form-panel">
        <div className="form-heading">
          <div className="form-icon" aria-hidden="true"><UserIcon /></div>
          <div><div className="eyebrow">OPERATOR ACCESS</div><h2 id="login-title">Operator sign in</h2></div>
        </div>
        <p className="form-description">Enter your assigned credentials to access the operator interface.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="username">Operator ID</label>
          <div className="input-wrap">
            <UserIcon />
            <input ref={usernameRef} id="username" name="username" type="text" placeholder="Enter operator ID" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <LockIcon />
            <input ref={passwordRef} id="password" name="password" type="password" placeholder="Enter password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <p className="form-error" role="alert" aria-live="polite">{error}</p>
          <button className="sign-in-button" type="submit">
            <span>Sign in to workspace</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>

        <div className="demo-note"><span className="demo-note-title">DEMO ACCESS</span><span>Use the mock credentials supplied with this simulation.</span></div>
      </div>
    </section>
  );
}

function WelcomeView({ name, onSignOut }) {
  return (
    <section className="welcome-view" aria-labelledby="welcome-title">
      <div className="welcome-card">
        <div className="welcome-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="eyebrow"><span className="eyebrow-line" /> OPERATOR WORKSPACE</div>
        <h1 id="welcome-title">Welcome, <span>{name}</span>.</h1>
        <p className="welcome-copy">You are signed in to the COROB operator interface.</p>
        <button className="sign-out-button" type="button" onClick={onSignOut}>Sign out <span aria-hidden="true">↗</span></button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span>© COROB · OPERATOR HMI CONCEPT</span>
      <span className="footer-warning"><span aria-hidden="true">!</span> SIMULATION ONLY — NOT CONNECTED TO ROBOT EQUIPMENT</span>
      <span>BUILD 01.00 <span className="footer-divider">/</span> DEMO</span>
    </footer>
  );
}

export default function App() {
  const [operatorId, setOperatorId] = useState(getStoredOperator);
  const usernameRef = useRef(null);
  const operator = operatorId ? DEMO_ACCOUNTS[operatorId] : null;

  useEffect(() => {
    document.title = operator
      ? `Welcome, ${operator.name} · COROB Weld Cell`
      : "Operator sign in · COROB Weld Cell";
  }, [operator]);

  useEffect(() => {
    if (!operatorId) {
      usernameRef.current?.focus();
    }
  }, [operatorId]);

  function signIn(username) {
    setOperatorId(username);
    try {
      localStorage.setItem(STORAGE_KEY, username);
    } catch {
      // Continue with this page view if browser storage is disabled.
    }
  }

  function signOut() {
    setOperatorId("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The current page returns to login even if storage is unavailable.
    }
  }

  return (
    <div className="app-shell">
      <Header />
      <main id="main-content">
        {operator ? <WelcomeView name={operator.name} onSignOut={signOut} /> : <LoginView onSignIn={signIn} usernameRef={usernameRef} />}
      </main>
      <Footer />
    </div>
  );
}
