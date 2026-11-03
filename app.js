const STORAGE_KEY = "cada-dia-habits-v1";

const initialHabits = [
  { id: "water", name: "Beber agua al despertar", icon: "◉", tone: "water", color: "blue", category: "Bienestar", reminder: "Un vaso de agua para empezar" },
  { id: "move", name: "Mover mi cuerpo", icon: "⌁", tone: "move", color: "gold", category: "Fitness", reminder: "Aunque solo sean 10 minutos" },
  { id: "read", name: "Leer un poquito", icon: "▤", tone: "read", color: "gray", category: "Estudio", reminder: "Unas páginas también cuentan" },
  { id: "care", name: "Un momento para mí", icon: "♡", tone: "care", color: "purple", category: "Bienestar", reminder: "Respira. Este momento es tuyo." },
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
  return HabitsCore.normalize({ habits: initialHabits.map((habit) => ({ ...habit, completions: {} })) });
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) { storageBlocked = false; return makeDefaultState(); }
    storageBlocked = false;
    return HabitsCore.normalize(JSON.parse(stored));
  } catch (error) {
    console.error("No se pudieron cargar tus hábitos guardados:", error);
    storageBlocked = true;
    document.querySelector('#storage-status').textContent = 'No se han podido leer tus datos. Descarga una copia antes de restaurarlos o reemplazarlos mediante Importar.';
    return {habits: []};
  }
}

let storageBlocked = false;
let editingId = null;
let state = loadState();
let selectedDate = new Date();
selectedDate.setHours(12, 0, 0, 0);
let weekStart = startOfWeek(selectedDate);
let selectedIcon = "☀";
let historyView = 'cards';
let historyDate = parseDateKey(localDateKey(new Date()));
let activeCategory = null;

function saveState() {
  if (storageBlocked) { window.alert('Exporta los datos dañados e importa una copia válida para continuar.'); return false; }
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

function habitStreak(habit) { return HabitsCore.streak([habit]); }
function totalStreak() { return HabitsCore.streak(state.habits); }
function dueOn(date) { return state.habits.filter(habit => HabitsCore.scheduled(habit, date)); }

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
    const completed = dueOn(day).filter((habit) => habit.completions[key] === true).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-button";
    if (key === localDateKey(selectedDate)) button.classList.add("selected");
    if (key === todayKey) button.classList.add("today");
    if (dueOn(day).length > 0 && completed === dueOn(day).length) button.classList.add("complete");
    button.setAttribute("aria-label", `${formatLongDate(day)}${key === todayKey ? ", hoy" : ""}, ${completed} de ${dueOn(day).length} hábitos completados`);
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
    for (let dot = 0; dot < Math.max(dueOn(day).length, 1); dot += 1) {
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
  elements.habitsTotal.textContent = String(dueOn(selectedDate).length);
  elements.emptyState.hidden = dueOn(selectedDate).length !== 0;
  elements.closingNote.hidden = dueOn(selectedDate).length === 0;

  for (const habit of dueOn(selectedDate)) {
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
    toggle.disabled = localDateKey(selectedDate) > localDateKey(new Date());
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
    remove.title = 'Archivar desde mañana conservando su historial';
    remove.textContent = 'Archivar';
    remove.setAttribute('aria-label', `Archivar ${habit.name}`);
    remove.addEventListener('click', () => {
      if (!window.confirm(`¿Archivar "${habit.name}" a partir de mañana? Su historial se conservará.`)) return;
      const previous = habit.archivedOn;
      habit.archivedOn = localDateKey(shiftDate(new Date(), 1));
      if (saveState()) render(); else habit.archivedOn = previous;
    });
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'button button-secondary'; edit.textContent = 'Editar';
    edit.setAttribute('aria-label', `Editar ${habit.name}`);
    edit.addEventListener('click', () => openDialog(habit));
    item.append(symbol, copy, streak, toggle, edit, remove);
    elements.habitList.append(item);
  }
}

function renderProgress() {
  const total = dueOn(selectedDate).length;
  const completed = dueOn(selectedDate).filter((habit) => isComplete(habit)).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  elements.progressPercent.textContent = `${percentage}%`;
  elements.progressCount.innerHTML = `${completed} <span>/ ${total} ${total === 1 ? "hábito" : "hábitos"}</span>`;
  elements.progressRing.style.background = `conic-gradient(var(--accent) 0deg, var(--accent) ${percentage * 3.6}deg, var(--progress-track) ${percentage * 3.6}deg, var(--progress-track) 360deg)`;
  elements.progressRing.setAttribute("aria-label", `${percentage} % de hábitos completados`);
  elements.progressMeter.style.width = `${percentage}%`;

  const isToday = localDateKey(selectedDate) === localDateKey(new Date());
  document.querySelector('.today-badge').textContent = isToday ? 'HOY' : formatLongDate(selectedDate);
  document.querySelector('.progress-card .card-kicker').textContent = isToday ? 'TU RITMO DE HOY' : 'TU RITMO DEL DÍA';
  document.querySelector('.overview-grid').setAttribute('aria-label', `Resumen: ${formatLongDate(selectedDate)}`);
  if (total > 0 && completed === total) {
    elements.progressMessage.textContent = "¡Lo has hecho! Qué bien te sienta cumplir.";
    elements.progressFooter.textContent = "Has estado ahí para ti. Eso cuenta.";
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
    : dueOn(selectedDate).length === 0 ? "Añade un hábito y empieza cuando quieras." : "Empieza hoy. Tu racha comienza aquí.";
}

function renderArchived() {
  const list = document.querySelector('#archived-list');
  list.replaceChildren();
  for (const habit of state.habits.filter(h => h.archivedOn)) {
    const row = document.createElement('p');
    row.textContent = `${habit.name} — archivado el ${habit.archivedOn}. `;
    if (habit.archivedOn > localDateKey(new Date())) {
      const undo = document.createElement('button');
      undo.type = 'button'; undo.className = 'button button-secondary'; undo.textContent = 'Deshacer archivado';
      undo.addEventListener('click', () => {
        const previous = habit.archivedOn; habit.archivedOn = null;
        if (saveState()) render(); else habit.archivedOn = previous;
      });
      row.append(undo);
    }
    list.append(row);
  }
  if (!list.childElementCount) list.textContent = 'No hay hábitos archivados.';
}

function render() {
  renderHeader();
  renderWeek();
  renderHabits();
  renderProgress();
  renderStreak();
  renderArchived();
  renderHistory();
}

function openDialog(habit = null) {
  editingId = habit?.id || null;
  elements.form.reset();
  selectedIcon = habit?.icon || "☀";
  elements.habitName.value = habit?.name || "";
  $('#habit-description').value = habit?.reminder || '';
  renderCategorySelect();
  $('#habit-category').value = habit?.category || '';
  $('#habit-color').value = habit?.color || 'purple';
  document.querySelector("#modal-title").textContent = habit ? "Editar hábito" : "Añade un hábito";
  document.querySelectorAll("[name=weekday]").forEach(input => { input.checked = habit ? HabitsCore.daysFor(habit, shiftDate(new Date(), 1)).includes(Number(input.value)) : true; input.disabled = false; });
  elements.formError.hidden = true;
  document.querySelectorAll(".icon-choice").forEach((choice) => (choice.classList.toggle("selected", choice.dataset.icon === selectedIcon), choice.setAttribute("aria-pressed", String(choice.dataset.icon === selectedIcon))));
  elements.dialog.showModal();
  elements.habitName.focus();
}

function closeDialog() {
  elements.dialog.close();
}

$("#open-add-modal").addEventListener("click", () => openDialog());
$("#empty-add-button").addEventListener("click", () => openDialog());
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
  document.querySelectorAll(".icon-choice").forEach((option) => (option.classList.toggle("selected", option === choice), option.setAttribute("aria-pressed", String(option === choice))));
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
  const days = [...document.querySelectorAll('[name=weekday]:checked')].map(input => Number(input.value));
  if (!days.length) { elements.formError.textContent = 'Elige al menos un día.'; elements.formError.hidden = false; return; }
  const category = $('#habit-category').value.trim();
  const color = $('#habit-color').value;
  const reminder = $('#habit-description').value.trim() || 'Un pequeño paso para ti';
  if (editingId) {
    const habit = state.habits.find(h => h.id === editingId);
    const previous = {...habit};
    const effectiveDate = localDateKey(shiftDate(new Date(), 1));
    const previousDays = HabitsCore.daysFor(habit, parseDateKey(effectiveDate));
    if (days.length !== previousDays.length || days.some(day => !previousDays.includes(day))) Object.assign(habit, HabitsCore.withSchedule(habit, days, effectiveDate));
    Object.assign(habit, {name, icon:selectedIcon, category, color, reminder});
    if (saveState()) { closeDialog(); render(); } else Object.assign(habit, previous);
    return;
  }
  const habit = {
    createdOn: localDateKey(new Date()), archivedOn: null, days,
    scheduleHistory: [{from:localDateKey(new Date()), days:[...days]}],
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    icon: selectedIcon,
    tone: "", category, color, reminder,
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

document.querySelector('#today-button').addEventListener('click', () => {
  selectedDate = parseDateKey(localDateKey(new Date())); weekStart = startOfWeek(selectedDate); render();
});
document.querySelector('#export-button').addEventListener('click', () => {
  try {
    const content = storageBlocked ? localStorage.getItem(STORAGE_KEY) : JSON.stringify(state, null, 2);
    const url = URL.createObjectURL(new Blob([content || ''], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = `cada-dia-${localDateKey(new Date())}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { window.alert('No se puede acceder a los datos del navegador.'); }
});
document.querySelector('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('La copia supera 5 MB.');
    const imported = HabitsCore.normalize(JSON.parse(await file.text()));
    if (!window.confirm('La importación reemplazará tus hábitos. Exporta primero si quieres conservarlos. ¿Continuar?')) return;
    // La escritura ocurre antes de sustituir el estado visible; un fallo conserva los datos anteriores.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    state = imported; storageBlocked = false; document.querySelector('#storage-status').textContent = 'Copia importada.'; render();
  } catch (error) { window.alert(`No se pudo importar: ${error.message}`); }
  finally { event.target.value = ''; }
});
let renderedToday = localDateKey(new Date());
setInterval(() => {
  const today = localDateKey(new Date());
  if (today !== renderedToday) { renderedToday = today; render(); }
}, 30000);
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY) { state = loadState(); render(); }
});

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function historyHabits() {
  const search = $('#habit-search').value.trim().toLocaleLowerCase('es');
  return state.habits.filter(habit =>
    (activeCategory === null || habit.category === activeCategory) &&
    ($('#show-archived').checked || !habit.archivedOn || habit.archivedOn > localDateKey(new Date())) &&
    (!search || habit.name.toLocaleLowerCase('es').includes(search)));
}

function renderCategories() {
  const categories = (state.categories || []).map(category => category.name);
  if (activeCategory !== null && activeCategory !== '' && !categories.includes(activeCategory)) activeCategory = null;
  const container = $('#category-filters');
  container.replaceChildren();
  for (const category of [null, ...categories, '']) {
    const button = node('button', 'category-chip', category === null ? '☷  Todos' : category ? `${categoryIcon(category)} ${category}` : 'Sin categoría');
    button.type = 'button'; button.setAttribute('aria-label', category === null ? '☷  Todos' : category || 'Sin categoría'); button.setAttribute('aria-pressed', String(category === activeCategory));
    button.addEventListener('click', () => { activeCategory = category; renderHistory(); });
    container.append(button);
  }

}

function historyCell(habit, date, compact = false) {
  const key = localDateKey(date);
  const scheduled = HabitsCore.scheduled(habit, date);
  const complete = habit.completions[key] === true;
  const future = key > localDateKey(new Date());
  const button = node('button', `history-cell${complete ? ' done' : ''}${!scheduled ? ' off' : ''}${compact ? ' compact' : ''}${key === localDateKey(new Date()) ? ' is-today' : ''}`, scheduled || complete ? '' : '·');
  button.type = 'button';
  const status = complete ? 'completado' : !scheduled ? 'sin programar' : future ? 'fecha futura' : 'pendiente';
  const label = `${habit.name}, ${formatLongDate(date)} de ${date.getFullYear()}, ${status}`;
  button.setAttribute('aria-label', label); button.title = label;
  button.setAttribute('aria-pressed', String(complete));
  // Las fechas fuera del calendario del hábito y las futuras son solo informativas.
  button.disabled = future || !scheduled;
  button.dataset.date = key;
  button.addEventListener('click', () => {
    if (complete) delete habit.completions[key]; else habit.completions[key] = true;
    if (saveState()) render();
    else if (complete) habit.completions[key] = true; else delete habit.completions[key];
    const cells = [...document.querySelectorAll('.history-cell')];
    cells.find(cell => cell.dataset.date === key && cell.closest('[data-habit]')?.dataset.habit === habit.id)?.focus();
  });
  return button;
}

function habitHistoryHeading(habit) {
  const header = node('div', 'history-card-header');
  const icon = node('span', 'history-symbol', habit.icon);
  icon.setAttribute('aria-hidden','true');
  const copy = node('div', 'history-copy');
  copy.append(node('h2', '', habit.name), node('p', '', habit.reminder));
  const edit = node('button', 'round-button small edit-history', '⋯');
  edit.type = 'button'; edit.setAttribute('aria-label', `Configurar ${habit.name}`);
  edit.addEventListener('click', () => openDialog(habit));
  header.append(icon, copy, edit);
  return header;
}

function renderHistory() {
  renderCategories();
  $('#history-month').value = localDateKey(historyDate).slice(0,7);
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === historyView)));
  const habits = historyHabits();
  const content = $('#history-content'); content.replaceChildren(); content.className = `history-${historyView}`;
  $('#history-empty').hidden = habits.length > 0;
  const year = historyDate.getFullYear(), month = historyDate.getMonth();
  $('#history-title').textContent = historyView === 'table' ? 'Últimos 5 días' : historyView === 'month' ? new Intl.DateTimeFormat('es', {month:'long',year:'numeric'}).format(historyDate) : `Tu año, día a día. ${year}`;
  $('#history-range').textContent = `${habits.length} ${habits.length === 1 ? 'hábito' : 'hábitos'}`;
  if (historyView === 'table') {
    const table = node('table', 'history-table');
    const caption = node('caption', 'sr-only', 'Historial de los cinco días terminados en la fecha seleccionada'); table.append(caption);
    const dates = Array.from({length:5}, (_,i) => shiftDate(historyDate, i-4));
    $('#history-title').textContent = `${formatLongDate(dates[0])} – ${formatLongDate(dates[4])}`;
    const head = node('thead'), header = node('tr');
    const title = node('th', '', 'HÁBITOS'); title.scope = 'col'; header.append(title);
    for (const date of dates) {
      const th = node('th'); th.scope = 'col'; th.append(node('span','', new Intl.DateTimeFormat('es',{weekday:'short'}).format(date)),node('strong','',String(date.getDate()))); header.append(th);
    }
    head.append(header); table.append(head);
    const body = node('tbody');
    for (const habit of habits) {
      const row = node('tr', `color-${habit.color}`); row.dataset.habit = habit.id;
      const name = node('th'); name.scope = 'row';
      const button = node('button', 'table-name'); button.type='button'; button.setAttribute('aria-label',`Configurar ${habit.name}`);
      button.append(node('span','history-symbol',habit.icon),node('span','',habit.name)); button.addEventListener('click',()=>openDialog(habit)); name.append(button); row.append(name);
      for (const date of dates) { const td = node('td'); td.append(historyCell(habit,date)); row.append(td); }
      body.append(row);
    }
    table.append(body); content.append(table);
  } else {
    for (const habit of habits) {
      const card = node('article', `history-card color-${habit.color}`); card.dataset.habit = habit.id;
      card.append(habitHistoryHeading(habit));
      const meta = node('div','habit-meta');
      meta.append(node('span','category-label',habit.category ? `${categoryIcon(habit.category)} ${habit.category}` : 'Sin categoría'),node('span','',`${habitStreak(habit)} días de racha${habit.archivedOn ? ' · Archivado' : ''}`)); card.append(meta);
      const scroller = node('div','heatmap-scroll');
      const grid = node('div',historyView === 'month' ? 'month-heatmap' : 'year-heatmap');
      grid.setAttribute('role','group'); grid.setAttribute('aria-label',`Historial de ${habit.name}`);
      const start = new Date(year, historyView === 'month' ? month : 0, 1,12);
      const end = historyView === 'month' ? new Date(year,month+1,0,12) : new Date(year,11,31,12);
      const offset = (start.getDay()+6)%7;
      if (historyView === 'month') for (const day of ['L','M','X','J','V','S','D']) grid.append(node('span','weekday-label',day));
      for (let i=0;i<offset;i++) grid.append(node('span','heatmap-gap'));
      for (let date = start; date <= end; date=shiftDate(date,1)) {
        const cell = historyCell(habit,date,true);
        if (historyView === 'month') cell.textContent = String(date.getDate());
        grid.append(cell);
      }
      scroller.append(grid); card.append(scroller);
      if (historyView === 'cards') card.append(node('div','year-labels','ENE — DIC · Desliza para recorrer todo el año'));
      content.append(card);
      if (historyView === 'cards') {
        const anchor = grid.querySelector(`[data-date="${localDateKey(historyDate)}"]`);
        if (anchor) scroller.scrollLeft = Math.max(0, anchor.offsetLeft - grid.offsetLeft - scroller.clientWidth + 40);
      }
    }
  }
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { historyView = button.dataset.view; renderHistory(); }));
$('#habit-search').addEventListener('input', renderHistory);
$('#show-archived').addEventListener('change', renderHistory);
$('#history-month').addEventListener('change', event => {
  if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
  const date = parseDateKey(`${event.target.value}-01`);
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return;
  historyDate = date; renderHistory();
});
function shiftHistory(direction) {
  let date;
  if (historyView === 'table') date = shiftDate(historyDate, direction*5);
  else date = new Date(historyDate.getFullYear() + (historyView === 'cards' ? direction : 0), historyDate.getMonth() + (historyView === 'month' ? direction : 0), 1,12);
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return;
  historyDate = date; renderHistory();
}
$('#history-prev').addEventListener('click',()=>shiftHistory(-1));
$('#history-next').addEventListener('click',()=>shiftHistory(1));
$('#history-today').addEventListener('click',()=>{historyDate=parseDateKey(localDateKey(new Date()));renderHistory();});
for (const [button, panel] of [['#settings-button','#settings-details'],['#summary-button','#daily-details']]) {
  $(button).addEventListener('click',()=>{ $(panel).open = true; $(panel).scrollIntoView({behavior:'smooth',block:'start'}); });
}

function categoryIcon(name) { return state.categories?.find(category=>category.name === name)?.icon || '✳'; }
function renderCategorySelect() {
  const select = $('#habit-category'), selected = select.value;
  select.replaceChildren();
  const empty = node('option','','Sin categoría'); empty.value=''; select.append(empty);
  for (const category of state.categories || []) {
    const option = node('option','',`${category.icon} ${category.name}`); option.value=category.name; select.append(option);
  }
  select.value = selected;
}
function openCategoryDialog() {
  $('#category-form').reset(); $('#category-error').hidden=true;
  const select = $('#category-edit'); select.replaceChildren();
  const empty = node('option','','Nueva categoría'); empty.value=''; select.append(empty);
  for (const category of state.categories || []) {
    const option = node('option','',`${category.icon} ${category.name}`); option.value=category.name; select.append(option);
  }
  $('#category-name').disabled=false;
  $('#category-dialog').showModal(); $('#category-name').focus();
}
$('#manage-categories').addEventListener('click',openCategoryDialog);
$('#manage-categories-main').addEventListener('click',openCategoryDialog);
$('#close-category').addEventListener('click',()=>$('#category-dialog').close());
$('#category-edit').addEventListener('change',event=>{
  const category=state.categories?.find(category=>category.name === event.target.value);
  $('#category-name').value=category?.name || ''; $('#category-name').disabled=Boolean(category);
  $('#category-symbol').value=category?.icon || '✳'; $('#category-error').hidden=true;
});
$('#category-form').addEventListener('submit',event=>{
  event.preventDefault();
  const name=$('#category-name').value.trim(), icon=$('#category-symbol').value.trim(), editing=$('#category-edit').value;
  const categories=state.categories || [];
  if (!name || !icon || [...icon].length>8 || (!editing && categories.some(category=>category.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')))) {
    $('#category-error').textContent='Escribe un nombre único y un símbolo de hasta 8 caracteres.'; $('#category-error').hidden=false; return;
  }
  const previous=state.categories;
  state.categories=editing ? categories.map(category=>category.name === editing ? {name,icon} : category) : [...categories,{name,icon}];
  if (saveState()) {
    renderCategorySelect();
    if (elements.dialog.open) $('#habit-category').value=name;
    $('#category-dialog').close(); render();
  } else state.categories=previous;
});
