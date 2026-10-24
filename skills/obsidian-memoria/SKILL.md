---
name: obsidian-memoria
description: Memória de projetos no Obsidian com pouco gasto de token. Use ao começar a trabalhar num projeto (para lembrar o contexto), quando o usuário disser "salva no Obsidian", "anota isso", "o que a gente fez", ou ao terminar uma tarefa importante.
---

# Memória no Obsidian

Cofre: `{{VAULT}}`
Cada projeto tem `Projetos/<nome da pasta>/README.md` (resumo) e `Log AAAA-MM-DD.md`.
Os logs são escritos sozinhos por um hook a cada mensagem. **Não leia os logs**, a não ser que o usuário peça. Eles são longos e gastam token.

## Ao começar num projeto
Leia só `Projetos/<projeto>/README.md`. Ele é curto e é o seu contexto. Se não existir, siga sem ele.

## Ao salvar (pedido do usuário ou fim de tarefa importante)
Edite o `README.md` do projeto, mantendo-o com **no máximo 40 linhas**:
- **Status**: 1 a 3 linhas sobre onde o projeto está agora (substitua o texto antigo, não acumule).
- **Decisões**: um item por decisão, com o porquê em poucas palavras. Remova as que caíram.
- **Próximos passos**: lista curta e atual.
- Não mexa na seção **Logs** (o hook cuida dela).

Regras:
- Use Edit em trechos pequenos; não reescreva o arquivo inteiro.
- Nunca salve senhas, tokens, chaves ou dados de clientes.
- Depois de salvar, responda em uma linha: "Salvo no Obsidian: <projeto>".
