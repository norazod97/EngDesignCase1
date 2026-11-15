// CONDITION B — colleagues build.
// Help comes from colleagues on the shop floor (the wizard typing as them). No chatbot.
export const colleagues = {
  id: "B_colleagues",
  label: "Colleagues",
  helpChannel: "colleague", // the alarm's help button says "Call <name>"
  features: {
    assistantDock: false, // no AI chat
    colleagueAvatars: true, // colleague pictures in the navbar
  },
};
