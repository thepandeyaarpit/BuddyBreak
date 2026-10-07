// Background script for managing alarms and state

const DEFAULT_SETTINGS = {
  hydration: { enabled: true, interval: 45 },
  eyeRest: { enabled: true, interval: 20 },
  posture: { enabled: true, interval: 30 },
  movement: { enabled: true, interval: 60 },
  quietHours: { enabled: false, start: "22:00", end: "08:00" },
  busyUntil: null,
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["settings", "stats"]);
  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
  if (!data.stats) {
    await chrome.storage.local.set({
      stats: {
        water: { completed: 0, total: 0 },
        eyeRest: { completed: 0, total: 0 },
        posture: { completed: 0, total: 0 },
        movement: { completed: 0, total: 0 },
        streak: 0,
        lastActiveDate: new Date().toISOString().split("T")[0],
      },
    });
  }
  setupAlarms();
});

async function setupAlarms() {
  await chrome.alarms.clearAll();
  const { settings } = await chrome.storage.local.get("settings");

  if (settings.hydration.enabled) {
    chrome.alarms.create("hydration", { periodInMinutes: settings.hydration.interval });
  }
  if (settings.eyeRest.enabled) {
    chrome.alarms.create("eyeRest", { periodInMinutes: settings.eyeRest.interval });
  }
  if (settings.posture.enabled) {
    chrome.alarms.create("posture", { periodInMinutes: settings.posture.interval });
  }
  if (settings.movement.enabled) {
    chrome.alarms.create("movement", { periodInMinutes: settings.movement.interval });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { settings } = await chrome.storage.local.get("settings");

  // Check if busy
  if (settings.busyUntil && new Date().getTime() < settings.busyUntil) {
    return;
  }

  // Check quiet hours
  if (settings.quietHours.enabled) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.quietHours.start.split(":").map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = settings.quietHours.end.split(":").map(Number);
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) return;
    } else {
      if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) return;
    }
  }

  // Trigger reminder in active tab
  triggerReminder(alarm.name);
});

async function triggerReminder(type) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

  const fallbackNotification = () => {
    chrome.notifications.create({
      type: "basic",
      // Using a valid 1x1 transparent pixel data URI so Chrome doesn't crash trying to load a missing image
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      title: "Health Buddy",
      message: `Time for a ${type} break! Check your posture or grab some water.`,
      priority: 2,
    });
  };

  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_REMINDER", reminderType: type }).catch(() => {
      // If content script isn't loaded (e.g., New Tab page, Chrome settings)
      fallbackNotification();
    });
  } else {
    fallbackNotification();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "UPDATE_STATS") {
    chrome.storage.local.get("stats", (data) => {
      const stats = data.stats;
      const today = new Date().toISOString().split("T")[0];

      if (stats.lastActiveDate !== today) {
        // New day logic could reset daily totals, but keep streak
        stats.lastActiveDate = today;
      }

      if (request.completed) {
        stats[request.reminderType].completed += 1;
      }
      stats[request.reminderType].total += 1;

      chrome.storage.local.set({ stats });
    });
  } else if (request.type === "SNOOZE") {
    chrome.alarms.create(request.reminderType, { delayInMinutes: request.minutes });
  } else if (request.type === "SETTINGS_UPDATED") {
    setupAlarms();
  } else if (request.type === "TRIGGER_MANUAL") {
    triggerReminder(request.reminderType);
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "take-a-break") {
    const types = ["hydration", "eyeRest", "posture", "movement"];
    const randomType = types[Math.floor(Math.random() * types.length)];
    triggerReminder(randomType);
  }
});
