# Accioly01: kit para o Claude Code

Três coisas, para Windows:

1. **Memória no Obsidian em tempo real:** cada pedido seu e cada resposta do Claude vão para o Obsidian na hora, organizados por projeto. Isso **não gasta token**, porque quem escreve é um script, não o Claude.
2. **Menos token, mesmo resultado:** regras curtas no `CLAUDE.md` e uma memória resumida (o Claude lê um resumo de 40 linhas em vez da conversa toda).
3. **Controle ao vivo do seu PC:** você fala com o Claude pelo celular ou pelo navegador e ele executa no seu computador.

## Instalar (1 comando)

Abra o **PowerShell** (tecla Windows, digite `powershell`, Enter) e cole:

```powershell
irm https://raw.githubusercontent.com/guiguitdp-dev/Accioly01/claude/kit-obsidian/install.ps1 | iex
```

Aperte **Enter** para usar a pasta padrão (`Documentos\Obsidian Vault\Claude`). Depois feche e abra o Claude Code de novo.

O que é instalado em `C:\Users\<você>\.claude\`:

| Arquivo | Para que serve |
|---|---|
| `hooks\obsidian-log.ps1` | Grava a conversa no Obsidian em tempo real |
| `skills\obsidian-memoria\SKILL.md` | Ensina o Claude a ler e atualizar o resumo do projeto |
| `CLAUDE.md` | Regras de economia (seu texto antigo é mantido) |
| `settings.json` | Liga o hook (o arquivo antigo fica salvo como `settings.json.bak`) |

### Como fica no Obsidian

```
Claude/
├── Índice.md                  ← lista de todos os projetos
└── Projetos/
    └── MeuSite/
        ├── README.md          ← resumo: status, decisões, próximos passos
        └── Log 2026-10-24.md  ← tudo o que foi dito no dia, com horário
```

Para atualizar o resumo, diga ao Claude: **"salva no Obsidian"**.

## Gastar menos token: hábitos que mais ajudam

| Faça | Por quê |
|---|---|
| `/clear` ao trocar de assunto | A conversa inteira é reenviada a cada mensagem. Conversa longa custa caro. |
| `/compact` em conversas longas | Resume o histórico e mantém o essencial |
| Uma conversa por projeto | Assim o contexto não se mistura |
| "salva no Obsidian" antes do `/clear` | Na próxima conversa, o Claude lê só o resumo |
| `/model` → Sonnet ou Haiku para tarefas simples | Opus é para tarefas difíceis |
| Peça coisas específicas ("mude a cor do botão em index.html") | Assim ele não precisa procurar pelo projeto |
| Não cole arquivos enormes no chat | Diga o caminho do arquivo; ele lê só o trecho necessário |

## Conversar ao vivo e executar no seu PC

Isso já existe pronto, então não é preciso construir do zero:

| Quero... | Use |
|---|---|
| Falar pelo celular e o Claude executar no PC | **Remote Control**: rode `scripts\claude-remoto.ps1` no PC e abra a conversa no app Claude do celular (aba Code) |
| Que ele use o meu navegador (sites com login) | **Claude in Chrome**: extensão do Chrome. Você aprova site por site |
| Que ele clique em programas do PC | **Claude Desktop** com *computer use* ligado nas configurações |
| Falar por voz | Botão de microfone no app Claude |

Atalho do Remote Control: baixe [`scripts/claude-remoto.ps1`](scripts/claude-remoto.ps1), clique com o botão direito e escolha **Executar com PowerShell**. Deixe a janela aberta enquanto usa. Tudo o que for feito nessa conversa também vai para o Obsidian.

**Segurança:** só funciona na sua conta. O Claude pede permissão antes de ações arriscadas. Feche a janela para desligar.
