'use client';
import { useState } from 'react';
import MesasPrintDocument from '../../../../components/planner/MesasPrintDocument';
import { prepareMesasPrint } from '../../../../utils/mesasPrint.mjs';
import { printFixtures } from '../../fixtures.mjs';
export default function Preview() {
    const [open, setOpen] = useState(false);
    const fixture = printFixtures();
    return <main><h1>Prueba local — datos exclusivamente ficticios</h1><p>Esta aplicación aislada no importa Firebase, AuthProvider ni el layout de producción.</p><button onClick={() => setOpen(true)}>Abrir documento ficticio</button>{open && <MesasPrintDocument model={prepareMesasPrint(fixture.wedding, fixture.tables, fixture.guests)} onClose={() => setOpen(false)} />}</main>;
}
