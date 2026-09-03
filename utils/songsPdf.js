/**
 * Genera y descarga un documento PDF limpio y elegante con la lista de canciones
 * sugeridas por los invitados para el DJ o equipo de sonido.
 *
 * @param {Object} params
 * @param {Object} params.weddingData - Datos de la boda (novios, fecha, etc.)
 * @param {Array} params.guests - Lista de invitados con canciones
 * @param {string} [params.filterType='all'] - 'all' | 'approved'
 */
export async function generateSongsPdf({ weddingData, guests, filterType = 'all' }) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    // 1. Filtrar invitados con canciones registradas
    let filtered = (guests || []).filter(g => g.cancion && g.cancion.trim() !== '');

    if (filterType === 'approved') {
        filtered = filtered.filter(g => g.cancionStatus === 'approved');
    } else {
        filtered = filtered.filter(g => g.cancionStatus !== 'rejected');
    }

    // 2. Ordenar alfabéticamente por canción / artista
    const sortedSongs = [...filtered].sort((a, b) => {
        const songA = (a.cancion || '').trim();
        const songB = (b.cancion || '').trim();
        return songA.localeCompare(songB, 'es', { sensitivity: 'base' });
    });

    const getWeddingTitle = () => {
        if (weddingData?.novios) return `${weddingData.novios[0]} & ${weddingData.novios[1]}`;
        if (weddingData?.partner1 && weddingData?.partner2) return `${weddingData.partner1} & ${weddingData.partner2}`;
        return weddingData?.name || 'Nuestra Boda';
    };

    const weddingTitle = getWeddingTitle();

    const formatDate = (dateVal) => {
        if (!dateVal) return 'Fecha sin definir';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return String(dateVal);
        }
    };

    const weddingDateStr = formatDate(weddingData?.fecha || weddingData?.date);

    // 3. Crear documento PDF A4 vertical
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    const drawHeader = () => {
        let currentY = 16;

        // Marca superior
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(140, 140, 140);
        doc.text('EL CONVITE · LISTA DE MÚSICA', marginX, currentY);

        // Fecha de emisión
        const printDateStr = `Emitido: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(printDateStr, pageWidth - marginX, currentY, { align: 'right' });

        currentY += 8;

        // Título
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(34, 34, 34);
        doc.text('LISTA DE CANCIONES PARA EL DJ', marginX, currentY);

        currentY += 6;

        // Subtítulo
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Sugerencias musicales de los invitados · ${weddingTitle}`, marginX, currentY);

        currentY += 6;

        // Línea
        doc.setDrawColor(210, 210, 215);
        doc.setLineWidth(0.4);
        doc.line(marginX, currentY, pageWidth - marginX, currentY);

        currentY += 6;

        // Caja de resumen
        const summaryBoxHeight = 18;
        const boxWidth = pageWidth - (marginX * 2);

        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(228, 231, 236);
        doc.roundedRect(marginX, currentY, boxWidth, summaryBoxHeight, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('BODA / EVENTO:', marginX + 5, currentY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 30, 30);
        doc.text(`${weddingTitle} (${weddingDateStr})`, marginX + 5, currentY + 12);

        const col2X = marginX + (boxWidth * 0.58);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('TOTAL TEMAS:', col2X, currentY + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(180, 120, 30); // Tono ámbar/dorado elegante
        doc.text(`${sortedSongs.length} ${sortedSongs.length === 1 ? 'canción sugerida' : 'canciones sugeridas'}`, col2X, currentY + 12);

        return currentY + summaryBoxHeight + 8;
    };

    const startTableY = drawHeader();

    // 4. Filas de la tabla
    const tableHeaders = [['#', 'Canción / Artista', 'Sugerida por']];
    const tableRows = sortedSongs.map((g, index) => [
        String(index + 1),
        (g.cancion || '').trim(),
        (g.nombre || 'Invitado').trim() + (g.group ? ` (${g.group})` : '')
    ]);

    if (tableRows.length === 0) {
        tableRows.push(['-', 'No hay canciones sugeridas registradas.', '-']);
    }

    // 5. Renderizar tabla
    autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: startTableY,
        margin: { left: marginX, right: marginX, bottom: 20 },
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            textColor: [45, 50, 60],
            lineColor: [225, 229, 235],
            lineWidth: 0.2,
            cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            valign: 'middle'
        },
        headStyles: {
            fillColor: [35, 39, 47],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            halign: 'left'
        },
        alternateRowStyles: {
            fillColor: [252, 252, 253]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12, fontStyle: 'bold', textColor: [120, 120, 120] },
            1: { cellWidth: 110, fontStyle: 'bold', textColor: [20, 20, 20] },
            2: { cellWidth: 'auto', textColor: [90, 95, 105] }
        },
        didDrawPage: () => {
            const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
            const totalPages = doc.internal.getNumberOfPages();

            doc.setDrawColor(220, 220, 225);
            doc.setLineWidth(0.3);
            doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(140, 140, 140);
            doc.text('El Convite · Lista de repertorio para DJ y ambientación musical', marginX, pageHeight - 7);

            doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' });
        }
    });

    const safeTitle = weddingTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const dateStamp = new Date().toISOString().slice(0, 10);
    doc.save(`Lista_Canciones_DJ_${safeTitle}_${dateStamp}.pdf`);
}
