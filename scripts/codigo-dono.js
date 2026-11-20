#!/usr/bin/env node
/*
 * Define o CÓDIGO DO DONO (libera tudo no seu aparelho nas versões públicas: APK, site, pendrive vitrine).
 *   node scripts/codigo-dono.js            -> gera um código novo e grava só o resumo em app/js/config.js
 *   node scripts/codigo-dono.js MEU-CODIGO -> usa o código escolhido (mínimo 10 letras/números)
 * Guarde o código: ele NÃO fica salvo em lugar nenhum do projeto.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Dono = require('../app/js/dono.js');

let code = process.argv[2];
if (!code) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I para não confundir na TV
  code = Array.from(crypto.randomBytes(12), (b) => A[b % A.length]).join('').replace(/(.{4})(?=.)/g, '$1-');
}
if (Dono.normalize(code).length < 10) { console.error('Use pelo menos 10 letras/números.'); process.exit(1); }
const file = path.join(__dirname, '..', 'app', 'js', 'config.js');
const src = fs.readFileSync(file, 'utf8');
if (!/donoHash: '[0-9a-f]*'/.test(src)) { console.error('Não achei "donoHash" em app/js/config.js'); process.exit(1); }
fs.writeFileSync(file, src.replace(/donoHash: '[0-9a-f]*'/, "donoHash: '" + Dono.hash(code) + "'"));
console.log('Código do dono: ' + code);
console.log('Guarde em lugar seguro. No app: Conta > "Sou o dono" > digite o código.');
