// Аварийный сброс, если main.js не загрузился за 10 секунд
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.__GYMPLAN_LOADED) {
      console.warn('[GymPlan] Не загрузилось за 10с.');
      const app = document.getElementById('app');
      
      // Если сети нет, перезагрузка и сброс кэша только навредят
      if (!navigator.onLine) {
        if (app) app.innerHTML = '<div class="empty" style="color:#FF6B6B;">Нет соединения. Проверьте интернет.</div>';
        return;
      }

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (let reg of regs) reg.unregister();
        });
      }
      if ('caches' in window) {
        caches.keys().then(keys => {
          Promise.all(keys.map(k => caches.delete(k))).then(() => location.reload());
        });
      } else {
        location.reload();
      }
    }
  }, 10000);
});
