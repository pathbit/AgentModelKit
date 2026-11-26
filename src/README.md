# Código

[English](README.en.md) · [Español](README.es.md)

O código usa módulos ES nativos do Node.js. Veja a [arquitetura](../docs/ARCHITECTURE.md) e a [referência de providers](../docs/PROVIDERS.md).

O [ponto de entrada](agentmodelkit.mjs) expõe os comandos `agentmodelkit` e `amk` no pacote. As opções e a execução ficam em [cli.mjs](cli.mjs). Para desenvolvimento, use `npm run cli -- --help` para consultar as opções e `npm run cli -- --version` para ver a versão declarada no pacote. Veja os [exemplos de uso pelo pacote](../README.md).
