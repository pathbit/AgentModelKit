---
status: planejado
---

# AgentModelKit 0.0.2 validado para publicação

[English](RELEASE.en.md) · [Español](RELEASE.es.md) · [Roadmap](../../ROADMAP.md)

## Escopo da entrega

- Reaplicar a configuração do VS Code sem perder cabeçalhos personalizados ou referências a segredos do mesmo endpoint.
- Consultar a versão do pacote com `agentmodelkit --version` ou `amk -v`.
- Verificar a visibilidade pública da versão no npmjs e comparar os bytes servidos com o tarball aprovado pela CI.

## Verificações

| Aceite | Evidência esperada |
| --- | --- |
| AC-001 | Rotação de chave e preservação de cabeçalhos e referências no mesmo endereço. Cabeçalhos anteriores não seguem para outro endpoint. |
| AC-002 | O tarball executa por npm em pasta vazia, e ambos os aliases informam `0.0.2`. |
| AC-003 | A CI simula um atraso de propagação do npmjs e rejeita divergência de integridade, origem inválida e download alterado. |
| AC-004 | A publicação aprovada confirma a versão fixa, `@latest` e o tarball público. Registre a execução e o hash após publicar. |

O mantenedor aprovou a base de produto, experiência e design e autorizou a publicação em 25 de novembro de 2026.

A tag `v0.0.2` passou nos nove testes da matriz de sistemas e versões do Node.js. O CI gerou o tarball e o mantenedor aprovou a etapa protegida. O npmjs devolveu `ENEEDAUTH`. Após a tentativa, o marcador `latest` do npmjs ainda apontava para `0.0.1`, e a `0.0.2` ainda não constava no registro. O aceite AC-004 depende da confirmação do Trusted Publisher e da verificação dos artefatos nos três destinos. [Execução da release](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489).

[Spec aprovada](../../specs/release-0-0-2/SPEC.md) · [Procedimento de publicação](../../RELEASE.md)
