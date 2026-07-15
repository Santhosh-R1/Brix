// Calculate selected rate (brand or region-wise general rate)
export function getSelectedRate(resource, brandName, regionName) {
    if (!resource) return 0;
    let ratesObj = resource.rates;
    if (typeof ratesObj === 'string') {
        try { ratesObj = JSON.parse(ratesObj); } catch { return 0; }
    }

    if (brandName) {
        const history = ratesObj.brandRatesHistory || {};
        const sortedMonths = Object.keys(history).sort().reverse();
        for (const month of sortedMonths) {
            const monthData = history[month];
            if (Array.isArray(monthData)) {
                const brandData = monthData.find(b => b.brand === brandName);
                if (brandData) {
                    if (regionName && brandData[regionName] !== undefined && brandData[regionName] !== "") {
                        const rate = Number(brandData[regionName]);
                        if (rate > 0) return rate;
                    }
                    const availableBrandRates = Object.entries(brandData)
                        .filter(([k, v]) => k !== 'brand' && !isNaN(Number(v)) && Number(v) > 0)
                        .map(([k, v]) => Number(v));
                    if (availableBrandRates.length > 0) return availableBrandRates[0];
                }
            }
        }
    }

    return getResourceRate(resource, regionName);
}

export function getResourceRate(resource, regionName) {
    if (!resource || !resource.rates) return 0;

    // Force rates to be an object
    let ratesObj = resource.rates;
    if (typeof ratesObj === 'string') {
        try { ratesObj = JSON.parse(ratesObj); } catch { return 0; }
    }

    // Try Exact Match
    if (regionName && ratesObj[regionName] !== undefined) {
        const rate = Number(ratesObj[regionName]);
        if (rate > 0) return rate;
    }

    // Try Case-Insensitive Match
    if (regionName) {
        const normalizedRegion = String(regionName).toLowerCase().trim();
        for (const [key, value] of Object.entries(ratesObj)) {
            if (String(key).toLowerCase().trim() === normalizedRegion) {
                const rate = Number(value);
                if (rate > 0) return rate;
            }
        }
    }

    // Ultimate Fallback: Return the first available price
    const availableRates = Object.values(ratesObj)
        .map(r => Number(r))
        .filter(r => !isNaN(r) && r > 0);
        
    return availableRates.length > 0 ? availableRates[0] : 0;
}

// 🔥 UPGRADED: Now processes formulas chronologically like the UI Editor!
export function calculateMasterBoqRate(masterBoq, allResources, allMasterBoqs, regionName, visited = new Set(), project = null, context = null) {
    if (!masterBoq || !masterBoq.components) return 0;

    let components = masterBoq.components;
    if (typeof components === 'string') {
        try { components = JSON.parse(components); } catch { return 0; }
    }
    if (!Array.isArray(components)) return 0;

    // Safety check to prevent infinite loops in nested BOQs
    if (visited.has(masterBoq.id)) return 0;
    visited.add(masterBoq.id);

    // Extract selected brands from project actualResources
    let selectedBrands = {};
    let customRates = {};
    if (project) {
        let actualRes = project.actualResources;
        if (typeof actualRes === 'string') {
            try { actualRes = JSON.parse(actualRes); } catch { }
        }
        if (actualRes) {
            Object.entries(actualRes).forEach(([k, v]) => {
                if (k.startsWith('brand_')) {
                    const parts = k.substring(6).split('_');
                    const resourceId = parts[parts.length - 1];
                    selectedBrands[resourceId] = v;
                } else if (k.startsWith('rate_')) {
                    const parts = k.substring(5).split('_');
                    const resourceId = parts[parts.length - 1];
                    customRates[resourceId] = Number(v);
                }
            });
        }
    }

    let computedRows = [];
    let baseCost = 0;

    // Calculate chronologically so Row 2 can reference Row 1
    for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        
        let computedQty = 0;
        const formula = comp.formulaStr !== undefined ? comp.formulaStr : comp.qty;
        
        if (!formula) {
            computedQty = 0;
        } else {
            const str = String(formula).trim().toLowerCase();
            if (!str.startsWith('=')) {
                computedQty = Number(str) || 0;
            } else {
                let expr = str.substring(1).replace(/\b(ceil|floor|round|abs|max|min|pi|sqrt)\b/g, "Math.$1");
                
                // 🔥 THE FIX: Look back at previously computed rows for #1, #2 references
                expr = expr.replace(/#(\d+)/g, (match, slNoStr) => {
                    const idx = parseInt(slNoStr, 10) - 1;
                    return computedRows[idx] ? (computedRows[idx].computedQty || 0) : 0;
                });
                
                try { 
                    computedQty = /[^0-9+\-*/().\seE]/.test(expr) ? 0 : (isFinite(new Function(`return ${expr}`)()) ? new Function(`return ${expr}`)() : 0); 
                } catch { 
                    computedQty = 0; 
                }
            }
        }

        if (computedQty !== 0) {
            let rate = 0;
            if (comp.itemType === 'resource') {
                const resource = context?.resourceMap ? context.resourceMap.get(String(comp.itemId)) : allResources.find(r => String(r.id) === String(comp.itemId));
                if (resource && customRates[resource.id] !== undefined) {
                    rate = customRates[resource.id];
                } else {
                    const brandName = resource ? selectedBrands[resource.id] : null;
                    rate = getSelectedRate(resource, brandName, regionName);
                }
            } else if (comp.itemType === 'boq') {
                const nestedBoq = context?.boqMap ? context.boqMap.get(String(comp.itemId)) : allMasterBoqs.find(b => String(b.id) === String(comp.itemId));
                rate = calculateMasterBoqRate(nestedBoq, allResources, allMasterBoqs, regionName, new Set(visited), project, context);
            }

            const amount = computedQty * rate;
            baseCost += amount;
            
            // Store the result so the next row can reference it!
            computedRows.push({ ...comp, computedQty, rate, amount });
        } else {
            // Push a zero-row to maintain the # index order
            computedRows.push({ ...comp, computedQty: 0, rate: 0, amount: 0 });
        }
    }

    const ohPercent = Number(masterBoq.overhead) || 0;
    const profitPercent = Number(masterBoq.profit) || 0;
    return baseCost * (1 + ohPercent / 100 + profitPercent / 100);
}