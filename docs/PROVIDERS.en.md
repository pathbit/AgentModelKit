# Providers

[Português (Brasil)](PROVIDERS.md) · [Español](PROVIDERS.es.md)

## OpenCode Console and Go

Use `--providers opencode` and select `--tiers payg`, `go` or `all`. PAYG uses your workspace credits and policy. Go requires an eligible subscription. The catalog also lists Free models, which OpenCode restricts to its own client. Chat models use Chat Completions, Responses or Messages according to the catalog. Console can translate requests for models whose native API is Gemini. [OpenCode Console and external clients](https://opencode.ai/docs/console/harnesses/).

OpenCode Go requests a session identifier per conversation. AgentModelKit uses static headers with one identifier per VS Code or Copilot CLI profile or per OpenCode project. Conversations in the same profile or project share the identifier. Go compatibility also depends on session requirements and your account policies. [Go requirements and validated clients](https://opencode.ai/docs/console/go/#where-can-i-use-it).

Provide the key in `OPENCODE_API_KEY` or with `--key-file`. The availability list for removal comes from the public Go and Console endpoints.

## FreeLLMAPI

In the FreeLLMAPI server dashboard, open **Keys → Agents** and copy the agent URL. Paste it into the wizard or pass it with `--url`. A revocable token URL has the form `https://llm.example.com/v1/t/EXAMPLE_TOKEN`. AgentModelKit also accepts the copied URL ending in `/chat/completions`. The token in the URL authenticates access. The default mode configures `auto`.

Treat the agent URL as a credential. Prefer pasting it into the wizard, which hides the input. For automation, set `FREELLMAPI_URL` in a private environment. OpenCode references a private file outside the project. VS Code and Copilot CLI store the URL in their profile files. Keep those files and their backups private.

For a standard server address such as `http://localhost:3001/v1`, set the unified key using `FREELLMAPI_API_KEY` or `--key-file`. The wizard can also detect the local port. Advanced modes remain available.

- `auto` registers the default router.
- `strategies` registers the virtual strategies bundled in `data/`.
- `ready` queries `/v1/models?execution_status=ready` and includes the strategies. A failed query stops configuration.
- `prune` queries `/v1/models` on the chosen server. Models that are still listed remain configured, including ones without a key or temporarily unavailable.

The public monthly catalog is a research reference. Readiness depends on the keys, limits and state of your selected server. [FreeLLMAPI API](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md#model-listing).

## Manual providers

Create a JSON document using the [example](../examples/provider.local.example.json). Specify a unique `custom-*` ID, an HTTP(S) URL, the protocol, and the token limits for each model. Keep keys outside the manifest. If `requiresKey` is true (the default), use an environment variable derived from the ID, such as `CUSTOM_MY_PROVIDER_API_KEY`, or pass `--key-file`.

`modelsUrl` is optional and must use the same origin as the endpoint. Specify it to use `--live` and `prune`. The response must be a full, unpaginated OpenAI-compatible list. For `--powerful`, declare IDs in `powerfulIds`. With the Messages protocol, include `/v1` in the base when it is part of the `/v1/messages` route.

[Documentation index](README.en.md)
