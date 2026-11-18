#!/usr/bin/env node
/*
 * Busca o relatório resumido do servidor (sem dados pessoais) e salva em
 * relatorios/AAAA-MM-DD.json. Os agentes de IA leem ESTE arquivo pequeno
 * em vez de vasculhar o banco inteiro — economiza muitos tokens.
 *
 *   SERVIDOR=https://seu-dominio ADMIN_EMAIL=... ADMIN_SENHA=... npm run relatorio
 */
const fs = require('fs');
const path = require('path');

const base = (process.env.SERVIDOR || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.ADMIN_EMAIL, senha = process.env.ADMIN_SENHA;
if (!email || !senha) { console.error('Defina ADMIN_EMAIL e ADMIN_SENHA (use um usuário "suporte" só para isso).'); process.exit(2); }

(async () => {
  const login = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }) }).then((r) => r.json());
  if (!login.token) throw new Error(login.error || 'login falhou');
  const rep = await fetch(base + '/api/admin/report', { headers: { Authorization: 'Bearer ' + login.token } }).then((r) => r.json());
  const dir = path.resolve(__dirname, '..', 'relatorios');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, new Date().toISOString().slice(0, 10) + '.json');
  fs.writeFileSync(file, JSON.stringify(rep, null, 2));
  console.log('Relatório salvo em ' + file);
  console.log(JSON.stringify(rep, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
