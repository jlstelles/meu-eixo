// Mantém a tela ligada enquanto o cronômetro está na tela (se o navegador suportar). Falhas são silenciosas.

let sentinel = null;

export async function keepAwake(on) {
  try {
    if (on) {
      if (sentinel || !('wakeLock' in navigator)) return;
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    } else if (sentinel) {
      const s = sentinel;
      sentinel = null;
      await s.release();
    }
  } catch {
    sentinel = null;
  }
}
