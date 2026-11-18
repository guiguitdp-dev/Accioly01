/*
 * Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central)
 * com valor e identificador do pedido. Funciona com qualquer chave Pix
 * (CPF, CNPJ, e-mail, celular ou chave aleatória), sem precisar de banco/API.
 */
function field(id, value) {
  const v = String(value);
  return id + String(v.length).padStart(2, '0') + v;
}

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function clean(s, max) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 .\-]/g, '').trim().slice(0, max).toUpperCase();
}

// type: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' (definido no Painel do Dono)
function normalizeKey(key, type) {
  const k = String(key || '').trim();
  const digits = k.replace(/\D/g, '');
  if (type === 'email' || (!type && /^[^@\s]+@[^@\s]+$/.test(k))) return k.toLowerCase();
  if (type === 'aleatoria' || (!type && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(k))) return k.toLowerCase();
  if (type === 'telefone') return '+' + (digits.length <= 11 ? '55' + digits : digits);
  return digits; // CPF / CNPJ
}

function buildPix({ key, keyType, name, city, amount, txid, description }) {
  const gui = field('00', 'br.gov.bcb.pix') + field('01', normalizeKey(key, keyType)) + (description ? field('02', clean(description, 40)) : '');
  let payload =
    field('00', '01') +
    field('26', gui) +
    field('52', '0000') +
    field('53', '986') +
    (amount ? field('54', Number(amount).toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', clean(name, 25) || 'RECEBEDOR') +
    field('60', clean(city, 15) || 'BRASIL') +
    field('62', field('05', (String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25)) || '***'));
  payload += '6304';
  return payload + crc16(payload);
}

module.exports = { buildPix, crc16, normalizeKey };
