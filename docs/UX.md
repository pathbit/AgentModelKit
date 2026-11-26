---
description: Experiência de configuração da CLI.
status: aprovado
---

# Experiência no terminal

[English](UX.en.md) · [Español](UX.es.md) · [Requisitos](PRD.md)

1. Escolha o provider e marque os clientes com **Espaço**. Use **A** para marcar ou limpar todos e **Enter** para confirmar. O menu exige pelo menos um cliente.
2. Quando necessário, informe o plano, a URL e os modelos. Digite a chave no prompt protegido, ou use uma variável de ambiente ou `--key-file`.
3. A saída mostra os clientes afetados, os arquivos gerados e os caminhos dos backups. Use `--dry-run` para ver o que mudaria. Em automações, informe as escolhas e use `--yes` como opção da CLI.
4. Um erro de pré-validação informa o arquivo ou a opção que precisa ser corrigida. Consulte [clientes e backups](CLIENTS.md) para localizar os perfis.

Verifique o menu com [os exemplos](../README.md#início-rápido) e [os testes](https://github.com/pathbit/AgentModelKit/blob/main/tests/README.md). A matriz usa testes automatizados de seleção e gravação. A revisão em terminal real é registrada por cliente e por versão.

Base aprovada pelo mantenedor em 25 de novembro de 2026 para a entrega da `0.0.2`.
