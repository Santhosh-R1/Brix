import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, MenuItem, Button, Alert, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Paper } from "@mui/material";
import { getResourceRate, calculateMasterBoqRate } from "../../engines/calculationEngine";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { tableInputActiveStyle } from "../../styles";

import { useSettings } from "../../context/SettingsContext";

export default function MasterBoqEditor({ editorItem, onClose, onSaveSuccess, project, regions, resources, masterBoqs, setFormulaHelpOpen }) {

    const { formatCurrency } = useSettings();

    const [isCustom, setIsCustom] = useState(false);

    const [editCustomCode, setEditCustomCode] = useState("");
    const [editCustomDesc, setEditCustomDesc] = useState("");
    const [editCustomUnit, setEditCustomUnit] = useState("");
    const [editCustomRate, setEditCustomRate] = useState("");

    const [editBoqCode, setEditBoqCode] = useState("");
    const [editBoqDesc, setEditBoqDesc] = useState("");
    const [editBoqUnit, setEditBoqUnit] = useState("cum");
    const [editBoqOH, setEditBoqOH] = useState(15);
    const [editBoqProfit, setEditBoqProfit] = useState(15);
    const [editPreviewRegion, setEditPreviewRegion] = useState("");
    const [editBoqRows, setEditBoqRows] = useState([]);
    const [focusedQtyId, setFocusedQtyId] = useState(null);

    const [localRows, setLocalRows] = useState({});

    useEffect(() => {
        if (!editorItem) return;

        if (editorItem.isCustom) {
            setIsCustom(true);
            setEditCustomCode(editorItem.itemCode || "");
            setEditCustomDesc(editorItem.description || "");
            setEditCustomUnit(editorItem.unit || "cum");
            setEditCustomRate(editorItem.rate || 0);
        } else {
            setIsCustom(false);
            const master = masterBoqs.find(m => m.id === editorItem.masterBoqId);
            if (!master) {
                alert("Master Databook Item not found.");
                onClose();
                return;
            }
            setEditBoqCode(master.itemCode || "");
            setEditBoqDesc(master.description || "");
            setEditBoqUnit(master.unit || "cum");
            setEditBoqOH(master.overhead || 0);
            setEditBoqProfit(master.profit || 0);
            setEditPreviewRegion(project?.region || "");
            setEditBoqRows((master.components || []).map(c => ({
                id: crypto.randomUUID(), itemType: c.itemType || 'resource', itemId: c.itemId, qty: c.qty, formulaStr: c.formulaStr || String(c.qty)
            })));
        }
    }, [editorItem, masterBoqs, project, onClose]);

    const computeMasterQty = (formulaStr, currentRows) => {
        if (!formulaStr) return 0;
        const str = String(formulaStr).trim().toLowerCase();
        if (str === "") return 0;
        if (!str.startsWith('=')) { const num = Number(str); return isNaN(num) ? 0 : num; }
        let expr = str.substring(1).replace(/\b(ceil|floor|round|abs|max|min|pi|sqrt)\b/g, "Math.$1");
        expr = expr.replace(/#(\d+)/g, (match, slNoStr) => {
            const idx = parseInt(slNoStr, 10) - 1;
            return currentRows[idx] ? (currentRows[idx].computedQty || 0) : 0;
        });
        try { return /[^0-9+\-*/().\seE]/.test(expr) ? 0 : (isFinite(new Function(`return ${expr}`)()) ? new Function(`return ${expr}`)() : 0); } catch { return 0; }
    };

    const { editRenderedRows, editSubTotal, editGrandTotal, editOhAmount, editProfitAmount } = useMemo(() => {
        let sub = 0;
        const rows = editBoqRows.map(row => {
            let rate = 0; let unit = "-";
            if (row.itemType === 'resource') { const resource = resources.find(r => r.id === row.itemId); if (resource) { rate = getResourceRate(resource, editPreviewRegion); unit = resource.unit; } }
            else if (row.itemType === 'boq') { const nestedBoq = masterBoqs.find(b => b.id === row.itemId); if (nestedBoq) { rate = calculateMasterBoqRate(nestedBoq, resources, masterBoqs, editPreviewRegion); unit = nestedBoq.unit; } }
            const computedQty = computeMasterQty(row.formulaStr !== undefined ? row.formulaStr : row.qty, editBoqRows);
            const amount = rate * computedQty;
            sub += amount;
            return { ...row, rate, unit, amount, computedQty };
        });
        const oh = sub * (Number(editBoqOH) / 100), prof = sub * (Number(editBoqProfit) / 100);
        return { editRenderedRows: rows, editSubTotal: sub, editOhAmount: oh, editProfitAmount: prof, editGrandTotal: sub + oh + prof };
    }, [editBoqRows, resources, masterBoqs, editPreviewRegion, editBoqOH, editBoqProfit]);

    const convertToMaster = () => {
        setIsCustom(false);
        setEditBoqCode(editCustomCode);
        setEditBoqDesc(editCustomDesc);
        setEditBoqUnit(editCustomUnit);
        setEditBoqOH(15);
        setEditBoqProfit(15);
        setEditBoqRows([]);
    };

    const addEditSpreadsheetRow = () => setEditBoqRows([...editBoqRows, { id: crypto.randomUUID(), itemType: "resource", itemId: "", formulaStr: "1", qty: 1 }]);
    const updateEditSpreadsheetRow = (id, field, value) => setEditBoqRows(editBoqRows.map(row => row.id === id ? { ...row, [field]: value, ...(field === 'itemType' ? { itemId: "", tempCode: undefined, tempDesc: undefined } : {}) } : row));
    const removeEditSpreadsheetRow = (id) => setEditBoqRows(editBoqRows.filter(row => row.id !== id));

    const saveEditedCustomBoq = async () => {
        if (!editCustomDesc || !editCustomRate) { alert("Description and Rate are required."); return; }
        await window.api.db.updateProjectBoq(editorItem.id, { itemCode: editCustomCode, description: editCustomDesc, unit: editCustomUnit, rate: Number(editCustomRate) });
        onSaveSuccess();
    };

    const saveEditedMasterBoq = async (isSaveAsNew = false) => {
        if (!editBoqCode || !editBoqDesc) { alert("Please enter a Code and Description."); return; }
        const validComponents = editRenderedRows.filter(r => r.itemId && r.computedQty !== 0).map(r => ({ itemType: r.itemType, itemId: r.itemId, qty: Number(r.computedQty), formulaStr: r.formulaStr || String(r.computedQty) }));
        if (validComponents.length === 0) { alert("Add at least one valid component to generate a valid rate."); return; }

        const enginePayload = { itemCode: editBoqCode, description: editBoqDesc, unit: editBoqUnit, overhead: Number(editBoqOH), profit: Number(editBoqProfit), components: validComponents };
        const dbPayload = { ...enginePayload, components: JSON.stringify(validComponents) };

        let targetMasterId = editorItem.masterBoqId;

        if (isSaveAsNew || !editorItem.masterBoqId) {
            targetMasterId = crypto.randomUUID();
            const returnedId = await window.api.db.saveMasterBoq(dbPayload, targetMasterId, true);
            if (returnedId) targetMasterId = returnedId;

            let lockedRate = null;
            if (project.isPriceLocked) { lockedRate = calculateMasterBoqRate(enginePayload, resources, masterBoqs, project.region); }

            await window.api.db.updateProjectBoq(editorItem.id, {
                masterBoqId: targetMasterId, isCustom: false, lockedRate: lockedRate, itemCode: "", description: "", unit: "", rate: 0
            });
        } else {
            await window.api.db.saveMasterBoq(dbPayload, targetMasterId, false);
            if (project.isPriceLocked) {
                let lockedRate = calculateMasterBoqRate(enginePayload, resources, masterBoqs, project.region);
                await window.api.db.updateProjectBoq(editorItem.id, { lockedRate: lockedRate });
            }
        }
        onSaveSuccess();
    };

    if (!editorItem) return null;

    return (
        <Dialog open={!!editorItem} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                {isCustom ? "EDIT_CUSTOM_ITEM" : (editorItem.masterBoqId ? "EDIT_DATABOOK_ITEM" : "CONVERT_TO_MASTER_ITEM")}
            </DialogTitle>

            {/* 🔥 FIXED: Reduced horizontal padding on mobile so table can use full screen width */}
            <DialogContent dividers sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)', px: { xs: 1, sm: 3 } }}>
                {isCustom ? (
                    <Box display='flex' flexDirection='column' gap={3}>
                        <Alert severity="info" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>Ad-Hoc items use a fixed flat rate. Convert to a Master Item to calculate based on resources, overhead, and profit.</Alert>
                        <TextField label="CODE" value={editCustomCode} onChange={e => setEditCustomCode(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} />
                        <TextField label="DESCRIPTION" value={editCustomDesc} onChange={e => setEditCustomDesc(e.target.value)} multiline rows={2} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} />
                        <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                            <TextField label="UNIT" value={editCustomUnit} onChange={e => setEditCustomUnit(e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} />
                            <TextField label="FLAT RATE" type="number" value={editCustomRate} onChange={e => setEditCustomRate(e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} />
                        </Box>
                        <Box display="flex" justifyContent="flex-end" mt={2} pt={2} borderTop="1px dashed" borderColor="divider">
                            <Button variant="outlined" color="info" onClick={convertToMaster} startIcon={<AutoFixHighIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>CONVERT_TO_MASTER_DATABOOK_ITEM</Button>
                        </Box>
                    </Box>
                ) : (
                    <>
                        <Box display="flex" gap={{ xs: 2, sm: 3 }} flexDirection={{ xs: 'column', md: 'row' }} mb={4}>
                            <TextField label="ITEM_CODE" value={editBoqCode} onChange={e => setEditBoqCode(e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                            <TextField label="DESCRIPTION" value={editBoqDesc} onChange={e => setEditBoqDesc(e.target.value)} sx={{ flex: 3 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                            <TextField label="UNIT" value={editBoqUnit} onChange={e => setEditBoqUnit(e.target.value)} sx={{ width: { xs: '100%', md: 100 } }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />

                        </Box>

                        {/* 🔥 FIXED: Applied Box inside Alert to stop Flexbox from breaking Alert icon */}
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>💡 <strong>Formula engine:</strong> Use math (<code>= 10 * 2.5</code>) or reference rows (<code>= #1 * 0.45</code>) to automatically calculate mixture ratios.</Typography>
                                <Button variant="outlined" size="small" startIcon={<HelpOutlineIcon />} onClick={() => setFormulaHelpOpen(true)} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>FORMULA_GUIDE</Button>
                            </Box>
                        </Alert>

                        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3, overflowX: 'auto', width: '100%' }}>
                            <Table size="small" sx={{ minWidth: 900 }}>
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                                    <TableRow>
                                        <TableCell sx={{ width: '5%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>SL.NO</TableCell>
                                        <TableCell sx={{ width: '12%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>TYPE</TableCell>
                                        <TableCell sx={{ width: '15%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>CODE_SEARCH</TableCell>
                                        <TableCell sx={{ width: '30%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>DESC_SEARCH</TableCell>
                                        <TableCell sx={{ width: '8%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>UNIT</TableCell>
                                        <TableCell sx={{ width: '10%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>QTY/FORMULA</TableCell>
                                        <TableCell sx={{ width: '10%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>RATE</TableCell>
                                        <TableCell sx={{ width: '10%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>AMOUNT</TableCell>
                                        <TableCell align="center" sx={{ width: '5%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>ACTION</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {editRenderedRows.map((row, idx) => {
                                        const sourceList = row.itemType === 'boq' ? masterBoqs : resources;
                                        const isFocused = focusedQtyId === row.id;
                                        return (
                                            <TableRow key={row.id}>
                                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{idx + 1}</TableCell>
                                                <TableCell><select value={row.itemType} onChange={e => updateEditSpreadsheetRow(row.id, 'itemType', e.target.value)} style={{ ...tableInputActiveStyle, width: '100%' }}><option value="resource">RESOURCE</option><option value="boq">DATABOOK_ITEM</option></select></TableCell>

                                                <TableCell>
                                                    <input
                                                        list={`ws-codes-${row.id}`}
                                                        value={localRows[`${row.id}-code`] !== undefined ? localRows[`${row.id}-code`] : (row.tempCode ?? (sourceList.find(s => s.id === row.itemId)?.code || sourceList.find(s => s.id === row.itemId)?.itemCode || ""))}
                                                        onFocus={() => setLocalRows(prev => ({ ...prev, [`${row.id}-code`]: row.tempCode ?? (sourceList.find(s => s.id === row.itemId)?.code || sourceList.find(s => s.id === row.itemId)?.itemCode || "") }))}
                                                        onBlur={() => {
                                                            const val = localRows[`${row.id}-code`];
                                                            if (val !== undefined) {
                                                                const matched = sourceList.find(s => (s.code || s.itemCode) === val);
                                                                setEditBoqRows(prev => prev.map(r => r.id === row.id ? (matched ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : { ...r, itemId: "", tempCode: val, tempDesc: r.tempDesc }) : r));
                                                            }
                                                        }}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setLocalRows(prev => ({ ...prev, [`${row.id}-code`]: val }));
                                                            const matched = sourceList.find(s => (s.code || s.itemCode) === val);
                                                            if (matched) {
                                                                setEditBoqRows(prev => prev.map(r => r.id === row.id ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : r));
                                                            }
                                                        }}
                                                        style={{ ...tableInputActiveStyle, width: '100%' }}
                                                    />
                                                    <datalist id={`ws-codes-${row.id}`}>{sourceList.filter(s => s.code || s.itemCode).map(s => <option key={s.id} value={s.code || s.itemCode} />)}</datalist>
                                                </TableCell>

                                                <TableCell>
                                                    <input
                                                        list={`ws-descs-${row.id}`}
                                                        value={localRows[`${row.id}-desc`] !== undefined ? localRows[`${row.id}-desc`] : (row.tempDesc ?? (sourceList.find(s => s.id === row.itemId)?.description || ""))}
                                                        onFocus={() => setLocalRows(prev => ({ ...prev, [`${row.id}-desc`]: row.tempDesc ?? (sourceList.find(s => s.id === row.itemId)?.description || "") }))}
                                                        onBlur={() => {
                                                            const val = localRows[`${row.id}-desc`];
                                                            if (val !== undefined) {
                                                                const matched = sourceList.find(s => s.description === val);
                                                                setEditBoqRows(prev => prev.map(r => r.id === row.id ? (matched ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : { ...r, itemId: "", tempCode: r.tempCode, tempDesc: val }) : r));
                                                            }
                                                        }}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setLocalRows(prev => ({ ...prev, [`${row.id}-desc`]: val }));
                                                            const matched = sourceList.find(s => s.description === val);
                                                            if (matched) {
                                                                setEditBoqRows(prev => prev.map(r => r.id === row.id ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : r));
                                                            }
                                                        }}
                                                        style={{ ...tableInputActiveStyle, width: '100%' }}
                                                    />
                                                    <datalist id={`ws-descs-${row.id}`}>{sourceList.filter(s => s.description).map(s => <option key={s.id} value={s.description} />)}</datalist>
                                                </TableCell>

                                                <TableCell color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{row.unit}</TableCell>

                                                <TableCell>
                                                    <input
                                                        type="text"
                                                        value={isFocused ? (localRows[`${row.id}-qty`] !== undefined ? localRows[`${row.id}-qty`] : (row.formulaStr ?? row.qty ?? "")) : ((row.formulaStr === "" || row.formulaStr === undefined) ? "" : Number(row.computedQty || 0).toFixed(4))}
                                                        onFocus={() => {
                                                            setFocusedQtyId(row.id);
                                                            setLocalRows(prev => ({ ...prev, [`${row.id}-qty`]: row.formulaStr ?? row.qty ?? "" }));
                                                        }}
                                                        onBlur={() => {
                                                            setFocusedQtyId(null);
                                                            if (localRows[`${row.id}-qty`] !== undefined && localRows[`${row.id}-qty`] !== (row.formulaStr ?? row.qty ?? "")) {
                                                                updateEditSpreadsheetRow(row.id, 'formulaStr', localRows[`${row.id}-qty`]);
                                                            }
                                                        }}
                                                        onChange={e => setLocalRows(prev => ({ ...prev, [`${row.id}-qty`]: e.target.value }))}
                                                        style={{ ...tableInputActiveStyle, width: '100%' }}
                                                    />
                                                </TableCell>

                                                <TableCell color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(row.rate)}</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(row.amount)}</TableCell>
                                                <TableCell align="center"><IconButton size="small" color="error" onClick={() => removeEditSpreadsheetRow(row.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Button variant="outlined" disableElevation onClick={addEditSpreadsheetRow} sx={{ mb: 4, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px', width: { xs: '100%', sm: 'auto' } }}>+ ADD_COMPONENT</Button>

                        <Box display="flex" justifyContent="flex-end">
                            <Paper elevation={0} variant="outlined" sx={{ width: { xs: '100%', sm: 400 }, p: { xs: 2, sm: 3 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <Box display="flex" justifyContent="space-between" mb={2}>
                                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>SUBTOTAL:</Typography>
                                    <Typography fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(editSubTotal)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>OVERHEAD (%):</Typography>
                                        <input type="number" value={editBoqOH} onChange={e => setEditBoqOH(e.target.value)} style={{ ...tableInputActiveStyle, width: 60 }} />
                                    </Box>
                                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(editOhAmount)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} pb={2} borderBottom="2px solid" borderColor="divider">
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>PROFIT (%):</Typography>
                                        <input type="number" value={editBoqProfit} onChange={e => setEditBoqProfit(e.target.value)} style={{ ...tableInputActiveStyle, width: 60 }} />
                                    </Box>
                                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(editProfitAmount)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1} color="success.main">
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>FINAL_RATE/{editBoqUnit}:</Typography>
                                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{formatCurrency(editGrandTotal)}</Typography>
                                </Box>
                            </Paper>
                        </Box>
                    </>
                )}
            </DialogContent>

            {/* 🔥 FIXED: Neutralized MUI's default margin-left that breaks mobile buttons */}
            <DialogActions sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: 'rgba(13, 31, 60, 0.5)',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: 'stretch',
                gap: { xs: 1, sm: 2 },
                '& > :not(:first-of-type)': { ml: 0 }
            }}>
                <Button onClick={onClose} color="inherit" sx={{ fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>CANCEL</Button>

                {/* Wrapped buttons in a standard width box so they stack properly */}
                <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    {isCustom ? (
                        <Button variant="contained" color="success" onClick={saveEditedCustomBoq} startIcon={<SaveIcon />} fullWidth>SAVE</Button>
                    ) : editorItem.masterBoqId ? (
                        <>
                            <Button variant="outlined" color="info" onClick={() => saveEditedMasterBoq(true)} fullWidth>SAVE_AS_NEW</Button>
                            <Button variant="contained" color="success" onClick={() => saveEditedMasterBoq(false)} startIcon={<SaveIcon />} fullWidth>UPDATE_ORIGINAL</Button>
                        </>
                    ) : (
                        <Button variant="contained" color="success" onClick={() => saveEditedMasterBoq(true)} startIcon={<SaveIcon />} fullWidth>SAVE_TO_MASTER_DB</Button>
                    )}
                </Box>
            </DialogActions>
        </Dialog>
    );
}