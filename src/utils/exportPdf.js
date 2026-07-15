import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * HELPER: Get Image Aspect Ratio to prevent squishing
 */
const getImageAspectRatio = (base64) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width / img.height);
        img.onerror = () => resolve(1); // Default to square if it fails to load
        img.src = base64;
    });
};

/**
 * 🔥 HELPER: Bulletproof Right-Alignment for ALL jsPDF versions
 * Passes the alignment flag in both the v2 (Options Object) and v1 (Parameter 6) slots.
 */
const printRightText = (doc, text, y, rightMargin = 14) => {
    // Safely get width regardless of jsPDF version
    const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width;
    const x = pageWidth - rightMargin;

    // Parameter 4: { align: 'right' } covers jsPDF v2.x.x
    // Parameter 6: 'right' covers jsPDF v1.x.x
    doc.text(String(text), x, y, { align: 'right' }, null, 'right');
};

/**
 * REUSABLE BRANDING HEADER
 */
const drawHeader = async (doc, company, title) => {
    const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width;
    const margin = 14;

    let logoBottomY = 10;

    // 1. Draw Company Logo 
    if (company?.logo) {
        try {
            const ratio = await getImageAspectRatio(company.logo);

            const maxHeight = 35;
            const maxWidth = 70;

            let imgWidth = maxHeight;
            let imgHeight = maxHeight;

            if (ratio > 1) {
                imgWidth = Math.min(maxWidth, maxHeight * ratio);
                imgHeight = imgWidth / ratio;
            } else {
                imgHeight = maxHeight;
                imgWidth = maxHeight * ratio;
            }

            const yOffset = 10;
            doc.addImage(company.logo, 'PNG', margin, yOffset, imgWidth, imgHeight);
            logoBottomY = yOffset + imgHeight;
        } catch (e) {
            console.error("PDF Logo Error:", e);
        }
    }

    // 2. Draw Company Info (Top Right)
    doc.setTextColor(11, 23, 45);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    printRightText(doc, company?.name || 'OPENPRIX CONSTRUCTIONS', 16, margin);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const address = company?.address || "Registered Office Address Not Set";
    const contactInfo = `Email: ${company?.email || '-'} | Ph: ${company?.phone || '-'}`;
    const taxInfo = `GSTIN/TAX ID: ${company?.taxId || 'N/A'}`;

    // Dynamic Height Calculation for Address
    const addressLines = doc.splitTextToSize(address, 100);
    let currentY = 21;
    addressLines.forEach(line => {
        printRightText(doc, line, currentY, margin);
        currentY += 3.5;
    });

    const contactY = currentY + 1;
    const taxY = contactY + 4;

    printRightText(doc, contactInfo, contactY, margin);
    printRightText(doc, taxInfo, taxY, margin);

    // 3. Branding Separator Line 
    const lineY = Math.max(logoBottomY + 4, taxY + 4, 38);

    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    // 4. Report Title
    doc.setFontSize(18);
    doc.setTextColor(11, 23, 45);
    doc.setFont(undefined, 'bold');
    doc.text(title.toUpperCase(), margin, lineY + 10);

    return lineY + 14;
};

/**
 * 01. EXPORT PROJECT ESTIMATE REPORT
 */
export const exportProjectPdf = async (project, boqItems, totalAmount) => {
    const company = await window.api.db.getSettings('company_info');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const startY = await drawHeader(doc, company, `Project Estimate: ${project.name}`);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    doc.text(`Code: ${project.code || 'N/A'}  |  Client: ${project.clientName || 'N/A'}`, 14, startY + 2);

    // Note: Standard PDF fonts do not support the ₹ symbol. If standard fonts are used, 
    // it's safer to map ₹ to "Rs." for the PDF export to prevent rendering bugs.
    let symbol = company?.currencySymbol || "Rs.";
    if (symbol === '₹') symbol = 'Rs.';

    autoTable(doc, {
        head: [["Sl No", "Item Code", "Description", "Unit", "Total Qty", `Rate (${symbol})`, `Amount (${symbol})`]],
        body: boqItems.map(i => [i.slNo, i.displayCode || '-', i.displayDesc, i.displayUnit, Number(i.computedQty).toFixed(2), Number(i.rate).toFixed(2), Number(i.amount).toFixed(2)]),
        startY: startY + 8,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        headStyles: { fillColor: [13, 31, 60] },
        columnStyles: { 0: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
    });

    // 🔥 Totals explicitly rendered BELOW the table and Right-Aligned
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);

    const totalText = `Estimated Total: ${symbol} ${totalAmount.toLocaleString(company?.currencyLocale || 'en-IN')}`;
    printRightText(doc, totalText, finalY, 14);

    doc.save(`${project.code || 'Project'}_Estimate.pdf`);
};

/**
 * 02. EXPORT RA BILL (INVOICE)
 */
export const exportRaBillPdf = async (project, bill, boqItems) => {
    const company = await window.api.db.getSettings('company_info');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const startY = await drawHeader(doc, company, `RA Bill: ${bill.billNo}`);

    let symbol = company?.currencySymbol || "Rs.";
    if (symbol === '₹') symbol = 'Rs.';

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Project: ${project.name} (${project.code})  |  Date: ${bill.date}`, 14, startY + 2);

    autoTable(doc, {
        head: [["Sl No", "Description", "Unit", `Rate (${symbol})`, "Prev Qty", "Curr Qty", `Amount (${symbol})`]],
        body: bill.items.map((item, idx) => {
            const boq = boqItems.find(b => b.id === item.boqId) || {};
            return [idx + 1, boq.displayDesc, boq.displayUnit, Number(item.rate).toFixed(2), Number(item.prevQty).toFixed(2), Number(item.currentQty).toFixed(2), Number(item.amount).toFixed(2)];
        }),
        startY: startY + 8,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        headStyles: { fillColor: [13, 31, 60] },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }, 6: { halign: 'right', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // 🔥 Totals explicitly rendered BELOW the table and Right-Aligned
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, 'normal');

    const subText = `Subtotal: ${symbol} ${bill.subTotal.toLocaleString(company?.currencyLocale || 'en-IN')}`;
    printRightText(doc, subText, finalY, 14);

    const taxText = `Tax (${bill.taxPercent}%): ${symbol} ${bill.taxAmount.toLocaleString(company?.currencyLocale || 'en-IN')}`;
    printRightText(doc, taxText, finalY + 6, 14);

    doc.setFontSize(12);
    doc.setTextColor(13, 31, 60);
    doc.setFont(undefined, 'bold');

    const grandText = `Grand Total: ${symbol} ${bill.grandTotal.toLocaleString(company?.currencyLocale || 'en-IN')}`;
    printRightText(doc, grandText, finalY + 14, 14);

    doc.save(`${project.code}_${bill.billNo}.pdf`);
};

/**
 * 03. EXPORT PURCHASE ORDER
 */
export const exportPoPdf = async (project, po) => {
    const company = await window.api.db.getSettings('company_info');
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const startY = await drawHeader(doc, company, `Purchase Order: ${po.poNumber}`);

    let symbol = company?.currencySymbol || "Rs.";
    if (symbol === '₹') symbol = 'Rs.';

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("VENDOR / SUPPLIER:", 14, startY + 5);
    doc.text("SHIP TO SITE:", 110, startY + 5);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(po.supplierName || 'N/A', 14, startY + 10);
    doc.text(`${project.name}\n${project.region || ''}`, 110, startY + 10);

    autoTable(doc, {
        head: [["Sl No", "Code", "Description", "Unit", "Qty", `Rate (${symbol})`, `Amount (${symbol})`]],
        body: po.items.map((item, idx) => [idx + 1, item.code, item.description, item.unit, Number(item.qty).toFixed(2), Number(item.rate).toFixed(2), Number(item.amount).toFixed(2)]),
        startY: startY + 25,
        margin: { left: 14, right: 14 },
        theme: 'grid',
        headStyles: { fillColor: [13, 31, 60] },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // 🔥 Totals explicitly rendered BELOW the table and Right-Aligned
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 23, 45);

    const totalText = `TOTAL PAYABLE: ${symbol} ${po.grandTotal.toLocaleString(company?.currencyLocale || 'en-IN')}`;
    printRightText(doc, totalText, finalY + 5, 14);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont(undefined, 'normal');
    doc.text("Terms: 1. Subject to verification. 2. Quality check required. 3. System generated.", 14, finalY + 20);

    doc.save(`${project.code}_PO_${po.poNumber}.pdf`);
};

/**
 * 04. EXPORT RESOURCE TRACKER REPORT
 */
export const exportResourceTrackerPdf = async (project, resourceTracker, selectedRegion, selectedBrands, customRates, getSelectedRate) => {
    const company = await window.api.db.getSettings('company_info');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const startY = await drawHeader(doc, company, `Resource Tracker: ${project.name}`);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, 'normal');
    doc.text(`Code: ${project.code || 'N/A'}  |  Client: ${project.clientName || 'N/A'}`, 14, startY + 2);

    let symbol = company?.currencySymbol || "Rs.";
    if (symbol === '₹') symbol = 'Rs.';

    let currentY = startY + 8;

    for (const [phase, phaseData] of Object.entries(resourceTracker)) {
        // Phase title
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(13, 31, 60);
        doc.text(`PHASE: ${phase.toUpperCase()}`, 14, currentY);

        let totalEstQty = 0;
        let totalActQty = 0;
        let totalEstCost = 0;
        let totalActCost = 0;

        const tableBody = Object.entries(phaseData).map(([resId, data]) => {
            const resourceObj = data.resourceData;
            const selectedBrand = selectedBrands[`${phase}_${resId}`] || "General";
            const activeRegionName = selectedRegion || project?.region || "";
            const baseRate = getSelectedRate(resourceObj, selectedBrands[`${phase}_${resId}`] || "", activeRegionName);
            
            // Apply custom project-level rate override if it exists
            const rate = customRates[`${phase}_${resId}`] !== undefined ? customRates[`${phase}_${resId}`] : baseRate;
            
            const variance = data.estimatedQty - data.actualQty;
            const estCost = data.estimatedQty * rate;
            const actualCost = data.actualQty * rate;

            totalEstQty += Number(data.estimatedQty) || 0;
            totalActQty += Number(data.actualQty) || 0;
            totalEstCost += Number(estCost) || 0;
            totalActCost += Number(actualCost) || 0;

            return [
                data.code || "-",
                data.description || "",
                data.unit || "-",
                selectedBrand,
                Number(rate).toFixed(2),
                Number(data.estimatedQty).toFixed(2),
                Number(data.actualQty).toFixed(2),
                (variance > 0 ? "+" : "") + Number(variance).toFixed(2),
                Number(estCost).toFixed(2),
                Number(actualCost).toFixed(2)
            ];
        });

        const totalVariance = totalEstQty - totalActQty;

        // Append total row
        tableBody.push([
            "",
            "TOTAL",
            "",
            "",
            "",
            totalEstQty.toFixed(2),
            totalActQty.toFixed(2),
            (totalVariance > 0 ? "+" : "") + totalVariance.toFixed(2),
            totalEstCost.toFixed(2),
            totalActCost.toFixed(2)
        ]);

        autoTable(doc, {
            head: [["Code", "Description", "Unit", "Brand", `Rate (${symbol})`, "Est Qty", "Act Qty", "Variance", `Est Cost (${symbol})`, `Act Cost (${symbol})`]],
            body: tableBody,
            startY: currentY + 3,
            margin: { left: 14, right: 14 },
            theme: 'grid',
            headStyles: { fillColor: [13, 31, 60], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 50 },
                2: { cellWidth: 15 },
                3: { cellWidth: 25 },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right' },
                8: { halign: 'right' },
                9: { halign: 'right' }
            },
            didParseCell: function (data) {
                // If it is the last row (TOTAL row), make it bold
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [16, 185, 129]; // Make totals stand out in green
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 10;
    }

    doc.save(`${project.code || 'Project'}_ResourceTracker.pdf`);
};