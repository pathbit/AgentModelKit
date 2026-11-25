# Arquitetura

- [bin/agentmodelkit.mjs](../bin/agentmodelkit.mjs) expõe a CLI e apresenta erros no terminal.
- [src/cli.mjs](../src/cli.mjs) interpreta opções, obtém credenciais quando necessárias, resolve modelos e prepara os arquivos antes de qualquer gravação.
- [src/providers](../src/providers) resolve metadados de conexão, tiers e modelos para cada provider. Manifestos manuais usam o mesmo formato interno.
- [src/catalogs](../src/catalogs) lê snapshots, normaliza as APIs do OpenCode e verifica o catálogo público assinado do FreeLLMAPI.
- [src/targets](../src/targets) converte grupos em configuração para cada cliente, preserva entradas manuais e modifica apenas os modelos selecionados ou gerenciados.
- [src/utils/json.mjs](../src/utils/json.mjs) prepara arquivos temporários, detecta edições concorrentes sob locks, cria backups e renomeia os arquivos. Em falha durante a gravação, tenta restaurar os arquivos já alterados.

O Copilot CLI agrupa conexões por protocolo. O VS Code registra os endpoints em cada modelo e guarda o registro de propriedade em um arquivo adjacente. As configurações da versão preliminar são reconhecidas pelas marcações geradas pelo projeto e podem ser migradas gradualmente.

A presença na origem é diferente da seleção configurável. Os comandos de remoção usam uma consulta completa e validada. Uma lista parcial, vazia ou inválida interrompe a operação.

[Índice da documentação](README.md)
