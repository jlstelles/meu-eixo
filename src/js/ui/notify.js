// Avisos do sistema (Notification API). Dependem de permissão, do navegador e da economia de bateria do Android;
// por isso o app nunca trata isto como alarme garantido.

export function notificationSupport() {
  if (typeof Notification === 'undefined') return { supported: false, permission: 'unsupported' };
  return { supported: true, permission: Notification.permission };
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Mostra um aviso do sistema se permitido. Retorna true se tentou exibir. */
export async function showSystemNotification({ title, body, tag }) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    const opts = { body, icon: 'icons/icon-192.png', tag };
    if (reg && reg.showNotification) await reg.showNotification(title, opts);
    else new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
