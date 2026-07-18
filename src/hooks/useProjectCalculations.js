import { useMemo } from "react";
import { calculateMasterBoqRate } from "../engines/calculationEngine";

export function useProjectCalculations(projectBoqItems, masterBoqs, resources, project) {

    const computeQty = (formulaStr, currentItems, currentItemSlNo = null, currentMeasurements = [], currentRowPartial = null) => {
        if (!formulaStr) return 0;
        const str = String(formulaStr).trim().toLowerCase();
        if (str === "") return 0;
        if (!str.startsWith('=')) { const num = Number(str); return isNaN(num) ? 0 : num; }

        let expr = str.substring(1).replace(/\b(ceil|floor|round|abs|max|min|pi|sqrt)\b/g, "Math.$1");

        // 🔥 FIX 1: Process the Cross-References (#) FIRST so the string isn't corrupted
        expr = expr.replace(/#(\d+)(?:\.(\d+))?(?:\.([a-z]+))?/g, (match, slNoStr, rowStr, prop) => {
            const slNo = parseInt(slNoStr, 10);
            const rowIndex = rowStr ? parseInt(rowStr, 10) - 1 : 0;
            const property = prop || 'qty';

            if (slNo === currentItemSlNo && currentRowPartial && rowIndex === currentMeasurements.length) {
                if (property === 'no') return currentRowPartial.computedNo || 0;
                if (property === 'l') return currentRowPartial.computedL || 0;
                if (property === 'b') return currentRowPartial.computedB || 0;
                if (property === 'd' || property === 'h') return currentRowPartial.computedD || 0;
            }

            let targetItem, targetMeasurements;
            if (slNo === currentItemSlNo) {
                targetMeasurements = currentMeasurements;
                if (property === 'qty' && !rowStr) return currentMeasurements.reduce((sum, m) => sum + (m.computedQty || 0), 0);
            } else {
                targetItem = currentItems.find(i => i.slNo === slNo);
                if (!targetItem) return 0;
                targetMeasurements = targetItem.computedMeasurements || [];
                if (property === 'qty' && !rowStr) return targetItem.computedQty || 0;
            }

            const m = targetMeasurements[rowIndex];
            if (!m) return 0;
            if (property === 'l') return m.computedL || 0;
            if (property === 'b') return m.computedB || 0;
            if (property === 'd' || property === 'h') return m.computedD || 0;
            if (property === 'no') return m.computedNo || 0;
            if (property === 'qty') return m.computedQty || 0;
            return 0;
        });

        // 🔥 FIX 2: Process the Current Row Partials (l, b, d, no) SECOND
        if (currentRowPartial) {
            expr = expr.replace(/\b(no)\b/g, currentRowPartial.computedNo || 0);
            expr = expr.replace(/\b(l)\b/g, currentRowPartial.computedL || 0);
            expr = expr.replace(/\b(b)\b/g, currentRowPartial.computedB || 0);
            expr = expr.replace(/\b(d|h)\b/g, currentRowPartial.computedD || 0);
        }

        try { 
            return /[^0-9+\-*/().\seE]/.test(expr) ? 0 : (isFinite(new Function(`return ${expr}`)()) ? new Function(`return ${expr}`)() : 0); 
        } catch { 
            return 0; 
        }
    };

    const context = useMemo(() => {
        const resourceMap = new Map();
        resources?.forEach(r => resourceMap.set(String(r.id), r));
        
        const boqMap = new Map();
        masterBoqs?.forEach(b => boqMap.set(String(b.id), b));
        
        return { resourceMap, boqMap };
    }, [resources, masterBoqs]);

    const { renderedProjectBoq, totalAmount } = useMemo(() => {
        let total = 0;
        const sortedItems = [...projectBoqItems].sort((a, b) => a.slNo - b.slNo);
        const computedItems = [];

        for (const item of sortedItems) {
            let rate = 0, amount = 0, displayCode = "", displayDesc = "", displayUnit = "";
            let masterBoq = null;

            if (item.isCustom) {
                rate = Number(item.rate) || 0; 
                displayCode = item.itemCode || "";
                displayDesc = item.description || "";
                displayUnit = item.unit || "";
            } else {
                masterBoq = context.boqMap.get(String(item.masterBoqId));
                if (masterBoq) {
                    if (project?.isPriceLocked && item.lockedRate !== null && item.lockedRate !== undefined) { 
                        rate = Number(item.lockedRate) || 0; 
                    } else { 
                        const calculatedRate = calculateMasterBoqRate(masterBoq, resources, masterBoqs, project?.region, new Set(), project, context);
                        rate = Number(calculatedRate) || Number(item.rate) || 0; 
                    }
                    displayCode = masterBoq.itemCode || "";
                    displayDesc = masterBoq.description || "";
                    displayUnit = masterBoq.unit || "";
                } else {
                    rate = Number(item.rate) || 0;
                    displayCode = item.itemCode || "N/A";
                    displayDesc = item.description || "Master Item Missing";
                    displayUnit = item.unit || "-";
                }
            }

            const hasMBook = item.measurements && item.measurements.length > 0;
            let computedQty = 0;
            let computedMeasurements = [];

            if (hasMBook) {
                let mbookTotal = 0;
                const u = (displayUnit || "").toLowerCase();
                for (let i = 0; i < item.measurements.length; i++) {
                    const m = item.measurements[i];
                    let partial = { computedNo: 1, computedL: 1, computedB: 1, computedD: 1 };

                    const cNo = (m.no === "" || m.no === undefined) ? 1 : computeQty(m.no, computedItems, item.slNo, computedMeasurements, partial);
                    partial.computedNo = cNo; 
                    const cL = (m.l === "" || m.l === undefined) ? 1 : computeQty(m.l, computedItems, item.slNo, computedMeasurements, partial);
                    partial.computedL = cL; 
                    const cB = (m.b === "" || m.b === undefined) ? 1 : computeQty(m.b, computedItems, item.slNo, computedMeasurements, partial);
                    partial.computedB = cB; 
                    const cD = (m.d === "" || m.d === undefined) ? 1 : computeQty(m.d, computedItems, item.slNo, computedMeasurements, partial);
                    partial.computedD = cD; 

                    let rowQty = 0;
                    if (u.includes("cum") || u === "m3" || u === "m³") rowQty = cNo * cL * cB * cD;
                    else if (u.includes("sqm") || u === "m2" || u === "m²") rowQty = cNo * cL * cB;
                    else if (u.includes("rm") || u === "m" || u === "r.m") rowQty = cNo * cL;
                    else if (u.includes("nos") || u === "each") rowQty = cNo;
                    else rowQty = cNo * cL * cB * cD;

                    mbookTotal += rowQty;
                    computedMeasurements.push({ ...m, computedNo: cNo, computedL: cL, computedB: cB, computedD: cD, computedQty: rowQty });
                }
                computedQty = mbookTotal;
            } else {
                computedQty = computeQty(item.formulaStr !== undefined ? item.formulaStr : item.qty, computedItems, item.slNo, []);
            }

            amount = (Number(computedQty) || 0) * rate;
            total += amount;
            
            computedItems.push({ ...item, computedQty, computedMeasurements, rate, amount, displayCode, displayDesc, displayUnit, masterBoq, hasMBook });
        }
        
        return { renderedProjectBoq: computedItems, totalAmount: total };
    }, [projectBoqItems, masterBoqs, resources, project?.region, project?.isPriceLocked, context]);

    const projectResourceMap = useMemo(() => {
        const map = {};
        renderedProjectBoq.forEach(item => {
            if (item.isCustom) return;
            const master = context.boqMap.get(String(item.masterBoqId));
            if (!master || !master.components) return;
            master.components.forEach(comp => {
                if (comp.itemType === 'resource') {
                    const res = context.resourceMap.get(String(comp.itemId));
                    if (!res) return;
                    if (!map[res.id]) map[res.id] = { code: res.code, description: res.description, unit: res.unit, estimatedQty: 0 };
                    
                    const compQty = Number(comp.qty) || 0;
                    map[res.id].estimatedQty += (compQty * (item.computedQty || 0));
                }
            });
        });
        return map;
    }, [renderedProjectBoq, masterBoqs, resources, context]);

    return { renderedProjectBoq, totalAmount, projectResourceMap };
}