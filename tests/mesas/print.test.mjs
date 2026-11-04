import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareMesasPrint, wrapTableName } from '../../utils/mesasPrint.mjs';
const table = (id, extra = {}) => ({ id, name: `Mesa ${id}`, shape: 'round', position: { x: 0, y: 0 }, width: 160, height: 160, seats: 10, ...extra });
test('retains all guests, partners, empty tables and attendance without private fields', () => {
    const source = [{ id: 'a', nombre: 'Ángela Ñúñez', tableId: '1', seatIndex: 2, confirmado: true, telefono: 'PRIVATE', alergias: 'PRIVATE' }, { id: 'b', nombre: 'B', tableId: '1', seatIndex: 0, confirmado: false }, { id: 'c', nombre: 'C' }, { id: 'd', nombre: 'D', tableId: 'missing' }];
    const original = JSON.stringify(source);
    const m = prepareMesasPrint({ novios: ['Novia', 'Novio'], novio1_tableId: '1', novio1_seatIndex: 1 }, [table('1'), table('2')], source);
    assert.equal(m.total, 6); assert.equal(m.tables[1].guests.length, 0);
    assert.deepEqual(m.tables[0].guests.map(p => p.name), ['B', 'Novia', 'Ángela Ñúñez']);
    assert.equal(m.unassigned.length, 2); assert.equal(m.orphaned.length, 1);
    assert.deepEqual(m.tables[0].guests.map(p => p.status), ['Rechazado', 'Confirmado', 'Confirmado']);
    assert(!JSON.stringify(m).includes('PRIVATE')); assert.equal(JSON.stringify(source), original);
});
test('duplicate and invalid seats never hide people', () => {
    const m = prepareMesasPrint({}, [table('1')], [0, 0, -1, 100, null].map((seatIndex, i) => ({ id: String(i), nombre: `Persona ${i}`, tableId: '1', seatIndex })));
    assert.equal(m.tables[0].guests.length, 5);
    assert.equal(m.tables[0].guests.filter(g => g.duplicateSeat).length, 2);
    assert(m.warnings.some(w => w.includes('duplicado')));
});
test('all shapes and rotated negative coordinates are within bounds', () => {
    const tables = ['round', 'square', 'rectangular', 'presidential'].map((shape, i) => table(String(i), { shape, position: { x: -1000 + i * 700, y: -600 + i * 300 }, width: 240, height: 100, rotation: 45 }));
    const m = prepareMesasPrint({}, tables, []);
    for (const t of tables) for (const x of [-120, 120]) for (const y of [-50, 50]) {
        const a = Math.PI / 4, px = t.position.x + 120 + x * Math.cos(a) - y * Math.sin(a), py = t.position.y + 50 + x * Math.sin(a) + y * Math.cos(a);
        assert(px >= m.bounds.x && px <= m.bounds.x + m.bounds.width);
        assert(py >= m.bounds.y && py <= m.bounds.y + m.bounds.height);
    }
});
test('empty model is finite and invalid geometry prevents a valid plan', () => {
    assert(Number.isFinite(prepareMesasPrint().bounds.width));
    assert(prepareMesasPrint({}, [table('1', { position: null })]).errors.length);
});
test('hundreds of guests and long accented names remain complete', () => {
    const tables = Array.from({ length: 50 }, (_, i) => table(String(i)));
    const guests = Array.from({ length: 500 }, (_, i) => ({ id: String(i), nombre: `Invitado Áéñ ${i}`, tableId: String(i % 50), seatIndex: Math.floor(i / 50) }));
    const m = prepareMesasPrint({}, tables, guests);
    assert.equal(m.tables.reduce((n, t) => n + t.guests.length, 0), 500);
    const name = 'NombreLarguísimoSinEspacios'.repeat(10);
    assert.equal(wrapTableName(name, 100).join(''), name);
});
test('homonyms are distinct and duplicated IDs block printing', () => {
    const people = [{ id: '1', nombre: 'Ana' }, { id: '2', nombre: 'Ana' }];
    assert.equal(prepareMesasPrint({}, [], people).unassigned.length, 2);
    assert(prepareMesasPrint({}, [], [people[0], people[0]]).errors.length);
});

test('visual fixture has 335 people, twenty tables and only intentional incidents', async () => {
    const { printFixtures } = await import('./fixtures.mjs');
    const f = printFixtures();
    const m = prepareMesasPrint(f.wedding, f.tables, f.guests);
    assert.equal(m.total, 335);
    assert.equal(m.tables.length, 20);
    assert.equal(m.errors.length, 0);
    assert.equal(m.warnings.length, 2);
    assert.equal(m.tables.reduce((n, t) => n + t.guests.length, 0) + m.unassigned.length + m.orphaned.length, 335);
});
