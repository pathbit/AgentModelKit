# Testes

`npm test` roda os testes unitários e de integração local com o executor nativo do Node.js. Os testes de disponibilidade usam servidores HTTP de fixture. Os testes de configuração criam perfis e chaves fictícios temporários.

`npm run test:package` valida o tarball e executa a CLI via npm exec offline. A matriz do GitHub Actions roda ambos em Windows, macOS e Linux.
