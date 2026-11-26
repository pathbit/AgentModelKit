---
description: Design técnico da CLI AgentModelKit.
status: aprovado
---

# Arquitetura

[English](ARCHITECTURE.en.md) · [Español](ARCHITECTURE.es.md)

A CLI usa módulos ESM e APIs nativas do Node.js, sem dependências de execução do pacote. Os adaptadores gravam os arquivos dos clientes. A aplicação não precisa de daemon ou banco de dados.

- [src/agentmodelkit.mjs](../src/agentmodelkit.mjs) expõe a CLI e apresenta erros no terminal.
- [src/cli.mjs](../src/cli.mjs) interpreta opções, obtém credenciais quando necessárias, resolve modelos e prepara os arquivos antes de qualquer gravação.
- [src/providers](../src/providers) resolve metadados de conexão, tiers e modelos para cada provider. Manifestos manuais usam o mesmo formato interno.
- [src/catalogs](../src/catalogs) lê snapshots, normaliza as APIs do OpenCode e verifica o catálogo público assinado do FreeLLMAPI.
- [src/targets](../src/targets) converte grupos em configuração para cada cliente, preserva entradas manuais e modifica apenas os modelos selecionados ou gerenciados.
- [src/utils/json.mjs](../src/utils/json.mjs) prepara arquivos temporários, detecta edições concorrentes sob locks, cria backups e renomeia os arquivos. Em falha durante a gravação, tenta restaurar os arquivos já alterados.

O OpenCode usa `.opencode/opencode.json` e um registro adjacente de modelos gerenciados. O Copilot CLI agrupa conexões por protocolo. O VS Code registra os endpoints em cada modelo e guarda o registro de propriedade em um arquivo adjacente. As configurações da versão preliminar são reconhecidas pelas marcações geradas pelo projeto e podem ser migradas gradualmente.

A presença na origem é diferente da seleção configurável. Os comandos de remoção usam uma consulta completa e validada. Uma lista parcial, vazia ou inválida interrompe a operação.

O fluxo de publicação usa um tarball produzido e testado pela CI. Cada destino recebe esse arquivo. Depois da publicação, a verificação do npmjs consulta o pacote público, confirma o seletor de versão e compara os bytes baixados com a integridade do tarball.

Base aprovada pelo mantenedor em 25 de novembro de 2026 para a entrega da `0.0.2`.

[Índice da documentação](README.md)
