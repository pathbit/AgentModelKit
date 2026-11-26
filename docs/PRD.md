---
description: Requisitos do AgentModelKit.
status: aprovado
---

# Requisitos do produto

[English](PRD.en.md) · [Español](PRD.es.md) · [Documentação](README.md)

O AgentModelKit configura o acesso a modelos de IA em projetos novos ou existentes. O público inclui quem trabalha com mais de um agente de código e precisa manter providers e modelos consistentes sem configurar cada cliente à mão.

## Requisitos

1. Executar via `npx` com Node.js 18 ou posterior. O npmjs oferece `@latest` e versões fixas. O tarball de cada GitHub Release também é público.
2. Configurar OpenCode por projeto, VS Code por perfil e Copilot CLI pelo arquivo do usuário. O menu permite marcar vários clientes. A automação usa argumentos.
3. Configurar OpenCode Go/PAYG, FreeLLMAPI local ou remoto e providers declarados em manifestos. A execução padrão usa os catálogos inclusos.
4. Mostrar o efeito de alterações com `--dry-run`, criar backups ao regravar arquivos existentes e preservar entradas manuais.
5. Manter guias em português do Brasil, inglês e espanhol. A CLI, o código e os scripts usam inglês.

## Como verificar

O [início rápido](../README.md) documenta o fluxo do usuário. [Experiência no terminal](UX.md) descreve o menu e os erros. A [arquitetura](ARCHITECTURE.md) registra as fronteiras entre projeto e perfil. O [roadmap](ROADMAP.md) vincula as entregas e as verificações da próxima versão.

## Limites e decisões

Os clientes e os servidores de inferência têm instalações e credenciais próprias. A CLI gera os arquivos com os dados fornecidos. Novos clientes, novas integrações e mudanças nas regras de credenciais entram no roadmap quando houver requisitos verificáveis.

Baseline levantada do código, da documentação e da `0.0.1` publicada. Base aprovada pelo mantenedor em 25 de novembro de 2026 para a entrega da `0.0.2`.
