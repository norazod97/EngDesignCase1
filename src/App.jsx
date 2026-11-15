// Composition root: wires controllers (C) around views (V); models (M) and
// services are only reached through controllers.
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AssistantController } from "./controllers/AssistantController.jsx";
import { CellController } from "./controllers/CellController.jsx";
import { NotificationController } from "./controllers/NotificationController.jsx";
import { SessionController, useSession } from "./controllers/SessionController.jsx";
import { AppShell } from "./views/layout/AppShell.jsx";
import { DashboardPage } from "./views/pages/DashboardPage.jsx";
import { LoginPage } from "./views/pages/LoginPage.jsx";
// parked for the study (PLAN T1): AccountPage, HistorianPage, LabelingPage, ShiftPage.
// Their files stay in views/pages; add the routes back below to use them again.
import { NotFoundPage } from "./views/pages/OtherPages.jsx";
import { WizardPage } from "./views/pages/WizardPage.jsx";

function AuthenticatedApp() {
  const { operator, shift, restoring } = useSession();
  const location = useLocation();
  if (restoring) return <div className="splash" role="status">Loading…</div>;
  if (!operator) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!shift) return <div className="splash">No shift assigned to {operator.name}. Please contact your supervisor.</div>;

  return (
    <CellController cellId={shift.cellId}>
      <NotificationController>
        <AssistantController>
          <AppShell />
        </AssistantController>
      </NotificationController>
    </CellController>
  );
}

export default function App() {
  return (
    <HashRouter>
      <SessionController>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/wizard" element={<WizardPage />} />
          <Route element={<AuthenticatedApp />}>
            {/* After login the operator lands on the dashboard with the assembly list. */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* parked: /shift, /historian, /labeling, /account (PLAN T1) */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SessionController>
    </HashRouter>
  );
}
