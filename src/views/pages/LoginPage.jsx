import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../../controllers/SessionController.jsx";
import { APP_CONFIG } from "../../config/appConfig.js";
import { Button, Field, Input } from "../components/primitives.jsx";

export function LoginPage() {
  const { operator, signIn } = useSession();
  const location = useLocation();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const idRef = useRef(null);

  useEffect(() => { idRef.current?.focus(); document.title = `Sign in · ${APP_CONFIG.appName}`; }, []);
  if (operator) return <Navigate to={location.state?.from ?? "/dashboard"} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await signIn(id, password);
    setBusy(false);
    if (!r.ok) { setError(r.reason); setPassword(""); }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <div><strong>COROB</strong><small>Weld cell operator</small></div>
      </div>
      <form className="login-card" onSubmit={submit} noValidate>
        <h1>Sign in</h1>
        <p className="muted">Use your operator ID and password.</p>
        <Field label="Operator ID" id="op-id">
          <Input ref={idRef} id="op-id" icon="user" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. operator1" required />
        </Field>
        <Field label="Password" id="op-pw" error={error}>
          <Input id="op-pw" icon="lock" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" variant="accent" size="lg" block iconRight="chevronRight" disabled={busy || !id || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p className="login-demo"><strong>Simulation</strong> — demo accounts: <code>operator1 / weld123</code> (GMAW cell), <code>operator2 / weld456</code> (WAAM cell). Not connected to real equipment.</p>
      </form>
    </div>
  );
}
