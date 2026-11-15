// CONDITION A — chatbot build.
// Help comes from the "AI" (the wizard typing in the console). No colleague avatars.
export const chatbot = {
  id: "A_chatbot",
  label: "Chatbot",
  helpChannel: "ai", // the alarm's help button says "Ask AI"
  features: {
    assistantDock: true, // the "Ask AI" chat panel
    colleagueAvatars: false, // no colleague pictures in the navbar
  },
};
