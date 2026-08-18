# Whisper work notes

Running notes on the Whisper fork's own changes. One section per piece of work.

## Context budget

Every knob that bounds how many tokens a buzz-agent turn sends. The framing
that matters: a tool result, an image or a cached prefix is not paid once, it
is paid again on every later turn of the same session, because the whole
history is re-sent each round. So a cap on what enters the prompt is a
per-turn multiplier, and caching is what stops the unchanged part being
re-billed at full price.

### Per-request payload

| Knob | Default | What it bounds |
|---|---|---|
| `BUZZ_AGENT_MAX_TOOL_RESULT_TEXT_BYTES` | `16384` (16 KiB) | Text of a single tool result. Oversize is middle-elided, head and tail kept, with a marker naming how many bytes went, so the model knows to re-run something narrower rather than trust the gap. Was 50 KiB. `crates/buzz-agent/src/config.rs:395`, elision in `crates/buzz-agent/src/mcp.rs:916`. |
| `BUZZ_AGENT_KEEP_RECENT_IMAGES` | `2` | How many of the most recent image-bearing tool results still send their images. Older ones become `[image omitted from context: sent earlier in this session]`. Counted in image-bearing results, not turns or individual images: a result carrying several images uses one slot, and a run of text-only results never ages a screenshot out. Applied while the request body is built, so durable history keeps the real image and transcripts and handoffs are unaffected. `crates/buzz-agent/src/config.rs:403`, `crates/buzz-agent/src/llm.rs:744`. |
| `BUZZ_AGENT_MAX_CONTEXT_TOKENS` | `200000` | The provider window the handoff gate assumes. Compaction fires when the previous request's input tokens cross 90% of it, before the next request can exceed the window and 400. Not a cap on what is sent, a trigger for summarising and starting again. `crates/buzz-agent/src/config.rs:655`, threshold in `crates/buzz-agent/src/handoff.rs:499`. |

### Caching (what stops the unchanged prefix being re-billed)

| Knob | Default | What it bounds |
|---|---|---|
| `BUZZ_AGENT_PROMPT_CACHING` | `1` | The kill switch for every Anthropic `cache_control` breakpoint: the static prefix (tools plus system) and the rolling conversation tail. Reaches all three Anthropic-dialect routes, first-party Anthropic, the Databricks v2 Claude route, and OpenRouter `anthropic/*`. `0` removes the markers, and every cached read becomes a full-price input token. `crates/buzz-agent/src/config.rs:667`. |
| `BUZZ_AGENT_CACHE_TTL` | `1h` | How long a written cache entry lives on the first-party Anthropic route. `1h` stamps `"ttl": "1h"` on every breakpoint; `5m` emits no `ttl` field, which is Anthropic's own default. A 1-hour write costs 2x base input against 1.25x for the 5-minute one, and reads stay at 0.1x either way, so it pays for itself the first time a gap between turns exceeds five minutes. Not sent on the Databricks route, which Anthropic does not list among the providers offering the extended cache. Any value other than `5m` or `1h` is a startup error. `crates/buzz-agent/src/config.rs:1032`. |
| `BUZZ_AGENT_OPENROUTER_CACHE_TTL` | `1h` | The same, for OpenRouter's `anthropic/*` models. OpenRouter documents `"ttl": "1h"` as a supported and forwarded `cache_control` field. Set `5m` to fall back to today's shape if that ever regresses. `crates/buzz-agent/src/llm.rs:731`. |

Both TTL knobs resolve at the config boundary rather than at each marker: `5m`
parses to `None`, which is exactly the wire shape of a 5-minute cache, so no
call site has to compare strings and no request can end up with a TTL on some
breakpoints and not others. A mixed prefix would write two cache entries and
read neither, which is the one failure mode worse than not caching.

### Harness level (buzz-acp, not edited here)

| Knob | Default | What it bounds |
|---|---|---|
| `BUZZ_ACP_CONTEXT_MESSAGE_LIMIT` | `12` | How many prior Buzz messages are fetched and prepended as context for a thread reply or DM. Bounds the size of the very first prompt of a session; `0` disables the fetch, maximum 100. `crates/buzz-acp/src/config.rs:366`. |
| `BUZZ_ACP_MAX_TURNS_PER_SESSION` | `0` (off) | Turns before the session is proactively rotated and its history dropped. With it off, rotation happens only on `MaxTokens` or `MaxTurnRequests`, so the history keeps growing until something upstream forces the issue. `crates/buzz-acp/src/config.rs:372`. |

### Sources

- Anthropic prompt caching, including the 1-hour duration and the pricing
  multipliers: <https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching>
- OpenRouter prompt caching, "Cache TTL Options":
  <https://openrouter.ai/docs/features/prompt-caching>
