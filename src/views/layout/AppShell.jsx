import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useCell, useCellSummary } from "../../controllers/CellController.jsx";
import { useNotifications } from "../../controllers/NotificationController.jsx";
import { load, save } from "../../services/storage.js";
import { StopCycleButton, ToastStack } from "../components/overlays.jsx";
import { SbarAlarmModal } from "../modals/SbarAlarmModal.jsx";
import { AssistantDock } from "./AssistantDock.jsx";
import { Navbar } from "./Navbar.jsx";
import { HelpModal, MessagesPanel, NotificationsPanel } from "./Panels.jsx";
import { SideMenu } from "./SideMenu.jsx";
import { StatusBar } from "./StatusBar.jsx";

export function AppShell() {
  const { actions } = useCell();
  const { canStop } = useCellSummary();
  const { toasts, dismissToast, push } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState(null); // "notifications" | "messages" | "help"
  const [helpContext, setHelpContext] = useState(null);
  // On small screens the assistant is an overlay, so it always starts closed.
  const [assistantOpen, setAssistantOpen] = useState(() => window.innerWidth > 1100 && load("assistantOpen", true));
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); setPanel((p) => (p === "help" ? p : null)); }, [location.pathname]);
  useEffect(() => { save("assistantOpen", assistantOpen); }, [assistantOpen]);

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

  const stop = useCallback(() => {
    const r = actions.stop();
    if (r.ok) push({ tone: "warning", title: "Cycle stopped", body: "The robots have stopped. Press Resume on the dashboard when ready." });
  }, [actions, push]);

  const requestHelp = useCallback((context) => { setHelpContext(context); setPanel("help"); }, []);
  const sendHelp = useCallback(({ target, note, context }) => {
    actions.log(`Help requested from ${target}.`, { note, ...context });
  }, [actions]);

  return (
    <div className={`shell ${assistantOpen ? "has-assistant" : ""}`}>
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar onToggleMenu={() => setMenuOpen((o) => !o)} menuOpen={menuOpen} panel={panel} onPanel={togglePanel} onStopRequest={stop} />
      <StatusBar />
      <SideMenu open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <main id="main" className="shell-main" tabIndex={-1}>
        <Outlet context={{ requestHelp }} />
      </main>

      <AssistantDock open={assistantOpen} onToggle={() => setAssistantOpen((o) => !o)} />

      {panel === "notifications" && <NotificationsPanel onClose={() => setPanel(null)} />}
      {panel === "messages" && <MessagesPanel onClose={() => setPanel(null)} />}
      <HelpModal open={panel === "help"} context={helpContext} onClose={() => { setPanel(null); setHelpContext(null); }} onSend={sendHelp} />

      {/* Alarm window: opens by itself when the cell has an alarm (PLAN section 2). */}
      <SbarAlarmModal />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Mobile: the stop control moves to a fixed bottom bar so it is always reachable. */}
      <div className="mobile-stop"><StopCycleButton onStop={stop} disabled={!canStop} /></div>
    </div>
  );
}
