# Contribuição

[English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md)

O AgentModelKit é um projeto da PathBit. Mudanças entram na `main` depois de verificadas.

## Ambiente

Use [Node.js](https://nodejs.org/en/download) 18 ou posterior. O CLI usa módulos nativos do Node.js.

```bash
npm run check
npm test
npm run test:package
```

O teste de pacote executa os binários publicados de um tarball local, com cache e perfis temporários. Use `COPILOT_HOME`, `VSCODE_USER_DIR` e `AGENTMODELKIT_CATALOG_DIR` para isolar experiências dos seus perfis habituais.

Ao alterar um provider ou cliente, teste a configuração gerada, sua coexistência com entradas existentes e a falha de gravação ou de consulta à origem. Ao atualizar dados, regenere-os conforme [data/README.md](data/README.md) e confira os IDs em [data/curation.json](data/curation.json).

Use inglês para código-fonte, scripts, testes e mensagens do terminal. Atualize a documentação em português do Brasil, inglês e espanhol em conjunto. O Markdown sem sufixo é o padrão em português brasileiro. Mantenha as traduções na mesma pasta com `.en.md` e `.es.md` e aponte os links para o idioma correspondente.

O mantenedor autoriza a criação da tag e a publicação seguindo o [processo de release](docs/RELEASE.md).
