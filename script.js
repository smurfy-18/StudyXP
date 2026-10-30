// ======================================
// STUDYXP - APPLICATION LOGIC
// ======================================

// 1. DATA STORAGE

const STORAGE_KEY = "studyxp_data";

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if (saved && typeof saved.xp === "number" && Array.isArray(saved.sessions)) {
            return {
                name: saved.name || "Player One",
                avatar: saved.avatar || "🎮",
                xp: Math.max(0, saved.xp),
                sessions: saved.sessions
            };
        }
    } catch (error) {
        console.warn("Could not load saved progress:", error);
    }

    return {
        name: "Player One",
        avatar: "🎮",
        xp: 0,
        sessions: []
    };
}

let data = loadData();

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}


// 2. LEVEL SYSTEM

function getLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

function getRank(level) {
    if (level >= 20) return "Legend";
    if (level >= 15) return "Master";
    if (level >= 10) return "Expert";
    if (level >= 5) return "Advanced";
    if (level >= 3) return "Intermediate";

    return "Beginner";
}

function showFloatingXP(amount, eventTarget) {
    const xpBadge = document.getElementById("topXP");
    const rect = xpBadge ? xpBadge.getBoundingClientRect() : { x: window.innerWidth - 100, y: 50 };

    const floatEl = document.createElement("div");
    floatEl.className = "floating-xp";
    floatEl.textContent = `+${amount} XP ⚡`;
    
    // Position near the top bar XP indicator
    floatEl.style.left = (rect.left + window.scrollX) + "px";
    floatEl.style.top = (rect.top + window.scrollY - 10) + "px";

    document.body.appendChild(floatEl);

    setTimeout(() => {
        floatEl.remove();
    }, 800);
}

function updateXP(amount) {
    const oldLevel = getLevel(data.xp);

    data.xp += amount;

    const newLevel = getLevel(data.xp);

    saveData();
    showFloatingXP(amount);

    if (newLevel > oldLevel) {
        showToast("🏆 LEVEL UP! You reached Level " + newLevel);
        
        // Add a pulse highlight effect to the player card on level up
        const playerCard = document.querySelector(".player-card");
        if (playerCard) {
            playerCard.classList.add("pulse-highlight");
            setTimeout(() => playerCard.classList.remove("pulse-highlight"), 1200);
        }
    } else {
        showToast("⚡ +" + amount + " XP earned!");
    }

    updateDashboard();
}


// 3. TIMER VARIABLES

const durations = {
    focus: 25,
    short: 5,
    long: 15
};

let currentMode = "focus";
let remainingSeconds = durations.focus * 60;
let endTime = null;
let timerInterval = null;
let isRunning = false;


// 4. TIMER ELEMENTS

const timerDisplay = document.getElementById("timerDisplay");
const timerStatus = document.getElementById("timerStatus");
const timerCircle = document.getElementById("timerCircle");
const startBtn = document.getElementById("startBtn");


// 5. TIMER DISPLAY

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return String(minutes).padStart(2, "0") +
        ":" + String(secs).padStart(2, "0");
}

function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(remainingSeconds);

    const total = durations[currentMode] * 60;
    const progress = total > 0
        ? (total - remainingSeconds) / total
        : 0;

    const degrees = progress * 360;

    timerCircle.style.background =
        `conic-gradient(var(--blue) ${degrees}deg, #333 ${degrees}deg)`;

    timerStatus.textContent = isRunning ? "FOCUSING" : "READY";

    document.title = formatTime(remainingSeconds) + " | StudyXP";
}


// 6. STOP TIMER

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isRunning = false;
    endTime = null;
    startBtn.textContent = "▶ Start";
}


// 7. CHANGE TIMER MODE

function changeMode(mode) {
    stopTimer();

    currentMode = mode;
    remainingSeconds = durations[mode] * 60;

    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.toggle(
            "active",
            btn.dataset.mode === mode
        );
    });

    document.getElementById("timerSubtitle").textContent =
        mode === "focus" ? "FOCUS SESSION" :
        mode === "short" ? "SHORT BREAK" : "LONG BREAK";

    document.getElementById("timerHint").textContent =
        mode === "focus"
            ? "Stay focused. Your next level awaits."
            : "Relax and recharge before your next session.";

    updateTimerDisplay();
}


// 8. COMPLETE SESSION

function completeSession() {
    stopTimer();

    remainingSeconds = 0;
    updateTimerDisplay();

    if (currentMode === "focus") {
        const subject = document.getElementById("subjectSelect").value;
        const minutes = durations.focus;
        const reward = minutes * 2;

        const session = {
            subject: subject,
            minutes: minutes,
            xp: reward,
            date: new Date().toISOString()
        };

        data.sessions.unshift(session);
        updateXP(reward);

    } else {
        showToast("☕ Break completed! Ready for another session?");
    }

    startBtn.textContent = "▶ Start";
    timerStatus.textContent = "COMPLETE";

    document.getElementById("timerHint").textContent =
        "Session completed! Great work.";

    // Play a simple completion notification
    try {
        if ("Notification" in window &&
            Notification.permission === "granted") {
            new Notification("StudyXP", {
                body: "Your " + currentMode + " session is complete!"
            });
        }
    } catch (error) {
        console.log("Notification unavailable.");
    }
}


// 9. START / PAUSE TIMER

function startTimer() {
    if (isRunning) {
        stopTimer();
        updateTimerDisplay();
        return;
    }

    if (remainingSeconds <= 0) {
        remainingSeconds = durations[currentMode] * 60;
    }

    isRunning = true;
    endTime = Date.now() + remainingSeconds * 1000;

    startBtn.textContent = "Ⅱ Pause";

    if ("Notification" in window &&
        Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
    }

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        remainingSeconds = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            completeSession();
        }
    }, 200);
}


// 10. RESET TIMER

function resetTimer() {
    stopTimer();
    remainingSeconds = durations[currentMode] * 60;

    updateTimerDisplay();

    document.getElementById("timerHint").textContent =
        "Timer reset. Ready when you are.";
}


// 11. SAVE TIMER SETTINGS

document.getElementById("saveSettings").addEventListener("click", () => {
    const focus = Number(document.getElementById("focusDuration").value);
    const short = Number(document.getElementById("shortDuration").value);
    const long = Number(document.getElementById("longDuration").value);

    if (![focus, short, long].every(
        value => Number.isInteger(value) && value >= 1
    ) || focus > 180 || short > 60 || long > 60) {
        showToast("Please enter valid timer durations.");
        return;
    }

    durations.focus = focus;
    durations.short = short;
    durations.long = long;

    changeMode(currentMode);

    document.querySelector(".xp-preview strong").textContent =
        "+" + focus * 2 + " XP";

    document.querySelector(".xp-preview small").textContent =
        "For completing a " + focus + "-minute focus session.";

    showToast("Timer settings saved!");
});


// 12. TIMER EVENT LISTENERS

startBtn.addEventListener("click", startTimer);

document.getElementById("resetBtn").addEventListener(
    "click", resetTimer
);

document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        changeMode(btn.dataset.mode);
    });
});


// 13. PAGE NAVIGATION

function showPage(pageName) {
    stopTimer();

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageName);

    if (!selectedPage) return;

    selectedPage.classList.add("active");

    const navButton = document.querySelector(
        `.nav-btn[data-page="${pageName}"]`
    );

    if (navButton) {
        navButton.classList.add("active");
    }

    const titles = {
        dashboard: "Dashboard",
        timer: "Focus Timer",
        statistics: "Statistics"
    };

    document.getElementById("pageTitle").textContent =
        titles[pageName];

    if (pageName === "timer") {
        updateTimerDisplay();
    }
}

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        showPage(btn.dataset.page);
    });
});

document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
        showPage(btn.dataset.goto);
    });
});


// 14. TIME CALCULATIONS

function getTotalMinutes() {
    return data.sessions.reduce(
        (total, session) => total + session.minutes,
        0
    );
}

function getTodayMinutes() {
    const today = new Date().toDateString();

    return data.sessions
        .filter(session =>
            new Date(session.date).toDateString() === today
        )
        .reduce((total, session) => total + session.minutes, 0);
}

function formatStudyTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return hours + "h " + mins + "m";
}


// 15. SESSION HISTORY

function renderSessions(elementId, limit = Infinity) {
    const container = document.getElementById(elementId);

    const sessions = data.sessions.slice(0, limit);

    if (sessions.length === 0) {
        container.innerHTML =
            '<p class="empty-state">No completed sessions yet. Start studying!</p>';
        return;
    }

    container.innerHTML = sessions.map(session => {
        const date = new Date(session.date);

        return `
            <div class="session-item">
                <div>
                    <div class="session-subject">
                        📚 ${escapeHTML(session.subject)}
                    </div>
                    <div class="session-date">
                        ${date.toLocaleDateString()} ·
                        ${date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                        · ${session.minutes} minutes
                    </div>
                </div>
                <div class="session-reward">
                    +${session.xp} XP
                </div>
            </div>
        `;
    }).join("");
}


// 16. SAFE TEXT DISPLAY

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


// 17. UPDATE DASHBOARD

function updateDashboard() {
    const level = getLevel(data.xp);
    const rank = getRank(level);

    const currentLevelXP = data.xp % 100;
    const nextLevelXP = 100 - currentLevelXP;

    const totalMinutes = getTotalMinutes();
    const todayMinutes = getTodayMinutes();

    // Player details
    document.getElementById("playerName").textContent = data.name;
    document.getElementById("playerRank").textContent = rank;
    document.getElementById("sidebarAvatar").textContent = data.avatar;
    document.getElementById("topXP").textContent = data.xp + " XP";

    // Dashboard cards
    document.getElementById("dashboardXP").textContent = data.xp;
    document.getElementById("dashboardLevel").textContent = level;
    document.getElementById("dashboardRank").textContent = rank + " rank";

    document.getElementById("dashboardTime").textContent =
        formatStudyTime(totalMinutes);

    document.getElementById("dashboardSessions").textContent =
        data.sessions.length;

    // Level progress
    document.getElementById("levelLabel").textContent =
        "LEVEL " + level;

    document.getElementById("levelXP").textContent =
        currentLevelXP + " / 100 XP";

    document.getElementById("nextLevelXP").textContent =
        nextLevelXP + " XP to next level";

    document.getElementById("levelProgress").style.width =
        currentLevelXP + "%";

    // Daily goal
    document.getElementById("goalTime").textContent =
        todayMinutes + " / 60";

    document.getElementById("goalProgress").style.width =
        Math.min(todayMinutes / 60 * 100, 100) + "%";

    document.getElementById("goalMessage").textContent =
        todayMinutes >= 60
            ? "🏆 Daily goal completed!"
            : (60 - todayMinutes) + " minutes left to reach your goal.";

    // Statistics
    document.getElementById("statsXP").textContent = data.xp;

    document.getElementById("statsTime").textContent =
        formatStudyTime(totalMinutes);

    document.getElementById("statsSessions").textContent =
        data.sessions.length;

    document.getElementById("statsLevel").textContent = level;

    // History
    renderSessions("recentSessions", 5);
    renderSessions("allSessions");
}


// 18. NOTIFICATION TOAST

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


// 19. PROFILE / LOGIN SYSTEM

const loginModal = document.getElementById("loginModal");
const playerProfileCard = document.getElementById("playerProfileCard");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const nameInput = document.getElementById("nameInput");
const avatarButtons = document.querySelectorAll(".avatar-option");

let selectedAvatar = data.avatar || "🎮";

// Avatar selection UI logic
avatarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        avatarButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedAvatar = btn.textContent;
    });
});

// Open modal on clicking player card
playerProfileCard.addEventListener("click", () => {
    nameInput.value = data.name;
    selectedAvatar = data.avatar;
    
    avatarButtons.forEach(btn => {
        btn.classList.toggle("active", btn.textContent === selectedAvatar);
    });

    loginModal.classList.add("show");
});

// Save profile changes
saveProfileBtn.addEventListener("click", () => {
    const enteredName = nameInput.value.trim();
    if (!enteredName) {
        showToast("Please enter a valid player name.");
        return;
    }

    data.name = enteredName;
    data.avatar = selectedAvatar;
    saveData();
    updateDashboard();

    loginModal.classList.remove("show");
    showToast("Profile updated successfully!");
});

// Prompt profile setup on first visit
if (!localStorage.getItem(STORAGE_KEY)) {
    loginModal.classList.add("show");
}


// 20. INITIALIZE APP

changeMode("focus");
updateDashboard();
showPage("dashboard");

console.log("StudyXP is ready!");