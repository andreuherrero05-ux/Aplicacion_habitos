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
