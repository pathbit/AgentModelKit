# Providers

[Português (Brasil)](PROVIDERS.md) · [Español](PROVIDERS.es.md)

## OpenCode Console and Go

Use `--providers opencode` and select `--tiers payg`, `go` or `all`. PAYG uses your workspace credits and policy. Go requires an eligible subscription. The catalog also lists Free models, which OpenCode restricts to its own client. Chat models use Chat Completions, Responses or Messages according to the catalog. Console can translate requests for models whose native API is Gemini. [OpenCode Console and external clients](https://opencode.ai/docs/console/harnesses/).

OpenCode Go requests a session identifier per conversation. AgentModelKit uses static headers with one identifier per VS Code or Copilot CLI profile or per OpenCode project. Conversations in the same profile or project share the identifier. Go compatibility also depends on session requirements and your account policies. [Go requirements and validated clients](https://opencode.ai/docs/console/go/#where-can-i-use-it).

Provide the key in `OPENCODE_API_KEY` or with `--key-file`. The availability list for removal comes from the public Go and Console endpoints.

## FreeLLMAPI

Run `freellmapi` and select the clients. **Local** is the first option. Enter the server address, such as `http://127.0.0.1:3001/v1` for Docker or the URL displayed by the Desktop app. Use the unified key from the dashboard. In automation, set `--url` or `FREELLMAPI_URL` and supply the key with `FREELLMAPI_API_KEY` or `--key-file`.

**Remote** uses your own deployment's HTTPS URL, set in `FREELLMAPI_REMOTE_URL` or passed with `--url`. The wizard uses `FREELLMAPI_REMOTE_API_KEY` or asks for that deployment's key. Use `--connection remote` in scripts. The public `api.freellmapi.co` domain serves the catalog. Follow the [official deployment guide](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md) to expose your own instance.

The **Keys → Agents** dashboard can also create a revocable token URL such as `https://llm.example.com/v1/t/EXAMPLE_TOKEN`. The URL itself authenticates access. The wizard hides pasted input. OpenCode references a private file, while VS Code and Copilot CLI store the URL in their profile files.

- `auto` registers the default router.
- `strategies` registers the virtual strategies bundled in `data/`.
- `ready` queries `/v1/models?execution_status=ready` and includes the strategies. A failed query stops configuration.
- `prune` queries `/v1/models` on the chosen server. Models that are still listed remain configured, including ones without a key or temporarily unavailable.

The public monthly catalog is a research reference. Readiness depends on the keys, limits and state of your selected server. [FreeLLMAPI API](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md#model-listing).

## Manual providers

Create a JSON document using the [example](../examples/provider.local.example.json). Specify a unique `custom-*` ID, an HTTP(S) URL, the protocol, and the token limits for each model. Keep keys outside the manifest. If `requiresKey` is true (the default), use an environment variable derived from the ID, such as `CUSTOM_MY_PROVIDER_API_KEY`, or pass `--key-file`.

`modelsUrl` is optional and must use the same origin as the endpoint. Specify it to use `--live` and `prune`. The response must be a full, unpaginated OpenAI-compatible list. For `--powerful`, declare IDs in `powerfulIds`. With the Messages protocol, include `/v1` in the base when it is part of the `/v1/messages` route.

[Documentation index](README.en.md)
