import * as XLSX from "xlsx";
import { calculateMasterBoqRate, getResourceRate, getSelectedRate } from "../engines/calculationEngine";

export function exportProjectExcel(project, renderedProjectBoq, masterBoqs, resources) {
    if (!project || !renderedProjectBoq) return;

    const wb = XLSX.utils.book_new();
    let totalAmount = 0;

    // Parse selected brands from project actualResources
    let selectedBrands = {};
    let actualRes = project.actualResources;
    if (typeof actualRes === 'string') {
        try { actualRes = JSON.parse(actualRes); } catch { }
    }
    if (actualRes) {
        Object.entries(actualRes).forEach(([k, v]) => {
            if (k.startsWith('brand_')) {
                // key is brand_phase_resourceId
                const parts = k.substring(6).split('_');
                const resourceId = parts[parts.length - 1];
                selectedBrands[resourceId] = v;
            }
        });
    }

    // 1. GENERATE BOQ SHEET
    const boqData = renderedProjectBoq.map(item => {
        totalAmount += item.amount || 0;

        return {
            "SL.No": item.slNo,
            "Item Code": item.displayCode || "-",
            "Item Description": item.displayDesc || "Unknown Item",
            "Quantity": Number(item.computedQty || 0).toFixed(2),
            "Unit": item.displayUnit || "-",
            "Rate": Number(item.rate || 0).toFixed(2),
            "Amount": Number(item.amount || 0).toFixed(2)
        };
    });

    boqData.push({ 
        "SL.No": "", "Item Code": "", "Item Description": "GRAND TOTAL", 
        "Quantity": "", "Unit": "", "Rate": "", "Amount": totalAmount.toFixed(2) 
    });
    
    const wsBoq = XLSX.utils.json_to_sheet(boqData);
    XLSX.utils.book_append_sheet(wb, wsBoq, "BOQ");

    // 2. GENERATE MEASUREMENT BOOK SHEET
    const mbookRows = [["SL.No", "Item Description", "Measurement Details", "No.", "L", "B", "D/H", "Quantity", "Unit"]];

    renderedProjectBoq.forEach(item => {
        // Header Row for the Item
        mbookRows.push([item.slNo, item.displayDesc, "", "", "", "", "", "", ""]);

        if (item.hasMBook && item.computedMeasurements && item.computedMeasurements.length > 0) {
            item.computedMeasurements.forEach(m => {
                // Use the raw formula string for L/B/D, but use computedQty for the result
                mbookRows.push([
                    "", "", 
                    m.details || "", 
                    m.no || "", 
                    m.l || "", 
                    m.b || "", 
                    m.d || "", 
                    Number(m.computedQty || 0).toFixed(2), 
                    item.displayUnit || ""
                ]);
            });
            mbookRows.push(["", "", "", "", "", "", "TOTAL:", Number(item.computedQty || 0).toFixed(2), item.displayUnit || ""]);
        } else {
            // If there's no M-Book, show the formula string (if any) and the computed total
            const formulaDisplay = String(item.formulaStr || "").startsWith("=") ? `Formula: ${item.formulaStr}` : "Manual Entry";
            mbookRows.push(["", "", formulaDisplay, "", "", "", "", Number(item.computedQty || 0).toFixed(2), item.displayUnit || ""]);
        }
        mbookRows.push([]); // Empty row for spacing
    });

    const wsMBook = XLSX.utils.aoa_to_sheet(mbookRows);
    XLSX.utils.book_append_sheet(wb, wsMBook, "Measurement Book");

    // 3. GENERATE RATE ANALYSIS SHEETS
    renderedProjectBoq.forEach(item => {
        if (item.isCustom) return; // Skip rate analysis for custom ad-hoc items
        if (!item.masterBoq || !item.masterBoq.components) return;

        let baseCost = 0;
        const rows = [["Type", "Code", "Description", "Unit", "Quantity", "Rate", "Amount"]];

        item.masterBoq.components.forEach(comp => {
            const compQty = Number(comp.computedQty !== undefined ? comp.computedQty : comp.qty) || 0;

            if (comp.itemType === 'resource') {
                const res = resources.find(r => r.id === comp.itemId);
                if (!res) return;
                const brandName = selectedBrands[res.id];
                const rate = getSelectedRate(res, brandName, project.region);
                const amt = compQty * rate; 
                baseCost += amt;
                rows.push(["Resource", res.code, res.description, res.unit, compQty, rate.toFixed(2), amt.toFixed(2)]);
            }
            else if (comp.itemType === 'boq') {
                const nestedBoq = masterBoqs.find(b => b.id === comp.itemId);
                if (!nestedBoq) return;
                const rate = calculateMasterBoqRate(nestedBoq, resources, masterBoqs, project.region, new Set(), project);
                const amt = compQty * rate; 
                baseCost += amt;
                rows.push(["Sub-Item", nestedBoq.itemCode, nestedBoq.description, nestedBoq.unit, compQty, rate.toFixed(2), amt.toFixed(2)]);
            }
        });

        const ohAmt = baseCost * ((item.masterBoq.overhead || 0) / 100);
        const profitAmt = baseCost * ((item.masterBoq.profit || 0) / 100);
        const finalRate = baseCost + ohAmt + profitAmt;

        rows.push([]);
        rows.push(["", "", "", "", "", "Base Cost:", baseCost.toFixed(2)]);
        rows.push(["", "", "", "", "", `Overhead (${item.masterBoq.overhead || 0}%)`, ohAmt.toFixed(2)]);
        rows.push(["", "", "", "", "", `Profit (${item.masterBoq.profit || 0}%)`, profitAmt.toFixed(2)]);
        rows.push(["", "", "", "", "", "Final Unit Rate:", finalRate.toFixed(2)]);

        // Keep sheet names short (Excel allows max 31 chars)
        const sheetName = `Analysis_SL_${item.slNo}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
    });

    // Write file
    XLSX.writeFile(wb, `${project.code || 'Project'}_Estimate.xlsx`);
}