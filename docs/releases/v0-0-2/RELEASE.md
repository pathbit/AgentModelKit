---
status: planejado
---

# AgentModelKit 0.0.2 em preparação

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

A especificação formal depende da aprovação da base de produto, experiência e design. A criação da tag e a publicação têm autorização própria. [Procedimento de publicação](../../RELEASE.md)
