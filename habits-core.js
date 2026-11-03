(function (root) {
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parse = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); };
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && key(parse(value)) === value;
  function normalize(data, today = key(new Date())) {
    if (!data || !Array.isArray(data.habits)) throw new Error('La copia no contiene hábitos válidos.');
    const ids = new Set();
    const defaults = [{name:'Fitness',icon:'⌁'},{name:'Estudio',icon:'▤'},{name:'Finanzas',icon:'◈'},{name:'Bienestar',icon:'♡'}];
    if (data.categories !== undefined && !Array.isArray(data.categories)) throw new Error('Categorías inválidas.');
    const categories = (data.categories || defaults).map(category => {
      if (!category || typeof category.name !== 'string' || !category.name.trim() || category.name.length > 32 || typeof category.icon !== 'string' || !category.icon.trim() || [...category.icon].length > 8) throw new Error('Categoría inválida.');
      return {name:category.name.trim(),icon:category.icon.trim()};
    });
    if (new Set(categories.map(c=>c.name)).size !== categories.length) throw new Error('Categorías duplicadas.');
    for (const habit of data.habits) {
      const name = typeof habit?.category === 'string' ? habit.category.trim().slice(0,32) : '';
      if (name && !categories.some(c=>c.name === name)) categories.push({name,icon:'✳'});
    }
    return {version: 3, categories, habits: data.habits.map(h => {
      if (!h || typeof h.id !== 'string' || !h.id || ids.has(h.id) || typeof h.name !== 'string' || !h.name.trim() || h.name.length > 48) throw new Error('Hay hábitos inválidos o duplicados.');
      ids.add(h.id);
      const completions = Object.fromEntries(Object.entries(h.completions || {}).filter(([d,v]) => validDate(d) && d <= today && v === true));
      // Las versiones antiguas no guardaban la fecha de creación: conservar todo el historial conocido.
      const createdOn = validDate(h.createdOn) ? h.createdOn : Object.keys(completions).sort()[0] || today;
      const days = h.days === undefined ? [0,1,2,3,4,5,6] : h.days;
      if (!Array.isArray(days) || !days.length || days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('Frecuencia inválida.');
      if (h.archivedOn != null && (!validDate(h.archivedOn) || h.archivedOn < createdOn)) throw new Error('Fecha de archivo inválida.');
      const scheduleHistory = h.scheduleHistory || [{from:createdOn,days:[...days]}];
      if (!Array.isArray(scheduleHistory) || !scheduleHistory.length || scheduleHistory[0].from !== createdOn || scheduleHistory.some((entry,i) => !validDate(entry.from) || !Array.isArray(entry.days) || !entry.days.length || entry.days.some(d => !Number.isInteger(d) || d<0 || d>6) || (i>0 && entry.from <= scheduleHistory[i-1].from))) throw new Error('Historial de frecuencia inválido.');
      return {...h, scheduleHistory:scheduleHistory.map(entry=>({from:entry.from,days:[...new Set(entry.days)]})), category:typeof h.category === 'string' ? h.category.trim().slice(0,32) : '', color:['blue','purple','gold','green','pink','gray'].includes(h.color) ? h.color : 'purple', name:h.name.trim(), icon:typeof h.icon === 'string' ? h.icon : '✳', tone:typeof h.tone === 'string' ? h.tone : '', reminder:typeof h.reminder === 'string' ? h.reminder : 'Un pequeño paso para ti', completions, createdOn, archivedOn:h.archivedOn || null, days:[...new Set(days)]};
    })};
  }
  const daysFor = (habit, date) => {
    const entries = habit.scheduleHistory || [{from:habit.createdOn, days:habit.days}];
    return entries.filter(entry=>entry.from <= key(date)).at(-1)?.days || [];
  };
  function withSchedule(habit, days, from) {
    if (!validDate(from) || from < habit.createdOn || !days.length || days.some(d=>!Number.isInteger(d) || d<0 || d>6)) throw new Error('Frecuencia inválida.');
    const history = habit.scheduleHistory || [{from:habit.createdOn, days:habit.days}];
    return {...habit, days:[...days], scheduleHistory:[...history.filter(entry=>entry.from<from),{from,days:[...days]}]};
  }
  const scheduled = (h,date) => key(date) >= h.createdOn && (!h.archivedOn || key(date) < h.archivedOn) && daysFor(h,date).includes(date.getDay());
  function streak(habits, today = new Date()) {
    if (!habits.length) return 0;
    let day = parse(key(today)), count = 0;
    const first = habits.map(h=>h.createdOn).sort()[0];
    let isToday = true;
    while (key(day) >= first) {
      const due = habits.filter(h=>scheduled(h,day));
      if (due.length) {
        if (due.every(h=>h.completions[key(day)] === true)) count++;
        else if (!isToday) break;
      }
      isToday = false;
      day.setDate(day.getDate()-1);
    }
    return count;
  }
  const api = {key, validDate, normalize, scheduled, streak, daysFor, withSchedule};
  if (typeof module !== 'undefined') module.exports = api;
  else root.HabitsCore = api;
})(globalThis);
