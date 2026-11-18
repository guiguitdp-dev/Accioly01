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
 */
window.APP_CONFIG = {
  name: 'Accioly Play',
  serverUrl: '',
  localMode: 'auto'
};
