import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMesasPrint } from '../../utils/loadMesasPrint.mjs';
function setup() {
    const confirmed = data => ({ data, metadata: { fromCache: false, hasPendingWrites: false } });
    const state = { weddingId: 'a', wedding: confirmed({ novios: ['Ficticia'] }), tables: confirmed([]), guests: confirmed([]) };
    const writes = { pending: 0, failed: false, version: 0, promises: new Set() };
    let reads = 0;
    return { state, writes, options: { weddingId: 'a', getState: () => state, getWrites: () => writes, readServer: async () => { reads++; return { wedding: {}, tables: [], guests: [], confirmed: true }; } }, get reads() { return reads; } };
}
test('already confirmed full data opens without any extra server read', async () => {
    const s = setup();
    assert.equal((await loadMesasPrint(s.options)).wedding, s.state.wedding.data);
    assert.equal(s.reads, 0);
});
test('cache, pending metadata, missing collections, listener failure and different wedding never use fast path', async () => {
    for (const change of [s => { s.guests.metadata.fromCache = true; }, s => { s.tables.metadata.hasPendingWrites = true; }, s => { delete s.wedding; }, s => { s.guests = { error: new Error() }; }, s => { s.weddingId = 'b'; }]) {
        const s = setup(); change(s.state);
        await loadMesasPrint(s.options);
        assert.equal(s.reads, 1);
    }
});
test('waits only editor promises before reusing server-confirmed data', async () => {
    const s = setup(); let finish;
    s.writes.pending = 1;
    const p = new Promise(resolve => { finish = () => { s.writes.pending = 0; s.writes.promises.delete(p); resolve(); }; });
    s.writes.promises.add(p);
    let done = false;
    const loading = loadMesasPrint(s.options).then(result => { done = true; return result; });
    await Promise.resolve(); assert.equal(done, false); finish();
    await loading; assert.equal(s.reads, 0);
});
test('write errors and changes during server reading block export', async () => {
    const s = setup(); s.writes.failed = true;
    await assert.rejects(loadMesasPrint(s.options), /guardado/);
    assert.equal(s.reads, 0);
    const t = setup(); delete t.state.tables;
    t.options.readServer = async () => { t.writes.version++; return { confirmed: true, wedding: {} }; };
    await assert.rejects(loadMesasPrint(t.options), /sin confirmar/);
});
test('fallback rejects unconfirmed reads and reports permissions accurately', async () => {
    const s = setup(); delete s.state.tables;
    s.options.readServer = async () => ({ confirmed: false });
    await assert.rejects(loadMesasPrint(s.options), /caché/);
    s.options.readServer = async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); };
    await assert.rejects(loadMesasPrint(s.options), /permiso/);
});
test('timeout identifies the slow phase and late writes cannot start a server read', async () => {
    const s = setup(); let finish; const phases = [];
    s.writes.pending = 1;
    const p = new Promise(resolve => { finish = () => { s.writes.pending = 0; resolve(); }; });
    s.writes.promises.add(p);
    await assert.rejects(loadMesasPrint({ ...s.options, timeoutMs: 5, onPhase: m => phases.push(m) }), /guardado/);
    finish(); await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(s.reads, 0); assert.equal(phases.length, 1);
    const t = setup(); delete t.state.tables;
    t.options.readServer = () => new Promise(() => {});
    await assert.rejects(loadMesasPrint({ ...t.options, timeoutMs: 5 }), /lectura/);
});
