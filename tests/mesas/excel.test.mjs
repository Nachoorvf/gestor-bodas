import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createMesasExcel } from '../../utils/mesasExcel.mjs';
import { prepareMesasPrint } from '../../utils/mesasPrint.mjs';
import { printFixtures } from './fixtures.mjs';

// Independent ZIP/CRC and XML reader, using the system Python standard library.
const inspect = bytes => {
    const result = spawnSync('python3', ['-c', `
import sys,io,zipfile,json,xml.etree.ElementTree as E
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.testzip() is None
for name in z.namelist(): E.fromstring(z.read(name))
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
w=E.fromstring(z.read('xl/workbook.xml'))
s=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
cells=s.findall('.//s:c',n)
print(json.dumps({'sheets':len(w.findall('s:sheets/s:sheet',n)), 'values':[''.join(c.itertext()) for c in cells], 'formulas':len(s.findall('.//s:f',n)), 'types':[c.get('t') for c in cells], 'merges':len(s.findall('s:mergeCells/s:mergeCell',n))}))
`], { input: bytes, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(result.status, 0, result.stderr?.toString());
    return JSON.parse(result.stdout.toString());
};
test('valid XLSX with a single styled sheet, all table blocks and 335 people', () => {
    const f = printFixtures(), model = prepareMesasPrint(f.wedding, f.tables, f.guests);
    const before = JSON.stringify(model);
    const workbook = inspect(createMesasExcel(model));
    assert.equal(workbook.sheets, 1);
    assert.equal(workbook.formulas, 0);
    for (const t of model.tables) assert(workbook.values.includes(`${t.name} · ${t.guests.length} personas / ${t.seats} plazas`));
    for (const p of [...model.tables.flatMap(t => t.guests), ...model.unassigned, ...model.orphaned]) {
        assert.equal(workbook.values.filter(v => v === p.name).length, 1);
    }
    assert(workbook.values.includes('Sin invitados'));
    assert(workbook.values.includes('Sin asignar'));
    assert(workbook.values.includes('Mesa inexistente — revisar asignación'));
    assert(workbook.values.includes('1 (duplicado)'));
    assert(workbook.merges >= model.tables.length + 2);
    assert.equal(JSON.stringify(model), before);
});
test('formula-looking names, XML characters, Unicode and OOXML escapes remain strings', () => {
    const model = prepareMesasPrint({}, [], [
        { id: '1', nombre: '=HYPERLINK("https://example.invalid")' },
        { id: '2', nombre: 'Ángela & <Íñigo> 😊' },
        { id: '3', nombre: '_x0041_' }
    ]);
    const workbook = inspect(createMesasExcel(model));
    assert.equal(workbook.formulas, 0);
    assert(workbook.values.includes('=HYPERLINK("https://example.invalid")'));
    assert(workbook.values.includes('Ángela & <Íñigo> 😊'));
    assert(workbook.values.includes('_x005F_x0041_'));
    assert(workbook.types.every(t => t === 'inlineStr'));
});
test('empty data is supported; invalid model and oversized text fail without silent truncation', () => {
    assert.equal(inspect(createMesasExcel(prepareMesasPrint())).sheets, 1);
    assert.throws(() => createMesasExcel({ errors: ['bad'] }), /Revisa/);
    assert.throws(() => createMesasExcel(prepareMesasPrint({ novios: ['a'.repeat(32768)] })), /límite de Excel/);
});
