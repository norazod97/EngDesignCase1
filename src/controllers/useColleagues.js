// CONTROLLER — colleagues on the shop floor, for the navbar and the Messages panel.
// Views call this hook instead of importing the service (MVC rule in CLAUDE.md).
import { useEffect, useState } from "react";
import { getColleaguesOnShift } from "../services/mesService.js";

/** Out: list of colleagues (empty while loading). Available ones come first. */
export function useColleaguesOnShift() {
  const [colleagues, setColleagues] = useState([]);

  useEffect(() => {
    let alive = true; // ignore the answer if the component is already gone
    getColleaguesOnShift().then((list) => {
      if (!alive) return;
      // Sort: available first, then busy (so the people you can reach are on the left).
      const rank = { available: 0, busy: 1 };
      setColleagues([...list].sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2)));
    });
    return () => { alive = false; };
  }, []);

  return colleagues;
}
