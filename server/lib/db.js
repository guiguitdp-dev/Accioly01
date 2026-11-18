/*
 * Banco de dados em arquivo JSON (sem instalar nada).
 * - Grava de forma segura (arquivo temporário + rename).
 * - Faz backup diário automático (mantém os últimos 14).
 * Aguenta tranquilamente milhares de clientes. Para crescer além disso,
 * dá para trocar por Postgres/SQLite mantendo a mesma interface.
 */
const fs = require('fs');
const path = require('path');

function createDb(dataDir, seed) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'db.json');
  let data;
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    data = seed();
  }
  // Garante campos novos em bancos antigos
  const base = seed();
  for (const k of Object.keys(base)) if (data[k] === undefined) data[k] = base[k];
  for (const k of Object.keys(base.settings)) if (data.settings[k] === undefined) data.settings[k] = base.settings[k];

  let timer = null;
  function flush() {
    timer = null;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
    fs.renameSync(tmp, file);
    backup();
  }
  function save() { if (!timer) timer = setTimeout(flush, 150); }
  function saveNow() { if (timer) { clearTimeout(timer); } flush(); }

  function backup() {
    const day = new Date().toISOString().slice(0, 10);
    const dir = path.join(dataDir, 'backups');
    const target = path.join(dir, 'db-' + day + '.json');
    if (fs.existsSync(target)) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file, target);
    const all = fs.readdirSync(dir).filter((f) => f.startsWith('db-')).sort();
    while (all.length > 14) fs.unlinkSync(path.join(dir, all.shift()));
  }

  if (!fs.existsSync(file)) flush();
  return { data, save, saveNow, file };
}

module.exports = { createDb };
