# Publicação

[English](RELEASE.en.md) · [Español](RELEASE.es.md)

O pacote deste projeto é `@pathbit/agentmodelkit`. Ele tem ciclo próprio de versões, com código na branch `main` e releases por tag. O fluxo valida o código, testa o tarball via npm exec e publica o mesmo arquivo no npmjs, GitHub Packages e GitHub Release.

## Executar o pacote publicado

Quando a versão estiver disponível, execute diretamente com npm/npx:

```bash
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
npx --yes https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz freellmapi
```

O segundo comando usa o tarball público anexado ao GitHub Release. Para acessar o registro GitHub Packages, configure a autenticação do npm para o escopo `@pathbit`. [Como autenticar no GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

## Antes da primeira publicação

1. Mantenha as alterações de código na `main` e confirme a matriz de CI para o commit candidato.
2. Rode `npm run check`, `npm test` e `npm run test:package`. Teste a versão local com as versões dos clientes que pretende suportar.
3. Solicite aprovação explícita do mantenedor para criar e enviar a tag. A tag deve corresponder a `v` mais a versão de `package.json`. A primeira será `v0.0.1`.
4. Configure o ambiente GitHub Actions `npmjs` para exigir aprovação do mantenedor. Para criar o pacote npm na primeira publicação, use um token granular e temporário com acesso de publicação ao escopo `@pathbit`, salvo em `NPMJS_BOOTSTRAP_TOKEN` nesse ambiente. Depois da primeira versão, configure o Trusted Publisher no npm para o repositório `pathbit/AgentModelKit`, workflow `release.yml` e ambiente `npmjs`. Remova o segredo de bootstrap após verificar OIDC. [Configuração oficial de Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## Validação da tag e destinos

O workflow [Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml) reexecuta a matriz de testes da tag, confirma que ela pertence ao histórico da branch padrão e carrega um único tarball validado como artefato. A publicação no npmjs usa o ambiente protegido. A publicação no GitHub usa `GITHUB_TOKEN` com `packages: write` e `contents: write`. O release anexa o tarball publicado.

Se uma publicação já tiver ocorrido, o workflow compara a integridade da versão existente com a do tarball. Se o arquivo for diferente, trate o conflito antes de seguir. Versões publicadas são imutáveis. Quando um job falhar depois de publicar em um destino, repita o job da mesma tag assim que corrigir a causa.

[Índice da documentação](README.md)
