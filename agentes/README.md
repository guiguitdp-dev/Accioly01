# Equipe de agentes do Accioly Play

Cada agente tem **uma área**, **um modelo de IA adequado ao custo** e **arquivos de entrada pequenos**.
As definições ficam em `.claude/agents/` e o Claude Code as reconhece automaticamente.

## Organograma

```
                    DONO (você) — aprova preço, pagamentos e mudanças grandes
                               │
                        gerente-geral (sonnet)
         ┌─────────────┬───────┴────────┬───────────────┬──────────────────┐
  curador-canais    qa-tv         dev-jogos     marketing-conteudo   vendas-suporte
     (haiku)       (haiku)        (sonnet)           (sonnet)            (haiku)
                                                         │
                                               analista-crescimento (sonnet)
```

## O que trabalha 24 horas SEM gastar nenhum token

| Automação | Onde roda | Frequência |
|---|---|---|
| Verificação de todos os canais + descoberta dos IDs do YouTube | Servidor (`server/lib/health.js`) | A cada 6h |
| Confirmação automática de pagamento (Mercado Pago) | Servidor (webhook + consulta) | Na hora |
| Lista "Ações do dia" com mensagens de WhatsApp prontas (teste acabando, recuperação, renovação, pedir indicação, Pix a confirmar) | Painel do Dono | Tempo real |
| Backup diário do banco (guarda 14 dias) | Servidor | Diário |
| Bônus de indicação (+7 dias) | Servidor | Na hora da compra |
| Verificação de canais no GitHub | GitHub Actions (`canais.yml`) | A cada 6h |
| Teste automático com navegador | GitHub Actions (`testes.yml`) | A cada mudança |

Isso cobre o trabalho repetitivo. Os agentes de IA entram só onde precisa de inteligência — e por isso o custo é baixo.

## Agenda recomendada dos agentes de IA

| Agente | Quando | Custo relativo |
|---|---|---|
| curador-canais | Diariamente (só age se houver falha) | $ |
| qa-tv | Após cada mudança + 1x/semana | $ |
| marketing-conteudo | Toda segunda-feira | $$ |
| gerente-geral | Toda segunda-feira (depois do marketing) | $$ |
| analista-crescimento | Toda sexta-feira | $$ |
| dev-jogos | 1x/semana (1 item do backlog) | $$$ |
| vendas-suporte | Sob demanda | $ |

Os textos prontos para criar essas tarefas agendadas estão em [`AGENDA.md`](AGENDA.md).

## Como os agentes economizam tokens

1. **Código faz o trabalho pesado**: verificação de canais, cobrança e lista de ações são scripts — a IA só lê o resultado.
2. **Relatórios pequenos**: `npm run relatorio` gera um JSON de ~1 KB sem dados pessoais. A IA lê isso, não o banco.
3. **Memória compartilhada curta**: `agentes/ESTADO.md` (máx. ~40 linhas) e `agentes/BACKLOG.md`. Cada agente lê, faz uma coisa e atualiza.
4. **Modelo certo para cada tarefa**: tarefas mecânicas usam o modelo mais barato (haiku).
5. **Escopo travado**: cada agente só mexe nos arquivos da sua área.

## Como usar agora (no seu computador)

Com o Claude Code aberto na pasta do projeto:

```
> use o agente curador-canais para verificar os canais
> use o agente marketing-conteudo para criar o conteúdo desta semana
> use o agente gerente-geral para fazer o ciclo semanal
```
