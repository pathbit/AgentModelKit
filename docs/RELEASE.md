# Publicação

[English](RELEASE.en.md) · [Español](RELEASE.es.md)

O pacote deste projeto é `@pathbit/agentmodelkit`. Ele tem ciclo próprio de versões, com código na branch `main` e releases por tag. O fluxo valida o código, testa o tarball via npm exec e publica o mesmo arquivo no npmjs, GitHub Packages e GitHub Release.

## Executar o pacote publicado

O [pacote público no npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit) é o caminho principal. Use `@latest` para acompanhar a versão estável mais recente ou informe o número para executar sempre a mesma versão.

```bash
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
npx --yes https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz freellmapi
```

O comando com a URL do GitHub usa o tarball público anexado ao GitHub Release. Para usar `@latest` ou uma versão exata pelo GitHub Packages, defina `@pathbit:registry=https://npm.pkg.github.com` no ambiente npm em que vai executar o comando e configure a autenticação. [Como autenticar no GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

Para executar o código da `main` com Git, siga [Outras formas de executar](../README.md#outras-formas-de-executar).

## Antes de publicar

1. Mantenha as alterações de código na `main` e confirme a matriz de CI para o commit candidato.
2. Rode `npm run check`, `npm test` e `npm run test:package`. Teste a versão local com as versões dos clientes que pretende suportar.
3. Solicite aprovação explícita do mantenedor para criar e enviar a tag. A tag deve corresponder a `v` mais a versão de `package.json`. Publique apenas a versão que corresponde ao commit aprovado.
4. Configure o ambiente GitHub Actions `npmjs` para exigir aprovação do mantenedor. Na primeira publicação da `v0.0.1`, para criar o pacote npm, use um token granular e temporário com acesso de publicação ao escopo `@pathbit`, salvo em `NPMJS_BOOTSTRAP_TOKEN` nesse ambiente. Na `v0.0.1`, o workflow também aceita `NPMJS_TOKEN` do repositório quando ele tem permissão para criar o pacote. Para as próximas versões, confirme ou configure o Trusted Publisher no npm para o repositório `pathbit/AgentModelKit`, workflow `release.yml` e ambiente `npmjs`. Remova o segredo de bootstrap após verificar OIDC. [Configuração oficial de Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## Validação da tag e destinos

Publique as versões estáveis em ordem crescente. O npm atualiza `latest` por padrão em cada publicação estável. Depois de publicar uma nova versão estável, confirme que `npm view @pathbit/agentmodelkit@latest version` retorna o número publicado. Use `npm view @pathbit/agentmodelkit@0.0.1 dist.integrity`, com o número da release, para comparar a versão exata com a integridade do tarball validado. [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

O workflow [Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml) reexecuta a matriz de testes da tag, confirma que ela pertence ao histórico da branch padrão e carrega um único tarball validado como artefato. A publicação no npmjs usa o ambiente protegido. A publicação no GitHub usa `GITHUB_TOKEN` com `packages: write` e `contents: write`. O release anexa o tarball publicado.

Se uma publicação já tiver ocorrido, o workflow compara a integridade da versão existente com a do tarball. Se o arquivo for diferente, trate o conflito antes de seguir. Versões publicadas são imutáveis. Quando um job falhar depois de publicar em um destino, repita o job da mesma tag assim que corrigir a causa.
A última etapa consulta o npmjs sem credenciais e aguarda o tarball público. A release confirma o seletor estável e compara a integridade declarada e os bytes baixados com o artefato da CI. Se houver uma versão estável mais nova, uma repetição de uma release antiga só valida seu artefato e preserva a versão indicada por `latest`.

[Índice da documentação](README.md)
