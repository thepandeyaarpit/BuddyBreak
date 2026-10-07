document.addEventListener('DOMContentLoaded', () => {
  // Load settings
  chrome.storage.local.get('settings', (data) => {
    if (data.settings) {
      const s = data.settings;
      
      document.getElementById('hyd-en').checked = s.hydration.enabled;
      document.getElementById('hyd-int').value = s.hydration.interval;
      
      document.getElementById('eye-en').checked = s.eyeRest.enabled;
      document.getElementById('eye-int').value = s.eyeRest.interval;
      
      document.getElementById('pos-en').checked = s.posture.enabled;
      document.getElementById('pos-int').value = s.posture.interval;
      
      document.getElementById('mov-en').checked = s.movement.enabled;
      document.getElementById('mov-int').value = s.movement.interval;
      
      document.getElementById('quiet-en').checked = s.quietHours.enabled;
      document.getElementById('quiet-start').value = s.quietHours.start;
      document.getElementById('quiet-end').value = s.quietHours.end;
      
      updateBusyUI(s.busyUntil);
    }
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    const newSettings = {
      hydration: {
        enabled: document.getElementById('hyd-en').checked,
        interval: parseInt(document.getElementById('hyd-int').value)
      },
      eyeRest: {
        enabled: document.getElementById('eye-en').checked,
        interval: parseInt(document.getElementById('eye-int').value)
      },
      posture: {
        enabled: document.getElementById('pos-en').checked,
        interval: parseInt(document.getElementById('pos-int').value)
      },
      movement: {
        enabled: document.getElementById('mov-en').checked,
        interval: parseInt(document.getElementById('mov-int').value)
      },
      quietHours: {
        enabled: document.getElementById('quiet-en').checked,
        start: document.getElementById('quiet-start').value,
        end: document.getElementById('quiet-end').value
      }
    };

    chrome.storage.local.get('settings', (data) => {
      newSettings.busyUntil = data.settings?.busyUntil || null;
      chrome.storage.local.set({ settings: newSettings }, () => {
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
        showToast();
      });
    });
  });

  document.getElementById('btn-busy-30').addEventListener('click', () => setBusy(30));
  document.getElementById('btn-busy-60').addEventListener('click', () => setBusy(60));
  document.getElementById('btn-busy-clear').addEventListener('click', () => setBusy(0));
});

function setBusy(minutes) {
  chrome.storage.local.get('settings', (data) => {
    const s = data.settings;
    if (minutes === 0) {
      s.busyUntil = null;
    } else {
      s.busyUntil = new Date().getTime() + minutes * 60000;
    }
    chrome.storage.local.set({ settings: s }, () => {
      updateBusyUI(s.busyUntil);
    });
  });
}

function updateBusyUI(busyUntil) {
  const statusEl = document.getElementById('busy-status');
  const clearBtn = document.getElementById('btn-busy-clear');
  
  if (busyUntil && busyUntil > new Date().getTime()) {
    const date = new Date(busyUntil);
    statusEl.innerText = `Paused until ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    clearBtn.style.display = 'inline-block';
  } else {
    statusEl.innerText = '';
    clearBtn.style.display = 'none';
  }
}

function showToast() {
  const toast = document.getElementById('toast');
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}
