// VIEW — help panel for the colleagues build (outside the alarm window).
// Opens from the Help button, a colleague's picture in the navbar, or the
// dashboard. First pick a colleague (unless one was tapped), then chat.
// The chatbot build uses the AI dock (AssistantDock) instead.
import { useAssistant } from "../../controllers/AssistantController.jsx";
import { useHelp } from "../../controllers/HelpController.jsx";
import { HELP_TEXT as T } from "../../i18n/en.js";
import { ColleaguePicker, HelpChat } from "../components/HelpChat.jsx";
import { IconButton } from "../components/primitives.jsx";

export function HelpPanel() {
  const help = useHelp();
  const { messages, typing } = useAssistant();
  if (!help.panelOpen) return null;

  return (
    <aside className="drawer help-drawer" aria-label={T.panelTitleColleagues}>
      <header className="drawer-head">
        <h2>{T.panelTitleColleagues}</h2>
        <IconButton icon="close" label={T.close} className="icon-btn-plain" onClick={() => help.closeHelp("closed")} />
      </header>
      <div className="drawer-body">
        {help.persona
          ? <HelpChat persona={help.persona} messages={messages} typing={typing} since={help.openedAt} onSend={help.send} />
          : <ColleaguePicker colleagues={help.colleagues} onPick={help.chooseColleague} />}
      </div>
    </aside>
  );
}
