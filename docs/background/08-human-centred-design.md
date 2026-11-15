# 08 · Designing for the people who will use it

This document turns two HRC design papers into concrete rules for WeldSense, for the three groups of people most likely to use it. It **overrides generic UI habits**: when in doubt, follow this.

Sources:
- **Frijns & Schmidbauer 2021**: 24 design guidelines for collaborative-robot user interfaces (INTERACT 2021). Cited below as **F1–F24**.
- **Marvel et al. 2020**: NIST framework of metrics and 10 interface design recommendations for collaborative manufacturing (ACM THRI). Cited as **M1–M10**.
- Where a rule comes from general accessibility or HCI practice rather than these papers, it is marked *(general)*.

## 1 · Who the users are

| Persona | What they bring | What makes it hard | What the UI must do |
|---|---|---|---|
| **A. Older worker** | Deep shop-floor and welding experience | Weaker short-term memory, slower learning of new complex concepts, musculoskeletal disorders (back, neck, shoulders, hands) | Never rely on memory; one thing at a time; let experience show; comfortable posture; big, forgiving controls |
| **B. Younger migrant worker** | Often fast with phones and apps | Limited Dutch/English; technical terms are a barrier | Pictures and icons first; short simple sentences; choose own language; no idioms |
| **C. Casual worker** (hired at short notice) | Willing, may know nothing about welding or robots | No experience, no training time, unsure what is safe | Guided mode by default; explain why; safe to explore; make it easy to ask for help |

Shared traits:
- Little or no experience programming robots.
- Little time.
- They **help each other**: an older worker may explain the weld, a younger one the tablet.
- In early adoption they are likely to **distrust** the system.

## 2 · Design goals

1. **Perceived competence**: "I can do this, and I did it well."
2. **Situational awareness of robot state**: at a glance: what the robots are doing, what comes next, and whether anything is wrong.
3. **Ownership of robot actions**: "The robot did this because *I* set it up and confirmed it."
4. **Calibrated trust, not maximal trust**: early distrust is healthy. The goal is that people trust the system when it is right and notice when it is wrong (see `04-ai-transparency.md`).

## 3 · Rules

### 3.1 Situational awareness (F1, F2, F3, F11, M3, M7, M10)
- **Always-visible status bar** on every screen: each robot of the cell with an icon, a colour and a one-word state ("Holding", "Moving", "Welding", "Waiting for you", "Stopped"), and the current step out of the total.
- **Use the same colours as the physical cell** (light tower and robot LEDs). Status on screen and on the robots must match (F19, F20). In the simulation, show a virtual light tower.
- **Previous / current / next step** always shown in the StageStepper (F11).
- **Show the robots and the part in 3D from the operator's point of view**, so nobody has to mentally rotate the scene (M10). Offer a "view from where I stand" button.
- **Graphics before text.** Status, deviations and progress are shown as pictures; text only explains (M3: graphical information gives faster reactions with fewer errors than text).
- **One operator, several robots** (M7): a single cell view shows all robots of the cell. The Shopfloor page shows all cells.

### 3.2 Understanding what the system does (F4–F9, M3)
- **Preview before acting** (F7): before the robots move, play an animation of what they will do: the dry run in 3D, the torch path, the WAAM layers. The person presses "Do it" after watching.
- **Immediate feedback** on every touch (F4): pressed state, a sound option, a short confirmation ("Saved", "Robot A has the part").
- **Show what is possible now** (F5): disabled controls look disabled *and* say why on tap ("Available after the scan").
- **Errors explain and offer recovery** (F6): what happened, why (in plain words), and 1–3 buttons to recover, e.g. "Rescan", "Call a colleague", "Stop the cell". Allow undo wherever safe.
- **Contextual help** (F8): a help button on every step shows help *for that step*, ideally a 10–20 s video or animation without speech, plus pictograms.
- **Templates and examples** (F9): "Start from a previous job like this one".

### 3.3 Memory and cognitive load: Persona A first (F14, F15, M5)
- **Recognition, not recall**: never ask people to remember a value, code or earlier screen. Show the part photo, the CAD and previous values.
- **One decision per screen** in guided mode; at most 3–4 choices visible at once.
- **Persistent "where am I"**: job name, part photo, step, robot state are always visible.
- **Resume anywhere**: if interrupted, the app reopens at the same step with a short "you were here" summary.
- **Draw attention only when needed** (F15): one prominent primary action per screen; alerts are rare, so they keep their meaning.
- **No retraining after changes** (M5): new features must look and behave like existing ones.

### 3.4 Language: Persona B first *(general, plus F21, F22)*
- **Language switch per user**, remembered at login; at least Dutch, English and the most common first languages of the workforce (configurable). All text through react-i18next.
- **Icon + short label** on every action; never icon-only, never text-only.
- **Plain language**: max ~12 words per sentence, present tense, active voice, no idioms or abbreviations. Shop words like "stick-out" and "bead" come with a picture on first use.
- **Numbers with units and a picture**: "Gap 1.2 mm" next to a drawing of the gap.
- **Pictogram-based instructions** for physical steps (mounting, scanning), in the style of assembly instructions.
- **Optional read-aloud** of instructions and alerts (text-to-speech) in the chosen language.

### 3.5 Bodies and ergonomics: Persona A first (F13)
- **Large touch targets**: min 48 px, primary actions 64 px or more; usable with welding gloves *(general)*.
- **Avoid fine motor tasks**: no drag-to-precise-value, no small sliders, no double-tap. Use steppers (−/+) and big presets.
- **Minimal typing**: numeric keypad only where numbers are needed (M: keypad over keyboard).
- **Short screen sessions at the cell**; long reviews belong at a seated workstation. Layouts work on a tablet on an adjustable arm and on a desktop.
- **Hand-guided scanning step** (WAAM): show progress so the person can pause and rest; never time out.

### 3.6 Novices and experts: Persona C and A (F16, F23, F24, M9)
- **Two modes**:
  - **Guided** (default): one step per screen, help visible, more confirmations.
  - **Expert**: compact, more detail, fewer confirmations.

  Anyone can switch; the choice is remembered per user (F23).
- **User chooses the level of automation where safe** (F16): e.g. "Ask me before each layer" vs "Run all layers"; "Show me the path correction before applying" vs "Apply small corrections automatically".
- **Adjustable detail** (M9, F24): text size, contrast, how much detail decision cards show.

### 3.7 Ownership and competence (F16, M2, M4; SDT-based METUX constructs)
- **Name the person in the log**: "Ayşe confirmed the repair region at 10:42". Decisions show "AI proposed → you confirmed" (ownership), or "AI applied automatically, you can stop it" (honesty).
- **Ask, don't announce**: for meaningful choices the system proposes and the person decides (M2: automate sparingly, routine actions only).
- **Human-in-the-loop with canned recovery** (M4): stop, pause, rescan and retry are always one tap away where the process allows. Where it doesn't (GMAW mid-weld), say so in advance.
- **Celebrate competence quietly**: at the end of a job, a short summary such as "3 welds done, all within tolerance. You caught 1 issue." No gamification badges *(general)*.
- **Show the person's contribution**: "Your rescan fixed the coverage gap", "Your flag helped improve the seam finder".

### 3.8 Helping each other (M6)

#### The "Get help" button (call to action, logged)

**Placement and look**
- On **every screen**, in the same place: the right end of the top navbar, next to the on-shift colleague avatars.
- Icon (raised hand) + label "Help" in the user's language.
- At least 64 px, high contrast, never disabled, never hidden behind a menu.
- Present on the wizard-controlled study screens and on error and alert cards too.

**One tap opens a short sheet with big options**
1. **Show me how**: contextual help for this step (video or pictograms; F8).
2. **Ask a colleague**: sends the current screen state (job, step, issue) to another logged-in user's device or the Shopfloor screen, with a short pictogram message. The helper sees it in their own language and can join the same screen.
3. **Call the supervisor / engineer**: same, routed to the engineer role.
4. **Stop and wait for help**: only where the process allows; pauses the job safely.

**Feedback**
- After choosing, the person sees "Help is on the way. You can keep this screen open."
- A small indicator stays visible until the request is closed.

**Tone**
- Asking for help must feel normal, not like failure.
- No counters are shown to the user, and the wording never suggests the person did something wrong.

**Every press is logged as a HelpRequest:**
- who, when, cell, job, run, step, screen;
- which option was chosen;
- active alert or anomaly at that moment (if any);
- time since the step started;
- who answered and when;
- how it ended (resolved by help content / by colleague / by engineer / cancelled);
- time to resolution.

Opening the sheet and then closing it without choosing is logged too, as "help considered". Marvel et al. use "% human assistance requests" as a core metric of human–robot team performance. In the study, these logs give help counts per participant, step, persona and anomaly.

#### Colleagues on shift (avatars in the navbar)

**What it shows**
- The top navigation bar shows **avatars of the colleagues currently on shift**, next to the Help button, so people can see at a glance who can help.
- Each avatar shows:
  - **Photo or initials**, with a coloured ring for availability: green available, amber busy, grey on break. Availability is also shown as an icon and in words, never by colour alone.
  - **First name** under the avatar (always visible, no hover needed; recognition over recall, F14).
  - **Small badges:**
    - role: welder, inspector, engineer, team lead;
    - **languages they speak**, as text codes (NL, EN, TR, PL…), not flags;
    - **skills**, e.g. GMAW, WAAM, NDT.
  - **Where they are**: "at GMAW cell", "at WAAM cell", "office".
- **Ordering**: the most helpful colleague first:
  1. available;
  2. speaks the user's language;
  3. has the skill for the current cell;
  4. is nearby.

  Show up to 5 avatars at 56 px or larger; the rest sit behind a "+3" button that opens the full list.

**Reaching out**
- **Tap an avatar** to open a short sheet:
  - "Ask [name] for help" (sends the current step, screen and issue, as with the Help button);
  - "Ask [name] to come to the cell";
  - "Send a quick message" (pictogram presets: "Come here", "Check this", "I'm stuck", "Thanks").
- The colleague receives the request on their device, in **their own language**, and can accept ("On my way") or decline ("Busy, try Jan").
- The person who asked sees the answer next to that avatar.
- The Help button's "Ask a colleague" option opens the same ordered list, so both routes lead to the same people.

**Logging**
- Each request through an avatar is a HelpRequest with option `colleague` or `engineer`.
- It also records the **chosen colleague**, the colleague's role and shared language, and whether the request was accepted, declined or timed out.
- This shows who people turn to, e.g. older workers helping casual workers, or language matches.

**Privacy and comfort** *(general)*
- Photos are opt-in; initials are the default.
- Presence is set by shift log-in and log-out, plus "I'm on break". There is no location tracking beyond the cell a person has logged in to.
- Nobody sees others' help statistics in this bar.

#### Other support
- **Hand-over notes**: when a shift or person changes, a one-screen summary of what is done and what is next.
- **Shared language**: the helper sees the screen in *their* chosen language.
- **Support requests are counted as data**, not as failure (Marvel's "% human assistance requests" metric).

### 3.9 Early distrust (F6, M3, plus `04-ai-transparency.md`)
- **Transparency of intent** (M3): always show what the robots are trying to achieve, not just what they do.
- **Honest uncertainty and visible track record** (doc 04).
- **First-use tour** for each cell: watch one complete simulated job before doing one.
- **Never hide an AI mistake.** Show it, explain it, and show the check that caught it. This builds trust in the checking system even when the AI is wrong.

## 4 · Heuristic checklist for every new screen
Before a screen is "done", check it against F1–F24 and these questions:
1. Can an older worker use it without remembering anything from a previous screen?
2. Can someone with little Dutch or English understand it from icons and pictures alone?
3. Can a casual worker recover from a mistake without help? Is the "Help" button visible in its usual place?
4. Is the robot state visible, and does it match the physical light colours?
5. Does the person know what they decided and what the AI decided?
6. Are all targets ≥ 48 px, with no fine dragging?
7. Is there at most one primary action?
