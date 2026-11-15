# STYLE: visual reference (HMI SYSTEMS look)

Our components **look like** the HMI SYSTEMS industrial controls (docs.hmisystems.io), but **we build them ourselves** in `src/views/components/primitives.jsx`, with colours in `src/views/theme/tokens.css`.

**Licence:** the HMI SYSTEMS package (EULA, Graphica Labs) forbids copying, modifying, integrating or redistributing its files, fonts or code.
- Never put the vendor zip, its CSS/JS or the DEF Mono font in this repo. The repo is public.
- Use this page and the public docs as reference only. IBM Plex Mono stands in for DEF Mono.

## Look in one line
Light grey background, white cards, near-black square buttons with white UPPERCASE monospaced text, orange (#ff7514) for selected / focus / main action, and round lamps in red / blue / green / yellow.

## Component contracts (match these prop names)

| HMI control | Our component | Props to support | Default size in the kit |
|---|---|---|---|
| Button | `Button` | `text` (children), `isDisabled` (disabled), `fontSize`, `onClick` | 300 × 64 px, font 24 |
| Icon Button | `IconButton` | `type`: positive / negative, `isSquare`, `labelText`, `labelPosition`, `isDisabled` | 84 × 84 px |
| Lamp | `Lamp` | `type`: error / active / positive / warning, `value` (on/off), `labelText`, `labelPosition` | 64 × 64 px |
| Checkbox | `Checkbox` | `isChecked`, `isDisabled`, `labelText`, `labelPosition`, `onChange` | 150 × 40 px |
| Switch | `Switch` | `isChecked`, `textOn`, `textOff`, `isDisabled`, `labelText`, `onChange` | 144 × 72 px |
| Input | `Input` + `Field` | `value`, `placeholder`, `isDisabled`, `labelText`, `labelPosition` (default top-start), `onChange` | 300 × 84 px |
| Label | plain text | `text`, `fontSize` | font 24 |
| Safety Emergency Button | **missing** → `SafetyIndicator kind="estop"` | `isOk`, `isBypassed`, `isBlinking`, `labelText` | 128 × 128 px |
| Safety Light Curtain | **missing** → `SafetyIndicator kind="curtain"` | `isOk`, `isBypassed`, `isBlinking`, `labelText` | 275 × 100 px |
| Safety Scanner | **missing** → `SafetyIndicator kind="scanner"` | `isOk`, `isWarning`, `isBypassed`, `isBlinking`, `labelText` | 148 × 178 px |

`labelPosition` takes 12 values: top / right / bottom / left, each with -start or -end.

## Our adaptations (for older, migrant and casual workers)
- The kit's default text is **24 px**. Use 24 px for status, alarm titles and main buttons. Our 17 px base is the minimum for secondary text.
- Main action buttons: **64 px high** (kit default). Others at least 48 px.
- Lamp + text always. Never colour alone.
- Orange is only a fill behind dark text, never orange text on white.
- Purple "AI" badge on AI content (our addition, not in the kit).
- Safety indicators (e-stop, light curtain, scanner) are **display only**. They show simulated state; they are never safety devices.
