// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// ================= CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyDgkSLTnh9MdvN8ckvRkP53CRof00Fsgj4",
    authDomain: "zephyr-os-f1dc8.firebaseapp.com",
    projectId: "zephyr-os-f1dc8",
    appId: "1:337659777766:web:29153fd8b85728b9d52127"
};

// ================= INIT =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userId = null;

// ================= STATE =================
let state = {
    missions: [],
    completed: [],
    xp: 0,
    level: 1,
    shadow: 0,

    bossCooldown: 0,

    universe: {
        universe: {
            age: 0,
            potential: 100
        }
    },

    timeline: {
        engineerProbability: 0,
        scientistProbability: 0,
        entrepreneurProbability: 0
    },

    achievements: [
        {
            id: "boss_2",
            title: "Fight 2 Boss Battles",
            type: "boss",
            target: 2,
            progress: 0,
            reward: 200,
            claimed: false
        },
        {
            id: "mini_5",
            title: "Complete 5 Mini Tasks",
            type: "mini",
            target: 5,
            progress: 0,
            reward: 150,
            claimed: false
        },
        {
            id: "normal_10",
            title: "Complete 10 Normal Tasks",
            type: "normal",
            target: 10,
            progress: 0,
            reward: 100,
            claimed: false
        }
    ]
};

// ================= AUTH =================
async function initAuth() {
    const user = await signInAnonymously(auth);
    userId = user.user.uid;

    await loadFromCloud();
    await loadLeaderboard();
}
// ================= profile =================
function saveProfile() {
    const name = document.getElementById("profileInput").value.trim();
    if (!name) return;

    state.profileName = name;

    saveToCloud();
    render();
}
// ================= SAVE =================
async function saveToCloud() {
    if (!userId) return;

    await setDoc(doc(db, "players", userId), {
        profileName: state.profileName || "User",
        xp: state.xp || 0,
        level: state.level || 1,
        shadow: state.shadow || 0,
        updatedAt: Date.now()
    });
}

// ================= LOAD =================
async function loadFromCloud() {
    if (!userId) return;

    const snap = await getDoc(doc(db, "players", userId));

    if (snap.exists()) {
        const data = snap.data();

        state = {
            ...state,
            ...data,
            universe: {
                universe: {
                    age: data?.universe?.universe?.age ?? 0,
                    potential: data?.universe?.universe?.potential ?? 100
                }
            }
        };
    }

    render();
}

// ================= LEADERBOARD =================
async function loadLeaderboard() {
    const q = query(
        collection(db, "players"),
        orderBy("xp", "desc"),
        limit(50)
    );

    const snap = await getDocs(q);

    const board = document.getElementById("leaderboard");
    board.innerHTML = "";

    let rank = 1;

    snap.forEach(docSnap => {
        const data = docSnap.data();

        const li = document.createElement("li");

        li.innerHTML = `
      <b>#${rank}</b> 
      ${data.profileName || "Anonymous"} 
      | XP: ${data.xp || 0} 
      | Level: ${data.level || 1}
    `;

        board.appendChild(li);
        rank++;
    });
}

// ================= SAFE INIT =================
function safeInit() {
    state.universe.universe ||= { age: 0, potential: 100 };

    state.timeline.engineerProbability ||= 0;
    state.timeline.scientistProbability ||= 0;
    state.timeline.entrepreneurProbability ||= 0;
}

// ================= ADD MISSION =================
function addMission() {
    const name = document.getElementById("taskInput").value.trim();
    const xp = Number(document.getElementById("taskXP").value);

    if (!name || isNaN(xp)) return;

    state.missions.push({
        name,
        xp,
        type: xp >= 100 ? "boss" : xp >= 50 ? "mini" : "normal"
    });

    document.getElementById("taskInput").value = "";
    document.getElementById("saveProfileBtn").onclick = saveProfile;
    render();
    saveToCloud();
}

// ================= COMPLETE =================
function completeMission(i) {
    const m = state.missions[i];
    if (!m) return;

    state.missions.splice(i, 1);
    state.completed.push(m);

    state.xp += m.xp;

    while (state.xp >= state.level * 100) {
        state.xp -= state.level * 100;
        state.level++;
    }

    const u = state.universe.universe;
    u.age = (u.age || 0) + 1;
    u.potential = Math.max(0, (u.potential || 100) - m.xp * 0.01);

    state.timeline.engineerProbability += m.xp * 0.05;
    state.timeline.scientistProbability += m.xp * 0.02;
    state.timeline.entrepreneurProbability += m.xp * 0.01;

    state.shadow += m.xp > 50 ? 10 : 2;

    if (m.type === "boss") {
        state.bossCooldown = Date.now();
    }

    updateAchievements();
    render();
    saveToCloud();
}

// ================= ACHIEVEMENTS ENGINE =================
function updateAchievements() {
    let boss = 0;
    let mini = 0;
    let normal = 0;

    state.completed.forEach(m => {
        if (m.type === "boss") boss++;
        else if (m.type === "mini") mini++;
        else normal++;
    });

    state.achievements.forEach(a => {
        if (a.type === "boss") a.progress = boss;
        if (a.type === "mini") a.progress = mini;
        if (a.type === "normal") a.progress = normal;
    });
}

// ================= CLAIM =================
function claimAchievement(id) {
    const a = state.achievements.find(x => x.id === id);

    if (!a || a.claimed) return;

    if (a.progress >= a.target) {
        a.claimed = true;
        state.xp += a.reward;

        updateAchievements();
        render();
        saveToCloud();
    }
}

// ================= BOSS CHECK =================
function canStartBoss() {
    const cooldownOK = Date.now() - state.bossCooldown > 60 * 60 * 1000;
    const hasBoss = state.missions.some(m => m.type === "boss");
    return hasBoss && cooldownOK;
}

// ================= RENDER MISSIONS =================
function renderMissions() {
    const list = document.getElementById("activeTasks");
    list.innerHTML = "";

    state.missions.forEach((m, i) => {
        if (m.type === "boss") return;

        const li = document.createElement("li");

        const btn = document.createElement("button");
        btn.innerText = "Done";
        btn.onclick = () => completeMission(i);

        li.textContent = `${m.name} (+${m.xp}) [${m.type}] `;
        li.appendChild(btn);

        list.appendChild(li);
    });

}

// ================= BOSS =================
function renderBoss() {
    const list = document.getElementById("bossList");
    list.innerHTML = "";

    if (!canStartBoss()) {
        list.innerHTML = "<li>⏳ Boss ready soon</li>";
        return;
    }

    state.missions.forEach((m, i) => {
        if (m.type !== "boss") return;

        const li = document.createElement("li");

        const btn = document.createElement("button");
        btn.innerText = "Fight Boss";
        btn.onclick = () => completeMission(i);

        li.textContent = `🔥 ${m.name}`;
        li.appendChild(btn);

        list.appendChild(li);
    });
}

// ================= HISTORY =================
function renderCompleted() {
    const list = document.getElementById("completedTasks");
    list.innerHTML = "";

    state.completed.slice().reverse().forEach(m => {
        const li = document.createElement("li");
        li.textContent = `✔ ${m.name} (+${m.xp})`;
        list.appendChild(li);
    });
}

// ================= UNIVERSE =================
function renderUniverse() {
    const u = state.universe.universe;

    document.getElementById("universeAge").innerText = u.age || 0;

    document.getElementById("potential").innerText =
        (u.potential || 100).toFixed(1);

    // ✅ FIXED MISSING FIELDS
    document.getElementById("civilization").innerText =
        state.universe.technologyLevel || 1;

    document.getElementById("planets").innerText =
        state.universe.knownPlanets || 1;
}
// ================= TIMELINE =================
function renderTimeline() {
    document.getElementById("aiPath").innerText = Math.round(state.timeline.engineerProbability || 0);
    document.getElementById("isroPath").innerText = Math.round(state.timeline.scientistProbability || 0);
    document.getElementById("creatorPath").innerText = Math.round(state.timeline.entrepreneurProbability || 0);
    document.getElementById("entrePath").innerText = Math.round(state.timeline.entrepreneurProbability || 0);

    document.getElementById("dominantPath").innerText =
        state.timeline.engineerProbability >= state.timeline.scientistProbability
            ? "Engineer"
            : "Scientist";
}

// ================= DAILY =================
function updateDailyProgress() {
    const total = state.missions.length + state.completed.length;
    const done = state.completed.length;

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    document.getElementById("dailyBar").value = percent;
    document.getElementById("dailyText").innerText = percent + "%";
}

// ================= SHADOW =================
function renderShadow() {
    document.getElementById("shadow").innerText =
        state.shadow > 50 ? "Shadow rising" : "Stable";
}

// ================= COACH =================
function renderCoach() {
    document.getElementById("coach").innerText =
        "System stable. Execution flow active.";
}

// ================= ACHIEVEMENTS UI =================
function renderAchievements() {
    const box = document.getElementById("achievementList");
    box.innerHTML = "";

    state.achievements.forEach(a => {
        const done = a.progress >= a.target;

        const li = document.createElement("li");

        li.style.padding = "10px";
        li.style.margin = "8px 0";
        li.style.borderRadius = "10px";
        li.style.listStyle = "none";

        if (a.claimed) li.style.background = "#4d7699";
        else if (done) li.style.background = "#068bf0";
        else li.style.background = "#0d1720";

        li.innerHTML = `
      <b>${a.title}</b><br>
      ${a.progress}/${a.target}<br>
      +${a.reward} XP
      ${done && !a.claimed
                ? `<button onclick="claimAchievement('${a.id}')">CLAIM</button>`
                : ""
            }
    `;

        box.appendChild(li);
    });
}


// ================= MAIN =================
function render() {
    document.getElementById("xp").innerText = state.xp;
    document.getElementById("level").innerText = state.level;

    renderMissions();
    renderBoss();
    renderCompleted();
    renderUniverse();
    renderTimeline();
    renderShadow();
    renderCoach();
    renderAchievements();
    updateDailyProgress();
    loadLeaderboard();
}

// ================= START =================
document.getElementById("addTaskBtn").onclick = addMission;
initAuth();