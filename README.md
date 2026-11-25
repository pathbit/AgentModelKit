# AgentModelKit

[English](README.en.md) · [Español](README.es.md) · [Documentação](docs/README.md) · [Exemplos](examples/README.md)

O AgentModelKit configura providers e modelos de IA no **OpenCode**, no **VS Code** e no **GitHub Copilot CLI**. O CLI roda no Windows, macOS e Linux, aceita parâmetros para automação e oferece um seletor no terminal. O projeto é mantido pela PathBit junto com o [AgentDevKit](https://github.com/pathbit/AgentDevKit).

A ajuda e as mensagens da CLI são exibidas em inglês.

## Pré-requisito obrigatório

**Instale somente o [Node.js](https://nodejs.org/pt/download)** para executar o AgentModelKit. A versão mínima é a 18. Use uma versão LTS atual sempre que possível. A distribuição do Node.js já inclui `npm` e `npx`. Confira com `node -v` e `npx --version`.

Para **usar** os modelos, você também precisa ter o cliente escolhido disponível. O FreeLLMAPI precisa estar rodando se for seu provider. Uma conta ou chave pode ser exigida pelo provider. A CLI gera a configuração mesmo que o cliente ainda esteja ausente.

## Início rápido

Abra o terminal na pasta do projeto com Node.js e npm. Use a prévia pública do GitHub enquanto a primeira versão aguarda publicação:

```bash
# Abre a lista de clientes do OpenCode.
npx --yes "https://codeload.github.com/pathbit/AgentModelKit/tar.gz/refs/heads/main" opencode

# Aplica os endpoints do OpenCode ao VS Code e ao Copilot CLI juntos.
npx --yes "https://codeload.github.com/pathbit/AgentModelKit/tar.gz/refs/heads/main" opencode vscode copilot

# Aplica o FreeLLMAPI local ao VS Code e ao OpenCode do projeto.
npx --yes "https://codeload.github.com/pathbit/AgentModelKit/tar.gz/refs/heads/main" freellmapi vscode opencode --url http://127.0.0.1:3001/v1
```

No menu, use **↑↓** para navegar, **Espaço** para marcar cada cliente e **Enter** para aplicar à seleção. Pressione **A** para marcar todos ou limpar a seleção. O assistente pede o plano ou a conexão e o token quando necessário.

Depois da primeira publicação, use `npx --yes @pathbit/agentmodelkit` como prefixo dos comandos. Para configurar o OpenCode em outra pasta, acrescente `--project-dir <pasta>`.

| Quero… | Opção rápida |
| --- | --- |
| Escolher os agentes do projeto | Marque vários no menu, passe `vscode copilot` após o provider ou use `--targets all`. |
| Acrescentar um modelo ou provider | Use `add --providers <id> --models <ids>` ou `add --provider-file ./meu-provider.json`. |
| Carregar modelos recomendados | Acrescente `--powerful`. |
| Atualizar o catálogo | Use `catalog update`. |
| Conferir e remover modelos ausentes | Execute `prune --providers <id>` e acrescente `--apply` para aplicar. |
| Ver os arquivos e clientes detectados | Execute `doctor`. |

## Uso direto e automação

O `npx` baixa o pacote no cache do npm e executa a CLI. O comando configura os arquivos dos clientes e não instala editores, extensões, providers, runtimes ou modelos. Uma operação `--dry-run` não grava configuração, credenciais nem backups.

Os exemplos abaixo usam o nome do pacote no npmjs após a primeira publicação. Para executá-los agora, substitua `@pathbit/agentmodelkit` pela URL do GitHub mostrada no início rápido.

```bash
# Configura o OpenCode no VS Code e no Copilot CLI.
npx --yes @pathbit/agentmodelkit opencode vscode copilot

# Configura FreeLLMAPI local no VS Code (o assistente pede a chave unificada).
npx --yes @pathbit/agentmodelkit freellmapi vscode --connection local --url http://127.0.0.1:3001/v1

# Simula a configuração do FreeLLMAPI local nos três clientes.
npx --yes @pathbit/agentmodelkit freellmapi --targets all --url http://127.0.0.1:3001/v1 --dry-run

# Acrescenta os modelos da curadoria do Go e Console e simula a configuração.
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers all --powerful --dry-run
```

O `--yes` **após o nome do pacote** desativa as perguntas do AgentModelKit. O `--yes` antes do nome responde à confirmação do npm para uso do cache.

Para configurar o OpenCode em outra pasta, use `--project-dir <pasta>`. Sem `--targets`, a CLI também usa o OpenCode como destino padrão em modo não interativo. Use `--targets all` para incluir os três clientes.

## Acrescentar, substituir e remover modelos

- `add` e `init` acrescentam modelos e atualizam as entradas selecionadas. Outros modelos e providers continuam disponíveis.
- `--replace` substitui a seleção gerenciada dos providers indicados, depois de criar backups. Veja o efeito primeiro com `--dry-run`.
- `--models` aceita IDs separados por vírgula. Use `<grupo>/<modelo>` para distinguir o mesmo ID em Go e PAYG.
- `--default-model` define o modelo padrão do Copilot CLI explicitamente. Passe o ID do modelo ou a seleção qualificada exibida pelo comando.
- `prune` consulta a lista completa da origem e mostra quais modelos gerenciados deixaram de constar ali. Adicione `--apply` para remover. Um modelo ainda anunciado pelo FreeLLMAPI, mesmo sem chave ou com quota temporariamente esgotada, permanece configurado.

```bash
npx --yes @pathbit/agentmodelkit prune --providers opencode
npx --yes @pathbit/agentmodelkit prune --providers opencode --apply
npx --yes @pathbit/agentmodelkit prune --url 'https://llm.example.com/v1/t/EXAMPLE_TOKEN'
```

Cada gravação que substitui um arquivo existente preserva os bytes anteriores em um backup `.bak` exclusivo. O comando informa os caminhos dos backups. Se um JSON de configuração estiver inválido, a operação é interrompida antes de escrever qualquer cliente.

## Providers e catálogos

| Provider | Opções |
| --- | --- |
| OpenCode | `--tiers go` para assinatura e `--tiers payg` para Console. `all` inclui ambos. O OpenCode Free é restrito ao próprio OpenCode. As entradas Free aparecem em `catalog list` para consulta. |
| FreeLLMAPI | No modo local, informe a URL e a chave unificada. Uma URL de agente já inclui a credencial. O roteador padrão é `auto`. Veja [conexão remota e modos avançados](docs/PROVIDERS.md#freellmapi). |
| Provider manual | Passe um [manifesto JSON](examples/provider.local.example.json) com `--provider-file`. Pode repetir a opção para incluir mais de um provider. |

`--powerful` carrega a seleção editorial em [data/curation.json](data/curation.json). No FreeLLMAPI ela inclui estratégias do roteador. Em um provider manual, declare os modelos recomendados em `powerfulIds`. A curadoria usa dados versionados e pode ser revisada mensalmente. O AgentModelKit não chama um modelo de IA para fazer essa seleção.

```bash
# Lista os catálogos em uso.
npx --yes @pathbit/agentmodelkit catalog list

# Busca o catálogo oficial do OpenCode e a distribuição assinada do FreeLLMAPI.
npx --yes @pathbit/agentmodelkit catalog update

# Atualiza somente uma fonte sem gravar.
npx --yes @pathbit/agentmodelkit catalog update --source opencode --dry-run

# Carrega modelos de um endpoint que você já tem, usando um manifesto local.
npx --yes @pathbit/agentmodelkit add --provider-file ./meu-provider.json --dry-run
```

Os catálogos acompanham o pacote em `data/`. `catalog update` atualiza um cache separado dos arquivos do pacote. Para consultar o OpenCode ao vivo durante a configuração, use `--live`. A consulta ao vivo do FreeLLMAPI para configuração usa o servidor indicado, enquanto o catálogo público é uma referência das opções do produto. [Detalhes das origens, do cache e da rotina mensal](data/README.md).

## Credenciais e clientes

- **OpenCode 2** lê modelos em `.opencode/opencode.json`. A chave fica como referência a uma variável de ambiente do provider ou ao caminho informado com `--key-file`. Use `--no-save-key` para manter só o arquivo que você informou.
- Para o **Copilot CLI**, o formato de providers nomeados utiliza `apiKey` no próprio `providers.json`. Use `--key-file`, a variável `OPENCODE_API_KEY` ou `FREELLMAPI_API_KEY`, ou o prompt protegido do terminal. `--no-save-key` evita uma segunda cópia em `.key`. Em sistemas POSIX, os arquivos gerenciados e backups usam permissões restritas.
- No **VS Code**, os comandos guiados configuram a autenticação nos cabeçalhos do perfil de usuário. Mantenha o perfil e os backups privados. Para usar o armazenamento de segredos do editor, veja [Clientes](docs/CLIENTS.md#vs-code).
- `doctor` lista versões, caminhos e presença de arquivos de chave sem imprimir os valores. Para caminhos personalizados, backups e restauração, veja [Clientes](docs/CLIENTS.md).

## Desenvolvimento e publicação

```bash
npm run check
npm test
npm run test:package
npm run catalog:update -- --dry-run
```

A `main` recebe as mudanças revisadas. A tag de release exige a aprovação do mantenedor após os testes. O [processo de publicação](docs/RELEASE.md) valida a tag, testa o pacote e usa o mesmo tarball no npmjs, no GitHub Packages e no GitHub Release.

---

## AgentDevKit

A [pasta compartilhada](.pbai4devs/README.md) reúne os recursos do kit. Os
[apontamentos do Codex](.codex/) e o arquivo [AGENTS.md](AGENTS.md) acompanham o clone.

Para executar a CLI do kit, instale [Node.js 24+ com npm e npx](https://nodejs.org/pt/download).
Na raiz do projeto, execute para gerar a seleção e os índices locais.

```console
npx @pathbit/agentdevkit@0.0.39 init
```

Na primeira execução, a CLI acrescenta um bloco de referência gerenciado ao `AGENTS.md`.
No menu, use as setas e **Espaço** para selecionar agentes. Use **Enter** para confirmar.
O guia também cobre atualização e diagnóstico. [Início rápido do AgentDevKit](https://github.com/pathbit/AgentDevKit#começo-rápido)

---

## Contributing and Branch Protection

- Envie o pull request do seu fork para `main` e confira os testes da CI antes de pedir revisão.
- Consulte o [guia de contribuição](CONTRIBUTING.md). Para bugs ou pedidos de suporte a novos providers, abra uma [issue](https://github.com/pathbit/AgentModelKit/issues).

---

## 📄 License

O projeto usa a Licença MIT. Leia o texto completo em [LICENSE](LICENSE).

A licença permite usar, modificar e distribuir o software, inclusive para fins comerciais, desde que os avisos de direitos autorais e da licença acompanhem as cópias. O software é fornecido sem garantia.

---

Developed with ❤️ by [Pathbit](https://www.pathbit.com.br/)
