/*
 * Configuração do app.
 *
 * serverUrl:
 *   ''  -> usa o mesmo endereço de onde o app foi aberto (quando o servidor
 *          do Accioly Play está servindo o app em /tv). É o padrão.
 *   'https://seu-dominio.com' -> app aberto de outro lugar (ex.: pendrive
 *          ou APK) fala com o servidor nesse endereço.
 *
 * localMode:
 *   'auto' -> se o app for aberto direto do pendrive (file://) e não houver
 *             serverUrl, entra no "Modo Dono": tudo liberado, sem login.
 *   true   -> sempre modo dono (uso pessoal).
 *   false  -> sempre exige conta (versão para clientes).
 *
 * demo (pendrive/APK "vitrine" para mostrar a outras pessoas):
 *   true -> acesso total por demoMinutes; depois os canais, notícias e jogos
 *           grátis continuam e o resto mostra o convite para assinar, com
 *           QR Code do WhatsApp (buyWhatsapp) e do site de vendas (buySite).
 *   Monte com: npm run pendrive  (vitrine é o padrão)  ·  npm run pendrive -- --dono
 *
 * donoHash: resumo do CÓDIGO DO DONO. Nas versões públicas (vitrine), o dono digita o
 *   código em Conta > "Sou o dono" e libera tudo no aparelho. Trocar: npm run codigo-dono
 */
window.APP_CONFIG = {
  name: 'Accioly Play',
  serverUrl: '',
  localMode: 'auto',
  demo: false,
  demoMinutes: 30,
  buyWhatsapp: '',
  buySite: '',
  donoHash: '0be93c481f0921fd4975327baac8c80a1bbed60fdc8339efa38d1032be9b68bc'
};
