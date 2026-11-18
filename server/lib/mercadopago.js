/*
 * Integração com Mercado Pago (Checkout Pro): cartão, Pix e boleto com
 * confirmação AUTOMÁTICA. Só precisa do Access Token da sua conta
 * (Mercado Pago > Seu negócio > Configurações > Credenciais).
 */
const BASE = 'https://api.mercadopago.com';

async function mp(token, method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Mercado Pago: ' + (j.message || r.status));
  return j;
}

async function createPreference(token, { order, user, title, publicUrl }) {
  const body = {
    items: [{ title, quantity: 1, unit_price: Number(order.amount), currency_id: 'BRL' }],
    external_reference: order.id,
    payer: { email: user.email, name: user.name },
    statement_descriptor: 'ACCIOLYPLAY'
  };
  if (publicUrl && /^https:\/\//.test(publicUrl)) {
    body.notification_url = publicUrl + '/api/webhooks/mercadopago';
    body.back_urls = { success: publicUrl + '/tv/', pending: publicUrl + '/tv/', failure: publicUrl + '/tv/' };
    body.auto_return = 'approved';
  }
  const pref = await mp(token, 'POST', '/checkout/preferences', body);
  return { id: pref.id, initPoint: pref.init_point };
}

async function getPayment(token, paymentId) {
  return mp(token, 'GET', '/v1/payments/' + encodeURIComponent(paymentId));
}

async function findApprovedByReference(token, orderId) {
  const r = await mp(token, 'GET', '/v1/payments/search?external_reference=' + encodeURIComponent(orderId) + '&sort=date_created&criteria=desc');
  return (r.results || []).find((p) => p.status === 'approved') || null;
}

module.exports = { createPreference, getPayment, findApprovedByReference };
