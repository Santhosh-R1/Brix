import { useState, useMemo, useEffect, useRef } from "react";
import { Box, Button, Typography, Paper, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, useTheme, CircularProgress, Backdrop } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UploadIcon from '@mui/icons-material/Upload';
import { calculateMasterBoqRate, getResourceRate } from "../../engines/calculationEngine";
import FormulaGuideDialog from "../workspace/FormulaGuideDialog";
import DatabaseDialog from "./DatabaseDialog";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { getCreateBoqTabStyles, getNativeStyles } from "./CreateBoqTab.styles";

import { useSettings } from "../../context/SettingsContext";

export default function CreateBoqTab({ regions, resources, masterBoqs, loadData, editingBoq, clearEdit }) {
    const { formatCurrency } = useSettings();
    const theme = useTheme();
    const styles = getCreateBoqTabStyles(theme);
    const nativeStyles = getNativeStyles();

    const [isExtractingPdf, setIsExtractingPdf] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const pdfInputRef = useRef(null);
    const handlePdfUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append("file", file);

        try {
            setIsExtractingPdf(true);
            // Forward the PDF to the backend for processing
            const baseUrl = import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8000";
            const url = `${baseUrl}/api/ml/extract-assembly-pdf`;
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("PDF extraction results:", data);
                
                if (data.components && Array.isArray(data.components)) {
                    const newRows = data.components.map(comp => {
                        const isAssemblyFormat = String(comp.code).includes('.'); 
                        
                        if (isAssemblyFormat) {
                            const bMatch = masterBoqs.find(b => (b.code || b.itemCode) === String(comp.code));
                            return { 
                                id: crypto.randomUUID(), 
                                itemType: "boq", 
                                itemId: bMatch ? bMatch.id : "", 
                                tempCode: String(comp.code), 
                                tempDesc: comp.desc ? String(comp.desc) : "", 
                                formulaStr: String(comp.qty), 
                                qty: Number(comp.qty) 
                            };
                        } else {
                            const rMatch = resources.find(r => (r.code || r.itemCode) === String(comp.code));
                            return { 
                                id: crypto.randomUUID(), 
                                itemType: "resource", 
                                itemId: rMatch ? rMatch.id : "", 
                                tempCode: String(comp.code), 
                                tempDesc: comp.desc ? String(comp.desc) : "", 
                                formulaStr: String(comp.qty), 
                                qty: Number(comp.qty) 
                            };
                        }
                    });
                    
                    setBoqRows(prev => [...prev, ...newRows]);
                    triggerDialog("Import Success", `Successfully imported ${newRows.length} components from PDF!`, "success");
                } else {
                    triggerDialog("Import Warning", "PDF uploaded and processed successfully, but no components were found.", "warning");
                }
            } else {
                throw new Error("Failed to process PDF on the server.");
            }
        } catch (error) {
            console.error("Error uploading PDF:", error);
            triggerDialog("Upload Failed", "Failed to upload PDF. Ensure backend is running and CORS is configured.", "error");
        } finally {
            if (pdfInputRef.current) pdfInputRef.current.value = null;
            setIsExtractingPdf(false);
        }
    };

    const [boqCode, setBoqCode] = useState("");
    const [boqDesc, setBoqDesc] = useState("");
    const [boqUnit, setBoqUnit] = useState("cum");
    const [boqOH, setBoqOH] = useState(15);
    const [boqProfit, setBoqProfit] = useState(15);
    const [previewRegion, setPreviewRegion] = useState("");
    const [boqRows, setBoqRows] = useState([]);
    const [focusedQtyId, setFocusedQtyId] = useState(null);
    const [localRows, setLocalRows] = useState({});
    const [formulaHelpOpen, setFormulaHelpOpen] = useState(false);

    // Dialog state
    const [dialogState, setDialogState] = useState({ open: false, title: "", message: "", severity: "warning" });
    const [deleteModal, setDeleteModal] = useState({ open: false, rowId: null, itemName: "" });

    const triggerDialog = (title, message, severity = "warning") => {
        setDialogState({ open: true, title, message, severity });
    };

    // Initialize with editing data if provided
    useEffect(() => {
        setIsInitializing(true);
        
        // Defer execution slightly so the UI can paint the loading spinner before heavy processing
        setTimeout(() => {
            if (editingBoq) {
                setBoqCode(editingBoq.itemCode || "");
                setBoqDesc(editingBoq.description || "");
                setBoqUnit(editingBoq.unit || "cum");
                setBoqOH(editingBoq.overhead || 0);
                setBoqProfit(editingBoq.profit || 0);
    
                // Defensively ensure components array is valid
                const components = Array.isArray(editingBoq.components) ? editingBoq.components :
                    (typeof editingBoq.components === 'string' ? JSON.parse(editingBoq.components || '[]') : []);
    
                // Filter out the auto-created self-reference resource if it's the only component
                let finalComponents = components;
                if (components.length === 1) {
                    const singleComp = components[0];
                    const resource = resources.find(r => r.id === singleComp.itemId);
                    if (resource && resource.code === editingBoq.itemCode) {
                        finalComponents = [];
                    }
                }
    
                setBoqRows(finalComponents.map(c => ({
                    id: crypto.randomUUID(),
                    itemType: c.itemType || 'resource',
                    itemId: c.itemId,
                    qty: c.qty,
                    formulaStr: c.formulaStr || String(c.qty)
                })));
            } else {
                // Clear form if new
                setBoqCode("");
                setBoqDesc("");
                setBoqUnit("cum");
                setBoqOH(15);
                setBoqProfit(15);
                setBoqRows([]);
            }
            setIsInitializing(false);
        }, 150); // 150ms delay for smooth transition
    }, [editingBoq]);

    const computeQty = (formulaStr, currentRows) => {
        if (!formulaStr) return 0;
        const str = String(formulaStr).trim().toLowerCase();
        if (str === "") return 0;
        if (!str.startsWith('=')) { const num = Number(str); return isNaN(num) ? 0 : num; }
        let expr = str.substring(1).replace(/\b(ceil|floor|round|abs|max|min|pi|sqrt)\b/g, "Math.$1");
        expr = expr.replace(/#(\d+)/g, (match, slNoStr) => {
            const idx = parseInt(slNoStr, 10) - 1;
            return currentRows[idx] ? (currentRows[idx].computedQty || 0) : 0;
        });
        try { return /[^0-9+\-*/().\seE]/.test(expr) ? 0 : (isFinite(new Function(`return ${expr}`)()) ? new Function(`return ${expr}`)() : 0); }
        catch { return 0; }
    };

    const addSpreadsheetRow = () => setBoqRows([...boqRows, { id: crypto.randomUUID(), itemType: "resource", itemId: "", formulaStr: "1", qty: 1 }]);
    const updateSpreadsheetRow = (id, field, value) => setBoqRows(boqRows.map(row => row.id === id ? { ...row, [field]: value, ...(field === 'itemType' ? { itemId: "", tempCode: undefined, tempDesc: undefined } : {}) } : row));
    const removeSpreadsheetRow = (id) => setBoqRows(boqRows.filter(row => row.id !== id));

    const confirmRemoveComponent = () => {
        if (deleteModal.rowId) {
            removeSpreadsheetRow(deleteModal.rowId);
        }
        setDeleteModal({ open: false, rowId: null, itemName: "" });
    };

    const { renderedRows, subTotal, ohAmount, profitAmount, grandTotal } = useMemo(() => {
        let sub = 0; const computedRows = [];
        for (let i = 0; i < boqRows.length; i++) {
            const row = boqRows[i]; let rate = 0; let unit = "-";
            if (row.itemType === 'resource') {
                const resource = resources.find(r => r.id === row.itemId);
                if (resource) { rate = getResourceRate(resource, previewRegion); unit = resource.unit; }
            } else if (row.itemType === 'boq') {
                const nestedBoq = masterBoqs.find(b => b.id === row.itemId);
                if (nestedBoq) { rate = calculateMasterBoqRate(nestedBoq, resources, masterBoqs, previewRegion); unit = nestedBoq.unit; }
            }
            const computedQty = computeQty(row.formulaStr !== undefined ? row.formulaStr : row.qty, computedRows);
            const amount = rate * computedQty;
            sub += amount;
            computedRows.push({ ...row, rate, unit, amount, computedQty });
        }
        const oh = sub * (Number(boqOH) / 100), prof = sub * (Number(boqProfit) / 100);
        return { renderedRows: computedRows, subTotal: sub, ohAmount: oh, profitAmount: prof, grandTotal: sub + oh + prof };
    }, [boqRows, resources, masterBoqs, previewRegion, boqOH, boqProfit]);

    const saveMasterBoq = async (isSaveAsNew = false) => {
        if (!boqCode || !boqDesc) {
            triggerDialog("Missing Information", "Please enter a Code and Description.", "warning");
            return;
        }

        if (isSaveAsNew) {
            const codeExists = (masterBoqs || []).some(b => 
                String(b.itemCode).trim().toLowerCase() === String(boqCode).trim().toLowerCase()
            );
            if (codeExists) {
                triggerDialog("Duplicate Item Code", `Error: The Item Code "${boqCode}" is already in use. Please enter a unique Item Code.`, "error");
                return;
            }
        }

        const validComponents = renderedRows.filter(r => r.itemId && r.computedQty !== 0).map(r => ({ itemType: r.itemType, itemId: r.itemId, qty: Number(r.computedQty), formulaStr: r.formulaStr || String(r.computedQty) }));
        if (validComponents.length === 0) {
            triggerDialog("Validation Failed", "Add at least one valid component.", "warning");
            return;
        }
        const payload = { itemCode: boqCode, description: boqDesc, unit: boqUnit, overhead: Number(boqOH), profit: Number(boqProfit), components: JSON.stringify(validComponents) };

        await window.api.db.saveMasterBoq(payload, editingBoq ? editingBoq.id : null, isSaveAsNew);
        triggerDialog(
            "Success",
            isSaveAsNew ? "Saved as a New Databook Item!" : "Databook Item Saved!",
            "success"
        );

        if (clearEdit) clearEdit();
        loadData();
    };

    return (
        <Paper elevation={0} variant="outlined" sx={styles.mainPaper}>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, display: 'flex', flexDirection: 'column', gap: 2 }}
                open={isExtractingPdf || isInitializing}
            >
                <CircularProgress color="inherit" size={48} />
                <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '2px', fontWeight: 'bold' }}>
                    {isExtractingPdf ? "EXTRACTING COMPONENTS..." : "LOADING DATABOOK ASSEMBLY..."}
                </Typography>
            </Backdrop>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h6" fontWeight="bold" sx={styles.headerTitle}>
                    {editingBoq ? "EDIT" : "CREATE"}_DATABOOK_ASSEMBLY
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                    <input type="file" accept="application/pdf" ref={pdfInputRef} style={{ display: 'none' }} onChange={handlePdfUpload} />
                    <Button 
                        size="small" 
                        variant="outlined" 
                        color="secondary" 
                        disableElevation 
                        startIcon={isExtractingPdf ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />} 
                        onClick={() => pdfInputRef.current.click()} 
                        disabled={isExtractingPdf}
                        sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '11px', borderRadius: 1 }}
                    >
                        {isExtractingPdf ? "EXTRACTING..." : "UPLOAD ASSEMBLY PDF"}
                    </Button>
                    {editingBoq && (
                        <Button size="small" variant="outlined" color="error" onClick={clearEdit} sx={styles.cancelEditButton}>CANCEL_EDIT</Button>
                    )}
                </Box>
            </Box>

            {/* 🔥 FIXED: Flexible stacking on mobile */}
            <Box display="flex" gap={{ xs: 2, sm: 3 }} flexDirection={{ xs: 'column', md: 'row' }} mb={4}>
                <TextField label="ITEM_CODE" value={boqCode} onChange={e => setBoqCode(e.target.value)} sx={styles.codeField} InputLabelProps={{ sx: styles.fieldLabel }} InputProps={{ sx: styles.fieldInput }} />
                <TextField label="DESCRIPTION" value={boqDesc} onChange={e => setBoqDesc(e.target.value)} sx={styles.descField} InputLabelProps={{ sx: styles.fieldLabel }} InputProps={{ sx: styles.fieldInput }} />
                <Box display="flex" gap={{ xs: 2, sm: 3 }} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <TextField label="UNIT" value={boqUnit} onChange={e => setBoqUnit(e.target.value)} sx={styles.unitField} InputLabelProps={{ sx: styles.fieldLabel }} InputProps={{ sx: styles.fieldInput }} />
                    {/* <TextField select label="REGION" value={previewRegion} onChange={e => setPreviewRegion(e.target.value)} sx={styles.regionField} InputLabelProps={{ sx: styles.fieldLabel }} InputProps={{ sx: styles.fieldInput }}>
                        {regions.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
                    </TextField> */}
                </Box>
            </Box>

            {/* 🔥 FIXED: Alert icon break fix */}
            <Alert severity="info" sx={styles.alertBox}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
                    <Typography sx={styles.alertText}>💡 <strong>Formula engine:</strong> Use math (<code>= 10 * 2.5</code>) or reference rows (<code>= #1 * 0.45</code>) to automatically calculate mixture ratios.</Typography>
                    <Button variant="outlined" size="small" startIcon={<HelpOutlineIcon />} onClick={() => setFormulaHelpOpen(true)} sx={styles.formulaGuideBtn}>FORMULA_GUIDE</Button>
                </Box>
            </Alert>

            {/* 🔥 FIXED: TableContainer with overflowX and minWidth */}
            <TableContainer sx={styles.tableContainer}>
                <Table size="small" sx={styles.table}>
                    <TableHead sx={styles.tableHead}>
                        <TableRow>
                            <TableCell sx={styles.headerCell('5%')}>SL.NO</TableCell>
                            <TableCell sx={styles.headerCell('12%')}>TYPE</TableCell>
                            <TableCell sx={styles.headerCell('15%')}>CODE_SEARCH</TableCell>
                            <TableCell sx={styles.headerCell('30%')}>DESC_SEARCH</TableCell>
                            <TableCell sx={styles.headerCell('8%')}>UNIT</TableCell>
                            <TableCell sx={styles.headerCell('10%')}>QTY/FORMULA</TableCell>
                            <TableCell sx={styles.headerCell('10%')}>RATE</TableCell>
                            <TableCell sx={styles.headerCell('10%')}>AMOUNT</TableCell>
                            <TableCell align="center" sx={styles.headerCell('5%')}>ACTION</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {renderedRows.map((row, idx) => {
                            const sourceList = row.itemType === 'boq' ? masterBoqs : resources;
                            const isFocused = focusedQtyId === row.id;
                            return (
                                <TableRow key={row.id}>
                                    <TableCell sx={styles.bodyCellText}>{idx + 1}</TableCell>
                                    <TableCell><select value={row.itemType} onChange={e => updateSpreadsheetRow(row.id, 'itemType', e.target.value)} style={nativeStyles.selectActive}><option value="resource" style={nativeStyles.optionActive}>RESOURCE</option><option value="boq" style={nativeStyles.optionActive}>DATABOOK</option></select></TableCell>

                                    <TableCell>
                                        <input
                                            list={`ws-codes-${row.id}`}
                                            value={localRows[`${row.id}-code`] !== undefined ? localRows[`${row.id}-code`] : (row.tempCode ?? (sourceList.find(s => s.id === row.itemId)?.code || sourceList.find(s => s.id === row.itemId)?.itemCode || ""))}
                                            onFocus={() => setLocalRows(prev => ({ ...prev, [`${row.id}-code`]: row.tempCode ?? (sourceList.find(s => s.id === row.itemId)?.code || sourceList.find(s => s.id === row.itemId)?.itemCode || "") }))}
                                            onBlur={() => {
                                                const val = localRows[`${row.id}-code`];
                                                if (val !== undefined) {
                                                    const matched = sourceList.find(s => (s.code || s.itemCode) === val);
                                                    setBoqRows(prev => prev.map(r => r.id === row.id ? (matched ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : { ...r, itemId: "", tempCode: val, tempDesc: r.tempDesc }) : r));
                                                }
                                            }}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setLocalRows(prev => ({ ...prev, [`${row.id}-code`]: val }));
                                                const matched = sourceList.find(s => (s.code || s.itemCode) === val);
                                                if (matched) {
                                                    setBoqRows(prev => prev.map(r => r.id === row.id ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : r));
                                                }
                                            }}
                                            style={nativeStyles.inputActive}
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
                                                    setBoqRows(prev => prev.map(r => r.id === row.id ? (matched ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : { ...r, itemId: "", tempCode: r.tempCode, tempDesc: val }) : r));
                                                }
                                            }}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setLocalRows(prev => ({ ...prev, [`${row.id}-desc`]: val }));
                                                const matched = sourceList.find(s => s.description === val);
                                                if (matched) {
                                                    setBoqRows(prev => prev.map(r => r.id === row.id ? { ...r, itemId: matched.id, tempCode: undefined, tempDesc: undefined } : r));
                                                }
                                            }}
                                            style={nativeStyles.inputActive}
                                        />
                                        <datalist id={`ws-descs-${row.id}`}>{sourceList.filter(s => s.description).map(s => <option key={s.id} value={s.description} />)}</datalist>
                                    </TableCell>

                                    <TableCell color="text.secondary" sx={styles.bodyCellText}>{row.unit}</TableCell>

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
                                                    updateSpreadsheetRow(row.id, 'formulaStr', localRows[`${row.id}-qty`]);
                                                }
                                            }}
                                            onChange={e => setLocalRows(prev => ({ ...prev, [`${row.id}-qty`]: e.target.value }))}
                                            style={nativeStyles.inputActive}
                                        />
                                    </TableCell>

                                    <TableCell color="text.secondary" sx={styles.bodyCellText}>{formatCurrency(row.rate)}</TableCell>
                                    <TableCell sx={styles.bodyCellTextBold}>{formatCurrency(row.amount)}</TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" color="error" onClick={() => {
                                            const itemName = (sourceList.find(s => s.id === row.itemId)?.description) || row.tempDesc || (sourceList.find(s => s.id === row.itemId)?.code) || row.tempCode || "Empty Component Row";
                                            setDeleteModal({ open: true, rowId: row.id, itemName });
                                        }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Button variant="outlined" disableElevation onClick={addSpreadsheetRow} sx={styles.addComponentBtn}>+ ADD_COMPONENT</Button>

            <Box display="flex" justifyContent="flex-end">
                {/* 🔥 FIXED: Flexible width instead of hardcoded 400px */}
                <Paper elevation={0} variant="outlined" sx={styles.summaryPaper}>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography sx={styles.summaryText}>SUBTOTAL:</Typography>
                        <Typography sx={styles.summaryTextBold}>{formatCurrency(subTotal)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography sx={styles.summaryText}>OVERHEAD (%):</Typography>
                            <input type="number" value={boqOH} onChange={e => setBoqOH(e.target.value)} style={nativeStyles.ohProfitInput} />
                        </Box>
                        <Typography sx={styles.summaryText}>{formatCurrency(ohAmount)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} pb={2} borderBottom="2px solid" borderColor="divider">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography sx={styles.summaryText}>PROFIT (%):</Typography>
                            <input type="number" value={boqProfit} onChange={e => setBoqProfit(e.target.value)} style={nativeStyles.ohProfitInput} />
                        </Box>
                        <Typography sx={styles.summaryText}>{formatCurrency(profitAmount)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={3} color="success.main">
                        <Typography variant="h6" sx={styles.summaryTotalLabel}>FINAL_RATE/{boqUnit}:</Typography>
                        <Typography variant="h6" sx={styles.summaryTotalLabel}>{formatCurrency(grandTotal)}</Typography>
                    </Box>

                    {/* 🔥 FIXED: Flexible button stacking */}
                    <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                        {editingBoq && <Button variant="outlined" color="info" fullWidth size="large" onClick={() => saveMasterBoq(true)} disableElevation sx={styles.saveAsNewBtn}>SAVE_AS_NEW</Button>}
                        <Button variant="contained" color="success" fullWidth size="large" onClick={() => saveMasterBoq(false)} startIcon={<SaveIcon />} disableElevation sx={styles.saveBtn}>{editingBoq ? "UPDATE_ITEM" : "SAVE_ITEM"}</Button>
                    </Box>
                </Paper>
            </Box>

            <FormulaGuideDialog open={formulaHelpOpen} onClose={() => setFormulaHelpOpen(false)} />
            
            <DatabaseDialog 
                open={dialogState.open}
                onClose={() => setDialogState(prev => ({ ...prev, open: false }))}
                title={dialogState.title}
                message={dialogState.message}
                severity={dialogState.severity}
            />

            <ConfirmDeleteModal 
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, rowId: null, itemName: "" })}
                onConfirm={confirmRemoveComponent}
                itemName={deleteModal.itemName}
            />
        </Paper>
    );
}