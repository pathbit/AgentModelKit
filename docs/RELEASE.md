# Publicação

[English](RELEASE.en.md) · [Español](RELEASE.es.md)

O pacote deste projeto é `@pathbit/agentmodelkit`. Ele tem ciclo próprio de versões, com código na branch `main` e releases por tag. O fluxo valida o código, testa o tarball via npm exec e publica o mesmo arquivo no npmjs, GitHub Packages e GitHub Release.

## Executar o pacote publicado

O [pacote público no npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit) é o caminho principal. Use `@latest` para acompanhar a versão estável mais recente ou informe o número para executar sempre a mesma versão.

```bash
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.3 opencode vscode copilot
npx --yes --allow-remote=root https://github.com/pathbit/AgentModelKit/releases/download/v0.0.3/agentmodelkit-0.0.3.tgz freellmapi
```

No npm 11 ou anterior, retire `--allow-remote=root` do comando do tarball.

O comando com a URL do GitHub usa o tarball público anexado ao GitHub Release. Para usar `@latest` ou uma versão exata pelo GitHub Packages, defina `@pathbit:registry=https://npm.pkg.github.com` no ambiente npm em que vai executar o comando e configure a autenticação. [Como autenticar no GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

Para executar o código da `main` com Git, siga [Outras formas de executar](../README.md#outras-formas-de-executar).

## Antes de publicar

1. Mantenha as alterações de código na `main` e confirme a matriz de CI para o commit candidato.
2. Rode `npm run check`, `npm test` e `npm run test:package`. Teste a versão local com as versões dos clientes que pretende suportar.
3. Solicite aprovação explícita do mantenedor antes de integrar um aumento da versão em `package.json`. O CI precisa aprovar o commit exato da `main` antes de a automação criar a tag.
4. Configure o segredo `NPMJS_TOKEN` nos GitHub Actions do AgentModelKit com um token npm que tenha permissão para publicar `@pathbit/agentmodelkit`. O job de npmjs usa o ambiente protegido `npmjs`.

## Validação da tag e destinos

Publique as versões estáveis em ordem crescente. O npm atualiza `latest` por padrão em cada publicação estável. Depois de publicar uma nova versão estável, confirme que `npm view @pathbit/agentmodelkit@latest version` retorna o número publicado. Use `npm view @pathbit/agentmodelkit@0.0.3 dist.integrity`, com o número da release, para comparar a versão exata com a integridade do tarball validado. [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

Após um push aprovado na `main` que aumenta a versão, o workflow [Automatic release tag](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/auto-release.yml) cria a tag e dispara [Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml). O workflow confere o commit da tag e usa o tarball que o CI desse commit testou e armazenou. O GitHub Packages e o GitHub Release recebem o mesmo tarball com o `GITHUB_TOKEN`.

Para recuperar uma tag existente, execute o workflow `Release` na `main` com `tag`, `expected_commit` e `source_run_id`. Informe a tag, o SHA original e a execução que contém o artefato. O fluxo confere a origem e reaproveita o arquivo validado.

Se uma publicação já tiver ocorrido, o workflow compara a integridade da versão existente com a do tarball. Se o arquivo for diferente, trate o conflito antes de seguir. Versões publicadas são imutáveis. Quando um job falhar depois de publicar em um destino, repita o job da mesma tag assim que corrigir a causa.
Antes de publicar no GitHub, o workflow consulta o npmjs sem credenciais e aguarda o tarball público. A release confirma o seletor estável e compara a integridade declarada e os bytes baixados com o artefato da CI. Se houver uma versão estável mais nova, uma repetição de uma release antiga só valida seu artefato e preserva a versão indicada por `latest`.

[Índice da documentação](README.md)
