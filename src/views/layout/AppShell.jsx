// VIEW — the page frame: navbar, status bar, side menu, page content, and the
// help channel of this study version (AI dock or colleague panel).
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useCell, useCellSummary } from "../../controllers/CellController.jsx";
import { useFeature } from "../../controllers/ConditionController.js";
import { useHelp } from "../../controllers/HelpController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { StopCycleButton, ToastStack } from "../components/overlays.jsx";
import { SbarAlarmModal } from "../modals/SbarAlarmModal.jsx";
import { AssistantDock } from "./AssistantDock.jsx";
import { HelpPanel } from "./HelpPanel.jsx";
import { Navbar } from "./Navbar.jsx";
import { NotificationsPanel } from "./Panels.jsx";
// parked (PLAN T4/T12): HelpModal and MessagesPanel in Panels.jsx. Help now goes
// through HelpController, the same logged channel in both versions.
import { SideMenu } from "./SideMenu.jsx";
import { StatusBar } from "./StatusBar.jsx";

export function AppShell() {
  const { actions } = useCell();
  const { canStop } = useCellSummary();
  const { toasts, dismissToast, push } = useNotifications();
  const help = useHelp();
  const hasAiDock = useFeature("assistantDock"); // chatbot build only
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState(null); // "notifications" or null
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); setPanel(null); }, [location.pathname]);

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

  const stop = useCallback(() => {
    const r = actions.stop();
    if (r.ok) push({ tone: "warning", title: "Cycle stopped", body: "The robots have stopped. Press Resume on the dashboard when ready." });
  }, [actions, push]);

  // Help from a page (e.g. "Request help" when the cell is stopped).
  const requestHelp = useCallback((context) => {
    help.openHelp({ via: context?.topic === "Cell stopped" ? "cell_stopped" : "page" });
  }, [help]);

  // Help button in the navbar: open the help channel, or close it if it is open.
  const toggleHelp = useCallback(() => {
    if (help.panelOpen) help.closeHelp("closed");
    else help.openHelp({ via: "navbar" });
  }, [help]);

  const aiOpen = hasAiDock && help.panelOpen;

  return (
    <div className={`shell ${aiOpen ? "has-assistant" : ""}`}>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar onToggleMenu={() => setMenuOpen((o) => !o)} menuOpen={menuOpen} panel={panel} onPanel={togglePanel}
        helpOpen={help.panelOpen} onHelp={toggleHelp} onStopRequest={stop} />
      <StatusBar />
      <SideMenu open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <main id="main" className="shell-main" tabIndex={-1}>
        <Outlet context={{ requestHelp }} />
      </main>

      {/* The help channel of this study version. */}
      {hasAiDock ? <AssistantDock open={aiOpen} onToggle={toggleHelp} /> : <HelpPanel />}

      {panel === "notifications" && <NotificationsPanel onClose={() => setPanel(null)} />}

      {/* Alarm window: opens by itself when the cell has an alarm (PLAN section 2). */}
      <SbarAlarmModal />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Mobile: the stop control moves to a fixed bottom bar so it is always reachable. */}
      <div className="mobile-stop"><StopCycleButton onStop={stop} disabled={!canStop} /></div>
    </div>
  );
}
