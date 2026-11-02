const STORAGE_KEY = "cada-dia-habits-v1";

const initialHabits = [
  { id: "water", name: "Beber agua al despertar", icon: "◉", tone: "water", reminder: "Un vaso de agua para empezar" },
  { id: "move", name: "Mover mi cuerpo", icon: "⌁", tone: "move", reminder: "Aunque solo sean 10 minutos" },
  { id: "read", name: "Leer un poquito", icon: "▤", tone: "read", reminder: "Unas páginas también cuentan" },
  { id: "care", name: "Un momento para mí", icon: "♡", tone: "care", reminder: "Respira. Este momento es tuyo." },
];

const $ = (selector) => document.querySelector(selector);
const elements = {
  date: $("#topbar-date"),
  dailyLabel: $("#daily-label"),
  weekLabel: $("#week-label"),
  weekGrid: $("#week-grid"),
  habitList: $("#habit-list"),
  habitsTotal: $("#habits-total"),
  progressRing: $("#progress-ring"),
  progressPercent: $("#progress-percent"),
  progressCount: $("#progress-count"),
  progressMessage: $("#progress-message"),
  progressFooter: $("#progress-footer"),
  progressMeter: $("#progress-meter-fill"),
  streakTotal: $("#streak-total"),
  streakCaption: $("#streak-caption"),
  emptyState: $("#empty-state"),
  closingNote: $("#closing-note"),
  dialog: $("#habit-dialog"),
  form: $("#habit-form"),
  habitName: $("#habit-name"),
  formError: $("#form-error"),
};

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function shiftDate(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function makeDefaultState() {
  return { habits: initialHabits.map((habit) => ({ ...habit, completions: {} })) };
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return makeDefaultState();
    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.habits)) throw new Error("Formato de datos no válido.");
    const ids = new Set();
    const habits = parsed.habits.filter((habit) => {
      if (!habit || typeof habit.id !== "string" || typeof habit.name !== "string" || ids.has(habit.id)) return false;
      ids.add(habit.id);
      return true;
    }).map((habit) => ({
      id: habit.id,
      name: habit.name,
      icon: typeof habit.icon === "string" ? habit.icon : "✳",
      tone: typeof habit.tone === "string" ? habit.tone : "",
      reminder: typeof habit.reminder === "string" ? habit.reminder : "Un pequeño paso para ti",
      completions: habit.completions && typeof habit.completions === "object" && !Array.isArray(habit.completions) ? habit.completions : {},
    }));
    return { habits };
  } catch (error) {
    console.error("No se pudieron cargar tus hábitos guardados:", error);
    return makeDefaultState();
  }
}

let state = loadState();
let selectedDate = new Date();
selectedDate.setHours(12, 0, 0, 0);
let weekStart = startOfWeek(selectedDate);
let selectedIcon = "☀";

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("No se pudieron guardar tus cambios:", error);
    window.alert("No se pudieron guardar tus cambios en este navegador. Comprueba el espacio disponible y vuelve a intentarlo.");
    return false;
  }
  return true;
}

function isComplete(habit, date = selectedDate) {
  return habit.completions[localDateKey(date)] === true;
}

function habitStreak(habit) {
  let day = new Date();
  day.setHours(12, 0, 0, 0);
  if (!habit.completions[localDateKey(day)]) day = shiftDate(day, -1);
  let streak = 0;
  while (habit.completions[localDateKey(day)] === true) {
    streak += 1;
    day = shiftDate(day, -1);
  }
  return streak;
}

function totalStreak() {
  let day = new Date();
  day.setHours(12, 0, 0, 0);
  const doneOn = (date) => state.habits.length > 0 && state.habits.every((habit) => habit.completions[localDateKey(date)] === true);
  if (!doneOn(day)) day = shiftDate(day, -1);
  let streak = 0;
  while (doneOn(day)) {
    streak += 1;
    day = shiftDate(day, -1);
  }
  return streak;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function renderHeader() {
  const todayKey = localDateKey(new Date());
  const selectedKey = localDateKey(selectedDate);
  elements.date.textContent = formatLongDate(new Date()).replace(/^\p{L}/u, (letter) => letter.toUpperCase());
  elements.dailyLabel.textContent = formatLongDate(selectedDate).replace(/^\p{L}/u, (letter) => letter.toUpperCase());
  $("#habits-heading").firstChild.textContent = selectedKey === todayKey ? "Hábitos de hoy " : "Hábitos del día ";
  const weekEnd = shiftDate(weekStart, 6);
  const monthFormat = new Intl.DateTimeFormat("es-ES", { month: "short" });
  const firstMonth = monthFormat.format(weekStart).replace(".", "");
  const lastMonth = monthFormat.format(weekEnd).replace(".", "");
  elements.weekLabel.textContent = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${firstMonth}`
    : `${weekStart.getDate()} ${firstMonth} – ${weekEnd.getDate()} ${lastMonth}`;
}

function renderWeek() {
  const todayKey = localDateKey(new Date());
  elements.weekGrid.replaceChildren();
  for (let index = 0; index < 7; index += 1) {
    const day = shiftDate(weekStart, index);
    const key = localDateKey(day);
    const completed = state.habits.filter((habit) => habit.completions[key] === true).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-button";
    if (key === localDateKey(selectedDate)) button.classList.add("selected");
    if (key === todayKey) button.classList.add("today");
    if (state.habits.length > 0 && completed === state.habits.length) button.classList.add("complete");
    button.setAttribute("aria-label", `${formatLongDate(day)}${key === todayKey ? ", hoy" : ""}, ${completed} de ${state.habits.length} hábitos completados`);
    button.setAttribute("aria-pressed", String(key === localDateKey(selectedDate)));
    const name = document.createElement("span");
    name.className = "day-name";
    name.textContent = new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(day).replace(".", "");
    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = String(day.getDate());
    const dots = document.createElement("span");
    dots.className = "day-progress";
    dots.setAttribute("aria-hidden", "true");
    for (let dot = 0; dot < Math.max(state.habits.length, 1); dot += 1) {
      const marker = document.createElement("i");
      if (dot < completed) marker.classList.add("filled");
      dots.append(marker);
    }
    button.append(name, number, dots);
    button.addEventListener("click", () => {
      selectedDate = day;
      render();
    });
    elements.weekGrid.append(button);
  }
}

function renderHabits() {
  elements.habitList.replaceChildren();
  elements.habitsTotal.textContent = String(state.habits.length);
  elements.emptyState.hidden = state.habits.length !== 0;
  elements.closingNote.hidden = state.habits.length === 0;

  for (const habit of state.habits) {
    const completed = isComplete(habit);
    const item = document.createElement("article");
    item.className = `habit-item${completed ? " completed" : ""}`;
    const symbol = document.createElement("div");
    symbol.className = `habit-symbol${habit.tone ? ` tone-${habit.tone}` : ""}`;
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = habit.icon;
    const copy = document.createElement("div");
    copy.className = "habit-copy";
    const title = document.createElement("h3");
    title.textContent = habit.name;
    const reminder = document.createElement("p");
    reminder.textContent = habit.reminder;
    copy.append(title, reminder);
    const streak = document.createElement("span");
    streak.className = "habit-streak";
    const flame = document.createElement("span");
    flame.className = "mini-flame";
    flame.setAttribute("aria-hidden", "true");
    flame.textContent = "↗";
    const days = habitStreak(habit);
    streak.append(flame, document.createTextNode(`${days} ${days === 1 ? "día" : "días"}`));
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "check-button";
    toggle.setAttribute("aria-label", `${completed ? "Desmarcar" : "Marcar"} "${habit.name}" como ${completed ? "pendiente" : "completado"}`);
    toggle.setAttribute("aria-pressed", String(completed));
    toggle.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3.5 8.3 3 3 6-6.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    toggle.addEventListener("click", () => {
      const key = localDateKey(selectedDate);
      const wasComplete = isComplete(habit);
      if (wasComplete) delete habit.completions[key];
      else habit.completions[key] = true;
      if (saveState()) render();
      else if (wasComplete) habit.completions[key] = true;
      else delete habit.completions[key];
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-habit";
    remove.setAttribute("aria-label", `Eliminar el hábito "${habit.name}"`);
    remove.title = "Eliminar hábito";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      if (!window.confirm(`¿Quieres eliminar el hábito "${habit.name}" y su historial?`)) return;
      const previousHabits = state.habits;
      state.habits = state.habits.filter((entry) => entry.id !== habit.id);
      if (saveState()) render();
      else state.habits = previousHabits;
    });
    item.append(symbol, copy, streak, toggle, remove);
    elements.habitList.append(item);
  }
}

function renderProgress() {
  const total = state.habits.length;
  const completed = state.habits.filter((habit) => isComplete(habit)).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  elements.progressPercent.textContent = `${percentage}%`;
  elements.progressCount.innerHTML = `${completed} <span>/ ${total} ${total === 1 ? "hábito" : "hábitos"}</span>`;
  elements.progressRing.style.background = `conic-gradient(#66856c 0deg, #66856c ${percentage * 3.6}deg, #edf0e9 ${percentage * 3.6}deg, #edf0e9 360deg)`;
  elements.progressRing.setAttribute("aria-label", `${percentage} % de hábitos completados`);
  elements.progressMeter.style.width = `${percentage}%`;

  if (total > 0 && completed === total) {
    elements.progressMessage.textContent = "¡Lo has hecho! Qué bien te sienta cumplir.";
    elements.progressFooter.textContent = "Hoy has estado ahí para ti. Eso cuenta.";
  } else if (completed > 0) {
    elements.progressMessage.textContent = "¡Muy bien! Un paso más para ti.";
    elements.progressFooter.textContent = "Cada pequeño avance merece celebrarse.";
  } else if (total === 0) {
    elements.progressMessage.textContent = "Añade un hábito para dar tu primer paso.";
    elements.progressFooter.textContent = "Tu mejor versión se construye sin prisa.";
  } else {
    elements.progressMessage.textContent = "Cada pequeño comienzo cuenta.";
    elements.progressFooter.textContent = "Tu mejor versión se construye sin prisa.";
  }
}

function renderStreak() {
  const streak = totalStreak();
  elements.streakTotal.textContent = String(streak);
  $("#streak-unit").textContent = streak === 1 ? "día" : "días";
  elements.streakCaption.textContent = streak > 0
    ? streak === 1 ? "¡Un día cumplido! Mañana, otro paso." : "¡Un día más! Sigue a tu ritmo."
    : state.habits.length === 0 ? "Añade un hábito y empieza cuando quieras." : "Empieza hoy. Tu racha comienza aquí.";
}

function render() {
  renderHeader();
  renderWeek();
  renderHabits();
  renderProgress();
  renderStreak();
}

function openDialog() {
  elements.form.reset();
  selectedIcon = "☀";
  elements.formError.hidden = true;
  document.querySelectorAll(".icon-choice").forEach((choice) => choice.classList.toggle("selected", choice.dataset.icon === selectedIcon));
  elements.dialog.showModal();
  elements.habitName.focus();
}

function closeDialog() {
  elements.dialog.close();
}

$("#open-add-modal").addEventListener("click", openDialog);
$("#empty-add-button").addEventListener("click", openDialog);
$("#close-modal").addEventListener("click", closeDialog);
$("#cancel-modal").addEventListener("click", closeDialog);
$("#previous-week").addEventListener("click", () => {
  weekStart = shiftDate(weekStart, -7);
  selectedDate = shiftDate(selectedDate, -7);
  render();
});
$("#next-week").addEventListener("click", () => {
  weekStart = shiftDate(weekStart, 7);
  selectedDate = shiftDate(selectedDate, 7);
  render();
});
document.querySelectorAll(".icon-choice").forEach((choice) => choice.addEventListener("click", () => {
  selectedIcon = choice.dataset.icon;
  document.querySelectorAll(".icon-choice").forEach((option) => option.classList.toggle("selected", option === choice));
}));

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.habitName.value.trim();
  if (!name) {
    elements.formError.textContent = "Escribe un nombre para tu hábito.";
    elements.formError.hidden = false;
    elements.habitName.focus();
    return;
  }
  const habit = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    icon: selectedIcon,
    tone: "",
    reminder: "Un pequeño paso para ti",
    completions: {},
  };
  state.habits.push(habit);
  if (saveState()) {
    closeDialog();
    render();
  } else {
    state.habits.pop();
  }
});

elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeDialog();
});

render();
