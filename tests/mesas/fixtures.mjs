export function printFixtures() {
    const tables = [
        { id: '1', name: 'Mesa 1 — Jardín', shape: 'round', width: 160, height: 160, position: { x: -240, y: -160 }, rotation: 0, seats: 12 },
        { id: '2', name: 'Presidencial — María José y Íñigo', shape: 'presidential', width: 300, height: 100, position: { x: 20, y: -180 }, rotation: 0, seats: 8 },
        { id: '3', name: 'Amistades de toda la vida — Celebración en el Mediterráneo', shape: 'rectangular', width: 240, height: 120, position: { x: 180, y: 100 }, rotation: 45, seats: 12 },
        { id: '4', name: 'Mesa 4 — Pequeños', shape: 'square', width: 140, height: 140, position: { x: -180, y: 160 }, rotation: 90, seats: 8 },
        { id: '5', name: 'Mesa vacía', shape: 'round', width: 160, height: 160, position: { x: 540, y: 150 }, rotation: 0, seats: 10 }
    ];
    for (let i = 6; i <= 20; i++) tables.push({ id: String(i), name: `Mesa ${i} — Compañeros`, shape: i % 2 ? 'round' : 'rectangular', width: 180, height: 140, position: { x: -240 + ((i - 6) % 5) * 250, y: 450 + Math.floor((i - 6) / 5) * 220 }, rotation: i % 3 ? 0 : -45, seats: 24 });
    const names = ['María José Muñoz de los Ríos', 'Íñigo Fernández-García', 'Ángela Núñez López', 'José Ramón Pérez de la Fuente y Rodríguez de la Sierra — Nombre ficticio largo'];
    const guests = Array.from({ length: 330 }, (_, i) => {
        const tableId = i < 4 ? String(i + 1) : String(6 + (i % 15));
        return { id: `fixture-${i}`, nombre: `${names[i % names.length]} (${String(i).padStart(3, '0')})`, tableId, seatIndex: i < 4 ? 0 : Math.floor(i / 15), confirmado: i % 3 === 0 ? true : i % 3 === 1 ? false : null };
    });
    guests.push({ id: 'unassigned', nombre: 'Lucía Sin Mesa — Ficticia' }, { id: 'orphan', nombre: 'Óscar Mesa Inexistente — Ficticio', tableId: 'deleted' }, { id: 'duplicate', nombre: 'Asiento Duplicado — Ficticio', tableId: '1', seatIndex: 0 });
    return { wedding: { novios: ['María José (ficticia)', 'Íñigo (ficticio)'], fecha: '2027-06-12', novio1_tableId: '2', novio1_seatIndex: 2, novio2_tableId: '2', novio2_seatIndex: 3 }, tables, guests };
}
