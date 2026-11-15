// CONTROLLER — operator session: who is signed in, their shift and jobs.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as mes from "../services/mesService.js";
import { load, save } from "../services/storage.js";

const SessionContext = createContext(null);

export function SessionController({ children }) {
  const [operator, setOperator] = useState(null);
  const [assignment, setAssignment] = useState(null); // { shift, jobs }
  const [restoring, setRestoring] = useState(true);

  const hydrate = useCallback(async (profile) => {
    // Certifications added in the browser survive reloads (demo only).
    const extraCerts = load(`certs:${profile.id}`, []);
    setOperator({ ...profile, certifications: [...profile.certifications, ...extraCerts] });
    setAssignment(await mes.getShiftAssignment(profile.id));
  }, []);

  useEffect(() => {
    const id = load("operator");
    (async () => {
      const profile = id ? await mes.getOperator(id) : null;
      if (profile) await hydrate(profile);
      setRestoring(false);
    })();
  }, [hydrate]);

  const signIn = useCallback(async (id, password) => {
    const profile = await mes.authenticate(id, password);
    if (!profile) return { ok: false, reason: "Operator ID or password not recognised. Please try again." };
    save("operator", profile.id);
    await hydrate(profile);
    return { ok: true };
  }, [hydrate]);

  const signOut = useCallback(() => {
    save("operator", null);
    setOperator(null);
    setAssignment(null);
  }, []);

  const addCertification = useCallback((cert) => {
    setOperator((op) => {
      const entry = { id: `u-${Date.now()}`, status: "pending", ...cert };
      const extra = [...load(`certs:${op.id}`, []), entry];
      save(`certs:${op.id}`, extra);
      return { ...op, certifications: [...op.certifications, entry] };
    });
  }, []);

  const value = useMemo(
    () => ({ operator, shift: assignment?.shift ?? null, jobs: assignment?.jobs ?? [], restoring, signIn, signOut, addCertification }),
    [operator, assignment, restoring, signIn, signOut, addCertification],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionController>");
  return ctx;
}
