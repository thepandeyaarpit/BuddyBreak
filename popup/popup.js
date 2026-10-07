document.addEventListener('DOMContentLoaded', () => {
  // Update greeting
  const hour = new Date().getHours();
  let greeting = "Good evening! 🌙";
  if (hour < 12) greeting = "Good morning! ☀️";
  else if (hour < 18) greeting = "Good afternoon! 🌤️";
  document.getElementById('greeting').innerText = greeting;

  // Load stats
  chrome.storage.local.get('stats', (data) => {
    if (data.stats) {
      updateStatUI('water', data.stats.water);
      updateStatUI('eyeRest', data.stats.eyeRest);
      updateStatUI('posture', data.stats.posture);
      updateStatUI('movement', data.stats.movement);
      
      document.getElementById('streak-count').innerText = data.stats.streak || 0;
    }
  });

  // Buttons
  document.getElementById('btn-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  document.getElementById('btn-take-break').addEventListener('click', () => {
    const opts = document.getElementById('manual-break-options');
    opts.style.display = opts.style.display === 'none' ? 'block' : 'none';
  });

  document.querySelectorAll('.btn-break').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.getAttribute('data-type');
      chrome.runtime.sendMessage({ type: 'TRIGGER_MANUAL', reminderType: type });
      window.close();
    });
  });
});

function updateStatUI(key, statData) {
  const el = document.getElementById(`stat-${key}`);
  const progEl = document.getElementById(`prog-${key}`);
  if (el && statData) {
    el.innerText = `${statData.completed} / ${statData.total}`;
    const pct = statData.total > 0 ? (statData.completed / statData.total) * 100 : 0;
    progEl.style.width = `${pct}%`;
  }
}
