export function calcRowQty(row, unit) {
    // Default missing inputs to 1 for multiplication purposes, or 0 if 'no' is missing
    const n = Number(row.no) || 1;
    const l = row.l !== "" && row.l !== undefined ? Number(row.l) : 1;
    const b = row.b !== "" && row.b !== undefined ? Number(row.b) : 1;
    const d = row.d !== "" && row.d !== undefined ? Number(row.d) : 1;

    const u = (unit || "").toLowerCase();

    // Smart calculation based on Unit Type
    if (u.includes("cum") || u === "m3" || u === "m³") return n * l * b * d;
    if (u.includes("sqm") || u === "m2" || u === "m²") return n * l * b;
    if (u.includes("rm") || u === "m" || u === "r.m") return n * l;
    if (u.includes("nos") || u === "each") return n;

    return n * l * b * d; // Fallback to full volume
}

export function calcTotalQty(measurements) {
    return (measurements || []).reduce((sum, m) => sum + (Number(m.qty) || 0), 0);
}