# Clientes

[English](CLIENTS.en.md) · [Español](CLIENTS.es.md)

## OpenCode no projeto

Use `--targets opencode` ou selecione **OpenCode (current project)** com **Espaço** no assistente. Execute o comando a partir da pasta do projeto ou use `--project-dir`. O AgentModelKit gera `.opencode/opencode.json` para **OpenCode 2** e registra os modelos gerenciados em `.opencode/agentmodelkit-models.json`. A configuração direta `opencode.json(c)` continua disponível para seus ajustes.

Configure a chave por uma variável do provider, como `FREELLMAPI_API_KEY`, ou passe `--key-file <arquivo> --no-save-key` para gravar uma referência ao arquivo existente. Abra o projeto no cliente e escolha os modelos em `/models`. [Configuração por projeto do OpenCode](https://opencode.ai/docs/config/#locations).

## GitHub Copilot CLI

O registro BYOK utiliza `providers.json` do `COPILOT_HOME` ou do caminho indicado por `COPILOT_PROVIDERS_CONFIG`. O padrão é `~/.copilot/providers.json`. Reinicie o cliente após a configuração e escolha um modelo com `/model`.

O formato nomeado lê `apiKey` do JSON. Chaves salvas pela versão preliminar em `<COPILOT_HOME>/<provider>.key` continuam disponíveis para migração. Ao atualizar um provider, o AgentModelKit passa a gravar seu campo `apiKey` estático. `--no-save-key` controla a cópia em `.key`. O arquivo de configuração e os backups devem ser tratados como credenciais. [Referência oficial do registro BYOK](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference#providersjson).

Escolha `--default-model` para definir um padrão no `settings.json` do Copilot. A CLI valida se o modelo está entre as opções da operação. Se uma remoção atingir um modelo padrão qualificado, a seleção é limpa para o Copilot usar seus padrões.

## VS Code

O arquivo `chatLanguageModels.json` pertence ao perfil do VS Code. Ajuste `VSCODE_USER_DIR` quando usar um perfil específico, VS Code Insiders, ou um diretório de dados separado. Caminhos padrão do VS Code estável:

| Sistema | Diretório |
| --- | --- |
| Windows | `%APPDATA%\Code\User` |
| macOS | `~/Library/Application Support/Code/User` |
| Linux | `$XDG_CONFIG_HOME/Code/User` ou `~/.config/Code/User` |

Os grupos usam o provider **Custom Endpoint**. Abra **Chat: Manage Language Models** para selecionar o modelo e configurar a chave quando solicitada. Caso o seletor não seja atualizado, recarregue a janela. Use a ação **Update API Key** do grupo para guardar a chave no armazenamento do VS Code. O AgentModelKit preserva a referência existente ao adicionar modelos. Um valor literal em `apiKey` no arquivo não é usado pelo VS Code 1.148 para autenticar o endpoint. [Referência oficial do Custom Endpoint](https://code.visualstudio.com/docs/agent-customization/language-models#_add-a-custom-endpoint-model).

O arquivo adjacente `chatLanguageModels.json.agentmodelkit.json` registra quais modelos e endpoints foram gerados pelo AgentModelKit. Guarde-o junto com o arquivo de configuração. Ao restaurar manualmente um backup do VS Code, restaure também a versão correspondente do registro quando existir.

## Backups e simulação

Use `--dry-run` para pré-visualizar. Em cada alteração de um arquivo existente, o AgentModelKit preserva seu conteúdo anterior. O primeiro backup usa `<arquivo>.bak`. Os seguintes recebem um identificador no nome. Feche o cliente antes de restaurar um backup e use os caminhos exibidos na execução que deseja desfazer. Arquivos de configuração existentes devem conter JSON válido. Um arquivo inválido bloqueia a alteração dos clientes envolvidos.

[Índice da documentação](README.md)
