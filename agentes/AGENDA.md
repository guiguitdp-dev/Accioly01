# Tarefas agendadas dos agentes (prontas para ativar)

Cada bloco abaixo é o texto de uma tarefa agendada do Claude Code (nuvem ou computador).
Elas rodam sozinhas no horário e abrem um commit/branch com o resultado para você revisar.

> Dica de custo: comece só com **Curador (diário)** e **Marketing (segunda)**. Ative as outras quando as vendas começarem.

---

## 1. Curador de canais — todo dia 06:40
```
Use o agente curador-canais. Rode a verificação de canais. Se tudo estiver OK, apenas registre a data em agentes/ESTADO.md e termine. Se houver falhas, corrija seguindo as regras do agente (só fontes oficiais), rode a verificação de novo e faça commit com a mensagem "canais: correções automáticas".
```

## 2. Marketing semanal — segunda 07:10
```
Use o agente marketing-conteudo para criar o arquivo da semana em marketing/semanas/. Depois faça commit com a mensagem "marketing: conteúdo da semana".
```

## 3. Ciclo do gerente — segunda 07:50
```
Use o agente gerente-geral para o ciclo semanal: leia agentes/ESTADO.md, agentes/BACKLOG.md e o relatório mais recente; escolha no máximo 2 tarefas, delegue aos agentes certos e atualize agentes/ESTADO.md. Faça commit no final.
```

## 4. QA semanal — quarta 13:20
```
Use o agente qa-tv para rodar os testes do app. Corrija só problemas óbvios de até 5 linhas; registre o resto no BACKLOG. Faça commit se mudar algo.
```

## 5. Analista — sexta 16:30
```
Use o agente analista-crescimento com os relatórios em relatorios/. Atualize a seção "Números" de agentes/ESTADO.md e, se fizer sentido, adicione recomendações ao BACKLOG. Faça commit.
```

## 6. Desenvolvedor — quinta 14:10
```
Use o agente dev-jogos para implementar o item de maior prioridade do agentes/BACKLOG.md que estiver marcado [aprovado]. Rode npm run teste. Faça commit e descreva o que mudou em agentes/ESTADO.md.
```
