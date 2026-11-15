# 12 · Help chatbot (condition A only)

> **Background only.** The study uses decision D1 = a: the chatbot is the researcher typing (Wizard-of-Oz), using each alarm's `resolution_script`. See `docs/PLAN.md` sections 2 and 2a. The LLM details below are kept for a possible later version.

## Behaviour
- Opens from the Help button as a side panel (bottom sheet on a tablet).
- Starts with **context already known**: "I see the alarm 'Gas flow too low' on step 'Ready to weld'. What do you want to know?" The participant does not have to explain.
- **Quick-reply chips** for low literacy and gloves: "What does this mean?", "What should I check?", "What do I do now?", "Is it safe?". They map to hints 1, 2, 3 and a safety answer.
- **Voice input and read-aloud** (optional): browser speech APIs, in the participant's language.
- Answers: **max 4 short sentences**, plain words, in the participant's language, with the hint level shown ("Tip 1 of 3").
- **Never claims to act on the machine.** It cannot press buttons; it says which button the person should press.
- **No invented facts.** If the question is not covered by the grounding, it says: "I don't know that. Stop the cell if unsure, or ask your supervisor." (The supervisor exists only as a phrase; condition A has no colleague avatars.)

## Grounding (what the model may use)
Built per request by `ChatbotHelpProvider`:
1. Active alarm: `title`, `operator_message`, `technical_detail`, `signals`, `ai_decision`, `help_content.hints`, `glossary`.
2. Current step text from the cell profile (title, instructions).
3. A short glossary of shop words.
4. Persona rules: short sentences, the user's language, hints from level 1 to 3 (give the next level only if asked or if the person is still stuck).

**Never include `ground_truth` or `expected_response`** in the prompt. The bot must coach, not hand over the answer key. The hints already lead to the correct action. (`expected_response` is used only for scoring.)

## Modes (`condition.json → chatbot.mode`)
| Mode | What happens | Use |
|---|---|---|
| `llm` | Model answers directly | Pilots |
| `llm_with_wizard_monitor` (default) | Model answers. The wizard sees the chat live and can send a correction marked as an assistant message; corrections are logged as `wizard_intervention` | Main study |
| `wizard_typed` | The wizard types every answer (pure Wizard-of-Oz) | Fallback if API access or ethics rules out an external LLM |

## Implementation (backend, Python, Anthropic SDK)
- Package `anthropic`. The API key lives only in the backend environment (`ANTHROPIC_API_KEY`), never in the frontend.
- **Model:** `claude-opus-5-5`, with `output_config={"effort": "low"}` to keep chat answers quick.
- **Server-side fallbacks** on (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`): if the model declines a request on safety grounds, the API reruns it on a fallback model instead of returning nothing.
- **Streaming** to the frontend over the existing WebSocket (or SSE): words appear as they are generated.

Sketch for Claude Code. Check it against the current SDK docs before relying on it:

```python
import anthropic

client = anthropic.AsyncAnthropic()

async def answer(system_prompt: str, history: list[dict]):
    async with client.beta.messages.stream(
        model="claude-opus-5-5",
        max_tokens=4000,
        system=system_prompt,                 # persona rules + grounding (stable part first, for caching)
        messages=history,                     # [{"role": "user"|"assistant", "content": "..."}]
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
    ) as stream:
        async for text in stream.text_stream:
            yield text                        # forward each chunk to the participant's chat panel
        final = await stream.get_final_message()
        # log final.stop_reason, final.usage (tokens) and latency in the HelpRequest / chat log
```

**Handling problems:**
- `stop_reason == "refusal"` (rare) → show the fixed text "I can't help with that. Ask your supervisor or stop the cell."
- Network or API errors → show "The help assistant is not available right now", log it, and alert the wizard.

**Logging** (in addition to HelpRequest): every user message and assistant reply with timestamps, latency to first token, total latency, hint level reached, token usage, model version, wizard interventions.
