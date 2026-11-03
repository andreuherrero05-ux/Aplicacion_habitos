const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalize, scheduled, streak} = require('../habits-core');
const date = key => new Date(`${key}T12:00:00`);
const habit = (id, createdOn, completions, extra={}) => normalize({habits:[{id,name:id,createdOn,completions,...extra}]}, '2026-11-03').habits[0];
test('añadir un hábito hoy conserva la racha de ayer', () => {
 const a=habit('a','2026-11-01',{'2026-11-01':true,'2026-11-02':true});
 const b=habit('b','2026-11-03',{});
 assert.equal(streak([a,b],date('2026-11-03')),2);
});
test('archivar conserva las obligaciones y los incumplimientos pasados', () => {
 const a=habit('a','2026-11-01',{'2026-11-01':true}, {archivedOn:'2026-11-03'});
 assert.equal(streak([a],date('2026-11-03')),0);
 assert.equal(scheduled(a,date('2026-11-02')),true);
 assert.equal(scheduled(a,date('2026-11-03')),false);
});
test('los descansos no rompen ni aumentan la racha', () => {
 const a=habit('a','2026-10-30',{'2026-10-30':true,'2026-11-02':true},{days:[1,5]});
 assert.equal(streak([a],date('2026-11-03')),2);
});
test('migración conserva registros antiguos y descarta fechas imposibles o futuras', () => {
 const result=normalize({habits:[{id:'a',name:'a',completions:{'2026-11-01':true,'2026-02-30':true,'2026-11-04':true}}]},'2026-11-03');
 assert.equal(result.habits[0].createdOn,'2026-11-01');
 assert.deepEqual(result.habits[0].completions,{'2026-11-01':true});
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(result)),'2026-11-03'), result);
});
test('rechaza copias inválidas y duplicados', () => {
 for(const data of [null,{}, {habits:[{id:'a',name:'a',days:[]}]}, {habits:[{id:'a',name:'a'},{id:'a',name:'b'}]}]) assert.throws(()=>normalize(data));
});
test('categorías y colores sobreviven a la exportación y las copias antiguas siguen funcionando', () => {
 const old = normalize({habits:[{id:'old',name:'Antiguo',completions:{'2026-11-01':true}}]},'2026-11-03');
 assert.equal(old.habits[0].category,''); assert.equal(old.habits[0].color,'purple');
 assert.equal(old.habits[0].completions['2026-11-01'],true);
 const custom = normalize({habits:[{id:'new',name:'Nuevo',category:' Trabajo ',color:'blue',completions:{}}]},'2026-11-03');
 assert.equal(custom.habits[0].category,'Trabajo');
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(custom)),'2026-11-03'),custom);
});
test('cambiar días conserva hoy, el pasado y las rachas al migrar y recargar', () => {
 const {withSchedule,daysFor}=require('../habits-core');
 const original=habit('a','2026-11-01',{'2026-11-01':true,'2026-11-02':true,'2026-11-03':true});
 const changed=withSchedule(original,[1,3,5],'2026-11-04');
 assert.equal(scheduled(changed,date('2026-11-03')),true);
 assert.equal(scheduled(changed,date('2026-11-05')),false);
 assert.equal(streak([changed],date('2026-11-03')),3);
 assert.deepEqual(daysFor(changed,date('2026-11-02')),[0,1,2,3,4,5,6]);
 const reloaded=normalize({habits:[changed]},'2026-11-03').habits[0];
 assert.deepEqual(reloaded.scheduleHistory,changed.scheduleHistory);
 assert.deepEqual(reloaded.completions,original.completions);
 const twice=withSchedule(reloaded,[2,4],'2026-11-04');
 assert.equal(twice.scheduleHistory.length,2);
 const later=withSchedule(twice,[0,6],'2026-11-10');
 assert.deepEqual(daysFor(later,date('2026-11-05')),[2,4]);
 assert.deepEqual(daysFor(later,date('2026-11-11')),[0,6]);
});
test('categorías sin hábitos y símbolos se conservan en las copias',()=>{
 const data={habits:[],categories:[{name:'Arte',icon:'🎨'}]};
 const result=normalize(data);
 assert.deepEqual(result.categories,data.categories);
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(result))),result);
 assert.throws(()=>normalize({habits:[],categories:[{name:'Arte',icon:''}]}));
});
