let container = null;
let currentReminderType = null;

function getAssetUrl(path) {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
    try {
      return chrome.runtime.getURL(path);
    } catch (e) {}
  }
  return path;
}

const MESSAGES = {
  hydration: [
    "Hey! Time to drink some water! 💧",
    "Your body is asking for some H₂O!",
    "Hydration check! Have you had water recently?",
  ],
  eyeRest: [
    "20 seconds away from the screen, please! 👀",
    "Look at something far away and relax.",
    "Your eyes deserve a little break!",
  ],
  posture: [
    "Shoulders back! Check your posture. 🧍",
    "Straighten your back & relax your shoulders.",
    "Posture check! Are you sitting comfortably?",
  ],
  movement: [
    "You've been sitting for a while. Take a quick walk! 🚶",
    "Time to stretch your legs and move around!",
    "Stand up and do a quick stretch!",
  ],
};

function initHealthBuddy() {
  if (document.getElementById("health-buddy-container")) return;

  container = document.createElement("div");
  container.id = "health-buddy-container";

  container.innerHTML = `
    <div id="health-buddy-character">
      <video id="health-buddy-video" src="${getAssetUrl("gemini_generated_video_9695d240.mp4")}" muted playsinline></video>
      <div id="health-buddy-text-area">
        <div id="health-buddy-title">Health Buddy</div>
        <div id="health-buddy-message">Message here</div>

        <div id="health-buddy-actions">
          <div class="health-buddy-btn-group">
            <button id="hb-btn-done" class="health-buddy-btn health-buddy-btn-primary">✓ Done</button>
            <button id="hb-btn-not-yet" class="health-buddy-btn health-buddy-btn-secondary">❌ Not Yet</button>
          </div>
          <button id="hb-btn-snooze-main" class="health-buddy-btn health-buddy-btn-snooze">😴 Snooze</button>
        </div>

        <div id="health-buddy-snooze-options">
          <button class="health-buddy-btn health-buddy-btn-snooze" data-min="5">5 min</button>
          <button class="health-buddy-btn health-buddy-btn-snooze" data-min="10">10 min</button>
          <button class="health-buddy-btn health-buddy-btn-snooze" data-min="20">20 min</button>
          <button class="health-buddy-btn health-buddy-btn-snooze" data-min="30">30 min</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  document.getElementById("hb-btn-done").addEventListener("click", handleDone);
  document.getElementById("hb-btn-not-yet").addEventListener("click", handleNotYet);
  document.getElementById("hb-btn-snooze-main").addEventListener("click", toggleSnooze);

  const snoozeBtns = document.querySelectorAll("#health-buddy-snooze-options button");
  snoozeBtns.forEach((btn) => {
    btn.addEventListener("click", () => handleSnooze(parseInt(btn.getAttribute("data-min"))));
  });
}

function showReminder(type) {
  initHealthBuddy();
  currentReminderType = type;

  const msgArray = MESSAGES[type] || ["Time for a break!"];
  const msg = msgArray[Math.floor(Math.random() * msgArray.length)];

  document.getElementById("health-buddy-message").innerText = msg;
  document.getElementById("health-buddy-character").className = "";
  document.getElementById("health-buddy-text-area").classList.remove("show-text");

  document.getElementById("health-buddy-actions").style.display = "block";
  document.getElementById("health-buddy-snooze-options").classList.remove("show");

  const video = document.getElementById("health-buddy-video");
  video.currentTime = 0;
  video.play();

  // Pause video after 3 seconds
  const pauseHandler = () => {
    if (video.currentTime >= 3.0) {
      video.pause();
      video.removeEventListener("timeupdate", pauseHandler);
    }
  };
  video.addEventListener("timeupdate", pauseHandler);

  // Show it (slides in)
  setTimeout(() => {
    container.classList.add("show");

    // Pop the text in after 3 seconds when the video finishes
    setTimeout(() => {
      document.getElementById("health-buddy-text-area").classList.add("show-text");
    }, 3000);
  }, 100);
}

function handleDone() {
  document.getElementById("health-buddy-character").className = "happy";
  document.getElementById("health-buddy-title").innerText = "GREAT JOB!";
  document.getElementById("health-buddy-message").innerText = "Awesome! Keep it up! 🎉";
  document.getElementById("health-buddy-actions").style.display = "none";

  chrome.runtime.sendMessage({ type: "UPDATE_STATS", reminderType: currentReminderType, completed: true });

  setTimeout(hideBuddy, 2500);
}

function handleNotYet() {
  document.getElementById("health-buddy-character").className = "sad";
  document.getElementById("health-buddy-title").innerText = "AWW...";
  document.getElementById("health-buddy-message").innerText = "Okay 😢 Try not to forget next time!";
  document.getElementById("health-buddy-actions").style.display = "none";

  chrome.runtime.sendMessage({ type: "UPDATE_STATS", reminderType: currentReminderType, completed: false });

  setTimeout(hideBuddy, 2500);
}

function toggleSnooze() {
  document.getElementById("health-buddy-actions").style.display = "none";
  document.getElementById("health-buddy-snooze-options").classList.add("show");
  document.getElementById("health-buddy-message").innerText = "Remind you in...";
}

function handleSnooze(minutes) {
  document.getElementById("health-buddy-snooze-options").classList.remove("show");
  document.getElementById("health-buddy-title").innerText = "SNOOZED";
  document.getElementById("health-buddy-message").innerText = "Okay, I’ll remind you later! ⏱️";

  chrome.runtime.sendMessage({ type: "SNOOZE", reminderType: currentReminderType, minutes });

  setTimeout(hideBuddy, 2000);
}

function hideBuddy() {
  // 1. Remove text so the board is blank again
  document.getElementById("health-buddy-text-area").classList.remove("show-text");

  // 2. Wait a split second for text to vanish, then run video in reverse
  setTimeout(() => {
    const video = document.getElementById("health-buddy-video");
    const step = 0.05; // 50ms of video time

    const reverseInterval = setInterval(() => {
      if (video.currentTime <= 0.1) {
        clearInterval(reverseInterval);
        video.pause();

        // 3. Once video is at start, slide the whole container off screen
        container.classList.remove("show");
        setTimeout(() => {
          document.getElementById("health-buddy-title").innerText = "Health Buddy";
        }, 600);
      } else {
        video.currentTime = Math.max(0, video.currentTime - step);
      }
    }, 50); // 20 fps backwards scrub
  }, 300); // Delay slightly so text finishes shrinking
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SHOW_REMINDER") {
    showReminder(request.reminderType);
  }
});
