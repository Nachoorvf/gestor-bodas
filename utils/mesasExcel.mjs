// A small, dependency-free XLSX writer for this three-column document.
// All user text is encoded as inline strings, never formulas or hyperlinks.
const encoder = new TextEncoder();
const mainNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml = value => {
    const text = String(value ?? '');
    if (text.length > 32767) throw new Error('Un nombre o texto supera el límite de Excel (32767 caracteres).');
    return [...text].filter(char => {
        const n = char.codePointAt(0);
        return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 0xD7FF) || (n >= 0xE000 && n <= 0xFFFD) || n >= 0x10000;
    }).join('').replace(/_x[0-9a-f]{4}_/gi, match => `_x005F_${match.slice(1)}`).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
};
function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
// ZIP STORE (no compression), with CRC32 and central directory. XLSX is a ZIP package.
function zip(files) {
    const local = [], central = [];
    let offset = 0, directorySize = 0;
    for (const [path, contents] of Object.entries(files)) {
        const name = encoder.encode(path), data = encoder.encode(contents), crc = crc32(data);
        const header = new Uint8Array(30 + name.length), h = new DataView(header.buffer);
        h.setUint32(0, 0x04034B50, true); h.setUint16(4, 20, true); h.setUint16(12, 33, true);
        h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); header.set(name, 30);
        local.push(header, data);
        const entry = new Uint8Array(46 + name.length), e = new DataView(entry.buffer);
        e.setUint32(0, 0x02014B50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(14, 33, true);
        e.setUint32(16, crc, true); e.setUint32(20, data.length, true); e.setUint32(24, data.length, true); e.setUint16(28, name.length, true); e.setUint32(42, offset, true); entry.set(name, 46);
        central.push(entry); directorySize += entry.length; offset += header.length + data.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054B50, true); e.setUint16(8, central.length, true); e.setUint16(10, central.length, true); e.setUint32(12, directorySize, true); e.setUint32(16, offset, true);
    const result = new Uint8Array(offset + directorySize + end.length);
    let cursor = 0;
    for (const part of [...local, ...central, end]) { result.set(part, cursor); cursor += part.length; }
    return result;
}
export function createMesasExcel(model) {
    if (!model || model.errors.length) throw new Error('Revisa los errores del documento antes de descargar Excel.');
    const rows = [], merges = [];
    const row = (values, style = 3, merged = false) => {
        const r = rows.length + 1;
        if (r > 1048576) throw new Error('El listado supera el límite de filas de Excel.');
        const height = Math.min(409, Math.max(24, ...values.map((value, i) => (Math.ceil(String(value ?? '').length / (merged ? 95 : i === 1 ? 65 : 18)) || 1) * 16 + 8)));
        rows.push(`<row r="${r}" ht="${height}" customHeight="1">${values.map((value, i) => {
            const ref = `${String.fromCharCode(65 + i)}${r}`;
            return Number.isFinite(value) ? `<c r="${ref}" s="${style}" t="n"><v>${value}</v></c>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
        }).join('')}</row>`);
        if (merged) merges.push(`<mergeCell ref="A${r}:C${r}"/>`);
    };
    row([model.title], 5, true);
    row([`Fecha: ${model.date} · ${model.total} personas · ${model.tables.length} mesas`], 4, true);
    row(['Archivo editable. Los cambios aquí no modifican la aplicación.'], 4, true);
    row([]);
    const block = (title, people) => {
        row([title], 1, true);
        row(['Asiento', 'Nombre', 'Asistencia'], 2);
        if (!people.length) row(['Sin invitados'], 4, true);
        for (const p of people) row([p.duplicateSeat ? `${p.seat} (duplicado)` : p.seat ?? '—', p.name, p.status]);
        row([]);
    };
    for (const t of model.tables) block(`${t.name} · ${t.guests.length} personas / ${t.seats} plazas`, t.guests);
    block('Sin asignar', model.unassigned);
    if (model.orphaned.length) block('Mesa inexistente — revisar asignación', model.orphaned);
    if (model.warnings.length) {
        row(['Incidencias que revisar'], 1, true);
        for (const warning of model.warnings) row([warning], 4, true);
    }
    const styles = `<styleSheet xmlns="${mainNs}"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2EBDD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF18181B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE4E4E7"/></left><right style="thin"><color rgb="FFE4E4E7"/></right><top style="thin"><color rgb="FFE4E4E7"/></top><bottom style="thin"><color rgb="FFE4E4E7"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">${[[0,0,0],[1,2,1],[2,3,1],[0,0,1],[0,0,0],[1,0,0]].map(([font,fill,border]) => `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    return zip({
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
        '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relNs}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        'xl/workbook.xml': `<workbook xmlns="${mainNs}" xmlns:r="${relNs}"><sheets><sheet name="Distribución de mesas" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        'xl/_rels/workbook.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${relNs}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${relNs}/styles" Target="styles.xml"/></Relationships>`,
        'xl/styles.xml': styles,
        'xl/worksheets/sheet1.xml': `<worksheet xmlns="${mainNs}"><dimension ref="A1:C${rows.length}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="75" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/></cols><sheetData>${rows.join('')}</sheetData><mergeCells count="${merges.length}">${merges.join('')}</mergeCells></worksheet>`
    });
}
export function downloadMesasExcel(model) {
    const bytes = createMesasExcel(model);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mesas_${model.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 70) || 'boda'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
