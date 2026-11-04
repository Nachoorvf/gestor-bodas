const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const text = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
export const attendanceLabel = value => value === true ? 'Confirmado' : value === false ? 'Rechazado' : 'Pendiente';
export function prepareMesasPrint(wedding = {}, sourceTables = [], sourceGuests = []) {
    const warnings = [], errors = [];
    const tables = sourceTables.map(t => ({
        id: t.id, name: text(t.name, 'Mesa sin nombre'), shape: t.shape || 'round',
        x: t.position?.x, y: t.position?.y, width: t.width, height: t.height,
        rotation: t.rotation ?? 0, seats: t.seats, guests: []
    })).sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.id, b.id));
    const tableMap = new Map(tables.map(t => [t.id, t]));
    if (tableMap.size !== tables.length) errors.push('Hay identificadores de mesa duplicados.');
    for (const t of tables) {
        if (![t.x, t.y, t.width, t.height, t.rotation].every(Number.isFinite) || t.width <= 0 || t.height <= 0)
            errors.push(`Geometría inválida: ${t.name}.`);
        if (!['round', 'square', 'rectangular', 'presidential'].includes(t.shape)) errors.push(`Forma desconocida: ${t.name}.`);
        if (!Number.isInteger(t.seats) || t.seats < 1) warnings.push(`Capacidad inválida: ${t.name}.`);
        if (tables.filter(other => other.name === t.name).length > 1) warnings.push(`Nombre de mesa repetido: ${t.name} (${t.id}).`);
    }
    // Explicit projection: never carry phone numbers, allergies or other private fields.
    const people = sourceGuests.map(g => ({ key: `guest:${g.id}`, name: text(g.nombre, 'Invitado sin nombre'), tableId: g.tableId, seatIndex: g.seatIndex, status: attendanceLabel(g.confirmado) }));
    for (let i = 0; i < 2; i++) if (wedding.novios?.[i]) people.push({
        key: `partner:${i}`, name: text(wedding.novios[i], 'Novio/a'),
        tableId: wedding[`novio${i + 1}_tableId`], seatIndex: wedding[`novio${i + 1}_seatIndex`], status: 'Confirmado'
    });
    const keys = new Set(), unassigned = [], orphaned = [];
    for (const p of people) {
        if (keys.has(p.key)) errors.push(`Identificador de persona duplicado: ${p.key}.`);
        keys.add(p.key);
        const t = tableMap.get(p.tableId);
        p.seat = t && Number.isInteger(p.seatIndex) && p.seatIndex >= 0 && p.seatIndex < t.seats ? p.seatIndex + 1 : null;
        if (!p.tableId) unassigned.push(p);
        else if (!t) { orphaned.push(p); warnings.push(`Mesa inexistente: ${p.name}.`); }
        else {
            t.guests.push(p);
            if (p.seat === null) warnings.push(`Asiento sin índice válido: ${p.name}, ${t.name}.`);
        }
    }
    const sortPeople = (a, b) => (a.seat ?? Infinity) - (b.seat ?? Infinity) || collator.compare(a.name, b.name) || collator.compare(a.key, b.key);
    for (const t of tables) {
        t.guests.sort(sortPeople);
        const counts = new Map();
        for (const p of t.guests) if (p.seat !== null) counts.set(p.seat, (counts.get(p.seat) || 0) + 1);
        for (const p of t.guests) p.duplicateSeat = p.seat !== null && counts.get(p.seat) > 1;
        for (const [seat, count] of counts) if (count > 1) warnings.push(`Asiento duplicado: ${t.name}, silla ${seat} (${count} personas).`);
        if (t.guests.length > t.seats) warnings.push(`Aforo superado: ${t.name}.`);
    }
    unassigned.sort(sortPeople); orphaned.sort(sortPeople);
    let bounds = { x: 0, y: 0, width: 400, height: 240 };
    if (tables.length && !errors.length) {
        const boxes = tables.map(t => {
            const angle = t.rotation * Math.PI / 180;
            const w = Math.abs(t.width * Math.cos(angle)) + Math.abs(t.height * Math.sin(angle));
            const h = Math.abs(t.width * Math.sin(angle)) + Math.abs(t.height * Math.cos(angle));
            return { left: t.x + t.width / 2 - w / 2, right: t.x + t.width / 2 + w / 2, top: t.y + t.height / 2 - h / 2, bottom: t.y + t.height / 2 + h / 2 };
        });
        const left = Math.min(...boxes.map(b => b.left)) - 30, top = Math.min(...boxes.map(b => b.top)) - 30;
        bounds = { x: left, y: top, width: Math.max(...boxes.map(b => b.right)) + 30 - left, height: Math.max(...boxes.map(b => b.bottom)) + 30 - top };
    }
    return { title: Array.isArray(wedding.novios) ? wedding.novios.map(n => text(n, '')).filter(Boolean).join(' y ') || 'Boda' : 'Boda', date: text(wedding.fecha, 'Sin fecha'), tables, unassigned, orphaned, bounds, warnings: [...new Set(warnings)], errors: [...new Set(errors)], total: people.length };
}
// Wrap long labels without truncation, including single long words.
export function wrapTableName(name, width) {
    const limit = Math.max(4, Math.floor(width / 8));
    const lines = [];
    for (const word of name.split(/\s+/)) {
        let remaining = word;
        while (remaining.length > limit) { lines.push(remaining.slice(0, limit)); remaining = remaining.slice(limit); }
        if (!remaining) continue;
        const last = lines.length - 1;
        if (last >= 0 && lines[last].length + remaining.length + 1 <= limit) lines[last] += ` ${remaining}`;
        else lines.push(remaining);
    }
    return lines.length ? lines : ['Mesa'];
}
