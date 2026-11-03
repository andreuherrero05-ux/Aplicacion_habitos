(function (root) {
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parse = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); };
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && key(parse(value)) === value;
  function normalize(data, today = key(new Date())) {
    if (!data || !Array.isArray(data.habits)) throw new Error('La copia no contiene hábitos válidos.');
    const ids = new Set();
    return {version: 2, habits: data.habits.map(h => {
      if (!h || typeof h.id !== 'string' || !h.id || ids.has(h.id) || typeof h.name !== 'string' || !h.name.trim() || h.name.length > 48) throw new Error('Hay hábitos inválidos o duplicados.');
      ids.add(h.id);
      const completions = Object.fromEntries(Object.entries(h.completions || {}).filter(([d,v]) => validDate(d) && d <= today && v === true));
      // Las versiones antiguas no guardaban la fecha de creación: conservar todo el historial conocido.
      const createdOn = validDate(h.createdOn) ? h.createdOn : Object.keys(completions).sort()[0] || today;
      const days = h.days === undefined ? [0,1,2,3,4,5,6] : h.days;
      if (!Array.isArray(days) || !days.length || days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('Frecuencia inválida.');
      if (h.archivedOn != null && (!validDate(h.archivedOn) || h.archivedOn < createdOn)) throw new Error('Fecha de archivo inválida.');
      return {...h, name:h.name.trim(), icon:typeof h.icon === 'string' ? h.icon : '✳', tone:typeof h.tone === 'string' ? h.tone : '', reminder:typeof h.reminder === 'string' ? h.reminder : 'Un pequeño paso para ti', completions, createdOn, archivedOn:h.archivedOn || null, days:[...new Set(days)]};
    })};
  }
  const scheduled = (h,date) => key(date) >= h.createdOn && (!h.archivedOn || key(date) < h.archivedOn) && h.days.includes(date.getDay());
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
  const api = {key, validDate, normalize, scheduled, streak};
  if (typeof module !== 'undefined') module.exports = api;
  else root.HabitsCore = api;
})(globalThis);
