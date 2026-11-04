'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { wrapTableName } from '../../utils/mesasPrint.mjs';
import './mesasPrint.css';
import { downloadMesasExcel } from '../../utils/mesasExcel.mjs';

export default function MesasPrintDocument({ model, busy, message, error, onClose }) {
    const dialogRef = useRef(null);
    useEffect(() => {
        const dialog = dialogRef.current;
        dialog.showModal();
        // Chromium paginates top-layer modal dialogs incorrectly (lost margins).
        // Keep the same document open in normal flow only for printing.
        const beforePrint = () => { dialog.close(); dialog.setAttribute('open', ''); };
        const afterPrint = () => { dialog.removeAttribute('open'); dialog.showModal(); };
        window.addEventListener('beforeprint', beforePrint);
        window.addEventListener('afterprint', afterPrint);
        return () => {
            window.removeEventListener('beforeprint', beforePrint);
            window.removeEventListener('afterprint', afterPrint);
            dialog.close();
        };
    }, []);
    const [mode, setMode] = useState('plan');
    const [excelError, setExcelError] = useState('');
    const [excelBusy, setExcelBusy] = useState(false);
    const exportExcel = async () => {
        setExcelBusy(true);
        setExcelError('');
        try {
            downloadMesasExcel(model);
        } catch (failure) {
            setExcelError(failure.message || 'No se ha podido generar el archivo Excel.');
        } finally { setExcelBusy(false); }
    };
    const [paper, setPaper] = useState('A4');
    const canPrint = model && !model.errors.length && !busy && !error;
    const header = model && <header className="document-heading"><h1>{model.title}</h1><p>Fecha de la boda: {model.date} · {mode === 'plan' ? 'Plano de mesas' : 'Invitados por mesa'}</p><p>{model.total} personas · {model.tables.length} mesas{model.warnings.length > 0 && ` · ${model.warnings.length} incidencias (detalle en listados)`}</p></header>;
    const roster = (title, people, detail) => <section className="roster-section" key={title}>
        <table><colgroup><col style={{ width: '20%' }} /><col style={{ width: '60%' }} /><col style={{ width: '20%' }} /></colgroup><thead><tr><th colSpan="3">{title}{detail && ` · ${detail}`}</th></tr><tr><th>Asiento</th><th>Nombre</th><th>Asistencia</th></tr></thead>
            <tbody>{people.length ? people.map((p, index) => <tr key={`${p.key}:${index}`}><td>{p.seat ?? '—'}{p.duplicateSeat ? ' (duplicado)' : ''}</td><td>{p.name}</td><td>{p.status}</td></tr>) : <tr><td colSpan="3">Sin invitados</td></tr>}</tbody>
        </table>
    </section>;
    return createPortal(<dialog ref={dialogRef} className={`mesas-print-root print-mode-${mode}`} aria-label="Documento de mesas" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
        <style>{`@media print { @page { size: ${mode === 'plan' ? `${paper} landscape` : 'A4 portrait'}; margin: 12mm; } }`}</style>
        <div className="document-toolbar">
            <div className="document-brand"><span>EL CONVITE</span><span>Tu boda, sobre el papel</span></div>
            <button className="document-back" onClick={onClose} disabled={busy}>← Volver a mesas</button>
        </div>
        <div className="document-intro"><span className="document-eyebrow">LOS DETALLES, EN SU SITIO</span><h2>Prepara tu distribución</h2><p>Un plano para imaginar el espacio. Una página por mesa para organizar cada detalle.</p></div>
        <div className="document-controls">
            <label>Documento <select value={mode} onChange={e => setMode(e.target.value)}><option value="plan">Plano horizontal</option><option value="list">Listados A4 vertical</option></select></label>
            {mode === 'plan' && <label>Papel <select value={paper} onChange={e => setPaper(e.target.value)}><option>A4</option><option>A3</option></select></label>}
            <button disabled={!canPrint || excelBusy} onClick={exportExcel}>{excelBusy ? 'Generando Excel…' : 'Descargar Excel'}</button>
            <button className="document-print-button" disabled={!canPrint} onClick={() => window.print()}>Imprimir / Guardar como PDF</button>
            <p>El plano se imprime en horizontal. Los listados, con una mesa por página en A4 vertical. Puedes guardar ambos como PDF o descargar un Excel editable con todas las mesas en una sola hoja. Los cambios en Excel no se guardan en la aplicación.</p>
        </div>
        {busy && <p role="status">{message || 'Preparando el documento…'}</p>}
        {error && <p role="alert">{error}</p>}
        {excelError && <p role="alert">{excelError}</p>}
        {model && <>
            {!!model.errors.length && <div role="alert">No se puede imprimir: {model.errors.join(' ')}</div>}
            {!!model.warnings.length && <aside className="document-warnings"><strong>Incidencias que debes revisar (no se han modificado datos)</strong><ul>{model.warnings.map(w => <li key={w}>{w}</li>)}</ul></aside>}
            <article className={`document-page ${mode === 'plan' ? 'document-plan' : 'document-list'} paper-${paper}`}>
                {header}
                {mode === 'plan' ? <>
                    {!model.tables.length && <p>No hay mesas creadas.</p>}
                    {!model.errors.length && <svg role="img" aria-label="Plano completo de mesas" viewBox={`${model.bounds.x} ${model.bounds.y} ${model.bounds.width} ${model.bounds.height}`} preserveAspectRatio="xMidYMid meet">
                        {model.tables.map(t => {
                            const lines = wrapTableName(t.name, t.width - 12);
                            const fontSize = Math.min(14, (t.height - 12) / Math.max(1, lines.length) / 1.25);
                            return <g key={t.id} transform={`translate(${t.x + t.width / 2} ${t.y + t.height / 2}) rotate(${t.rotation})`}>
                                {t.shape === 'round' ? <ellipse rx={t.width / 2} ry={t.height / 2} fill="white" stroke="#334155" strokeWidth="2"/> : <rect x={-t.width / 2} y={-t.height / 2} width={t.width} height={t.height} rx={t.shape === 'presidential' ? 16 : t.shape === 'square' ? 12 : 8} fill="white" stroke="#334155" strokeWidth="2"/>}
                                <text textAnchor="middle" fill="#111827" fontSize={fontSize} fontFamily="Arial, sans-serif">{lines.map((line, i) => <tspan key={i} x="0" y={(i - (lines.length - 1) / 2) * fontSize * 1.25}>{line}</tspan>)}</text>
                            </g>;
                        })}
                    </svg>}
                    <p className="plan-note">Posiciones y proporciones gráficas originales. Sin escala física. Si los nombres resultan pequeños, selecciona A3.</p>
                </> : <>
                    {model.tables.map(t => roster(t.name, t.guests, `${t.guests.length} personas / ${t.seats} plazas`))}
                    {roster('Sin asignar', model.unassigned)}
                    {!!model.orphaned.length && roster('Mesa inexistente — revisar asignación', model.orphaned)}
                </>}
            </article>
        </>}
        <style>{!canPrint ? '@media print { .mesas-print-root .document-page { display:none !important; } }' : ''}</style>
    </dialog>, document.body);
}
