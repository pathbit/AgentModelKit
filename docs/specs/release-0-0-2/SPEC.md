---
description: AgentModelKit 0.0.2
status: aprovado
---

# Entrega do AgentModelKit 0.0.2

[English](SPEC.en.md) · [Español](SPEC.es.md) · [Roadmap](../../ROADMAP.md)

## Objetivo

Entregar as correções da configuração do VS Code e da consulta de versão. Confirmar que o tarball público do npmjs corresponde ao artefato da CI antes de espelhá-lo no GitHub.

## Requisitos e limites

- Ao reaplicar a configuração do mesmo endpoint do VS Code, preservar cabeçalhos personalizados e referências a segredos. A troca do endpoint não transfere cabeçalhos anteriores.
- Expor a versão do pacote nos aliases `agentmodelkit` e `amk`. Manter a execução por `npx` sem gravar dependências no projeto.
- Validar Linux, Windows e macOS com Node.js 18, 22 e 24. Conferir guias em português do Brasil, inglês e espanhol.
- Usar o ambiente protegido `npmjs` e a identidade do workflow autorizada pelo Trusted Publisher. Confirmar o download sem autenticação antes da publicação do mesmo pacote no GitHub.
- O escopo cobre os clientes e providers existentes. Novas integrações permanecem no [roadmap](../../ROADMAP.md#evolução).

## Critérios de aceite e plano de verificação

As provas locais da entrega ficam em `.agent-tests/release-0-0-2/`. A prova pública será vinculada no [registro da versão](../../releases/v0-0-2/RELEASE.md).

| Critério | Comando e pré-requisito | Resultado observável |
| --- | --- | --- |
| AC-001 | `npm test` com perfis sintéticos | A rotação preserva os cabeçalhos e as referências no mesmo endereço. Cabeçalhos antigos ficam restritos ao endpoint anterior. |
| AC-002 | `npm run check` e `npm run test:package` na matriz de CI | O tarball roda via npm em uma pasta vazia. Os dois aliases retornam `0.0.2`, e os links relativos dos guias resolvem no pacote. |
| AC-003 | `node --test tests/release.test.mjs` com registro simulado | O fluxo tolera atraso de disponibilidade e rejeita integridade divergente, outro registro e download alterado. |
| AC-004 | Workflow `Release` no commit verificado, com aprovação e Trusted Publisher. Depois, baixar e comparar os artefatos dos três destinos com o tarball da CI | `@0.0.2` e `@latest` resolvem para a nova versão. O npmjs, o GitHub Packages e o GitHub Release servem os mesmos bytes da CI. |

## Referências e aprovação

O mantenedor aprovou a base e autorizou formalizar a entrega e publicar a `0.0.2` em 25 de novembro de 2026. Esta é a primeira spec registrada no projeto. [Requisitos](../../PRD.md) · [Experiência no terminal](../../UX.md) · [Design técnico](../../ARCHITECTURE.md) · [Publicação](../../RELEASE.md)
