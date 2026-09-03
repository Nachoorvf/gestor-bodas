/**
 * Genera y descarga directamente un documento PDF profesional para el catering
 * con los comensales que tienen alergias o menús especiales.
 *
 * @param {Object} params
 * @param {Object} params.weddingData - Datos de la boda (novios, fecha, etc.)
 * @param {Array} params.guests - Lista de invitados con alergias
 * @param {Array} params.tables - Lista de mesas para resolver el nombre
 * @param {string} [params.filterType='all'] - 'all' | 'approved'
 */
export async function generateCateringPdf({ weddingData, guests, tables = [], filterType = 'all' }) {
    // Importación dinámica en cliente para evitar conflictos con SSR en Next.js
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    // 1. Filtrar comensales con alergias que asistirán (excluye rechazados y los que han dicho 'No puedo ir')
    let filtered = (guests || []).filter(g => 
        g.alergias && 
        g.alergias.trim() !== '' && 
        g.confirmado !== false && 
        g.alergiasStatus !== 'rejected'
    );

    // 2. Ordenar alfabéticamente por nombre (de la A a la Z)
    const sortedGuests = [...filtered].sort((a, b) => {
        const nameA = (a.nombre || '').trim();
        const nameB = (b.nombre || '').trim();
        return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    // Helper para nombre de mesa
    const getTableName = (tableId) => {
        if (!tableId) return 'Sin asignar';
        const table = tables.find(t => t.id === tableId);
        return table?.name || 'Sin asignar';
    };

    // Helper de fecha legible
    const formatDate = (dateVal) => {
        if (!dateVal) return 'Sin fecha definida';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            return d.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch {
            return String(dateVal);
        }
    };

    // Información de la pareja / boda
    const weddingTitle = weddingData?.novios
        ? `${weddingData.novios[0]} & ${weddingData.novios[1]}`
        : weddingData?.partner1 && weddingData?.partner2
            ? `${weddingData.partner1} & ${weddingData.partner2}`
            : weddingData?.name || 'Nuestra Boda';

    const weddingDateStr = formatDate(weddingData?.fecha || weddingData?.date);

    // Contadores para el resumen
    const totalMenus = sortedGuests.length;
    const totalSeated = sortedGuests.filter(g => g.tableId).length;
    const totalUnseated = totalMenus - totalSeated;

    // 3. Crear documento PDF A4 vertical
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const marginX = 14;

    // Función para dibujar la cabecera en la primera página
    const drawHeader = () => {
        let currentY = 16;

        // Marca superior "EL CONVITE"
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(140, 140, 140);
        doc.text('EL CONVITE · GESTIÓN DE BODAS', marginX, currentY);

        // Fecha de emisión a la derecha
        const printDateStr = `Emitido: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(printDateStr, pageWidth - marginX, currentY, { align: 'right' });

        currentY += 8;

        // Título Principal
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(34, 34, 34);
        doc.text('REPORTE PARA CATERING', marginX, currentY);

        currentY += 6;

        // Subtítulo
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Listado alfabético de comensales con menús especiales y alergias', marginX, currentY);

        currentY += 6;

        // Línea decorativa
        doc.setDrawColor(210, 210, 215);
        doc.setLineWidth(0.4);
        doc.line(marginX, currentY, pageWidth - marginX, currentY);

        currentY += 6;

        // CAJA DE RESUMEN EJECUTIVO (Fondo gris cálido suave con borde)
        const summaryBoxHeight = 24;
        const boxWidth = pageWidth - (marginX * 2);

        doc.setFillColor(248, 249, 250);
        doc.setDrawColor(228, 231, 236);
        doc.roundedRect(marginX, currentY, boxWidth, summaryBoxHeight, 3, 3, 'FD');

        // Columna 1 del Resumen: Evento y Fecha
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('BODA / EVENTO:', marginX + 5, currentY + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text(weddingTitle, marginX + 5, currentY + 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(110, 110, 110);
        doc.text(`Fecha del evento: ${weddingDateStr}`, marginX + 5, currentY + 19);

        // Columna 2 del Resumen: Total de Menús Especiales
        const col2X = marginX + (boxWidth * 0.52);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('MENÚS ESPECIALES A PREPARAR:', col2X, currentY + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(190, 50, 40); // Rojo suave para llamar la atención del chef
        doc.text(`${totalMenus} ${totalMenus === 1 ? 'menú especial' : 'menús especiales'}`, col2X, currentY + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`Mesas: ${totalSeated} ubicados · ${totalUnseated} sin mesa asignada`, col2X, currentY + 19);

        return currentY + summaryBoxHeight + 8;
    };

    const startTableY = drawHeader();

    // 4. Preparar datos para jspdf-autotable
    const tableHeaders = [
        ['#', 'Invitado / Comensal', 'Mesa', 'Alergias / Restricciones para Cocina', 'Estado']
    ];

    const tableRows = sortedGuests.map((g, index) => {
        const guestName = (g.nombre || 'Invitado').trim();
        const groupInfo = g.group ? `\n(${g.group})` : '';
        const tableName = getTableName(g.tableId);
        const allergyText = (g.alergias || 'No especificado').trim();
        const statusText = g.alergiasStatus === 'approved'
            ? 'Aprobado'
            : g.alergiasStatus === 'pending' || !g.alergiasStatus
                ? 'Pendiente'
                : 'Revisar';

        return [
            String(index + 1),
            `${guestName}${groupInfo}`,
            tableName,
            allergyText,
            statusText
        ];
    });

    // Caso de lista vacía
    if (tableRows.length === 0) {
        tableRows.push(['-', 'No hay comensales registrados con alergias o menús especiales.', '-', '-', '-']);
    }

    // 5. Renderizar la tabla con autoTable
    autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: startTableY,
        margin: { left: marginX, right: marginX, bottom: 20 },
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            textColor: [45, 50, 60],
            lineColor: [225, 229, 235],
            lineWidth: 0.2,
            cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
            valign: 'middle',
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [35, 39, 47], // Antracita elegante
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
            halign: 'left'
        },
        alternateRowStyles: {
            fillColor: [252, 252, 253]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10, fontStyle: 'bold', textColor: [120, 120, 120] }, // #
            1: { cellWidth: 46, fontStyle: 'bold', textColor: [25, 25, 25] }, // Invitado
            2: { halign: 'center', cellWidth: 32, fontStyle: 'bold', textColor: [70, 75, 85] }, // Mesa
            3: { cellWidth: 'auto', textColor: [175, 40, 40], fontStyle: 'bold' }, // Alergias / Menú (destacado en rojo/granate)
            4: { halign: 'center', cellWidth: 22, textColor: [100, 100, 100], fontSize: 8 } // Estado
        },
        didDrawPage: (data) => {
            // Pie de página en todas las hojas
            const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
            const totalPages = doc.internal.getNumberOfPages();

            doc.setDrawColor(220, 220, 225);
            doc.setLineWidth(0.3);
            doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(140, 140, 140);
            doc.text('El Convite · Documento confidencial para servicio de catering y cocina', marginX, pageHeight - 7);

            const pageStr = `Página ${pageNumber} de ${totalPages}`;
            doc.text(pageStr, pageWidth - marginX, pageHeight - 7, { align: 'right' });
        }
    });

    // 6. Descargar el archivo PDF en el navegador
    const safeTitle = weddingTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `Catering_Menus_Especiales_${safeTitle}_${dateStamp}.pdf`;

    doc.save(fileName);
}

