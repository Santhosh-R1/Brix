import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { getResourceRate, calculateMasterBoqRate } from "../engines/calculationEngine";
import { tableInputStyle, tableInputActiveStyle } from "../styles";
import BackupTab from "./backuptab"; // 🔥 Integrated your BackupTab!
import {
    Box, Button, Typography, Paper, Grid, Alert, Tabs, Tab, TextField, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip,
    TablePagination, TableSortLabel, InputAdornment, Divider,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip
} from "@mui/material";
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const Resizer = ({ onMouseDown }) => (
    <div
        onMouseDown={onMouseDown}
        style={{
            display: 'inline-block', width: '10px', height: '100%', position: 'absolute',
            right: 0, top: 0, cursor: 'col-resize', zIndex: 1, backgroundColor: 'transparent',
            transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    />
);

function MasterBOQTab({ masterBoqs, regions, resources, editMasterBoq, deleteMasterBoq, onExcelUpload, onDownloadTemplate }) {
    const [searchCode, setSearchCode] = useState('');
    const [searchDesc, setSearchDesc] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [previewRegion, setPreviewRegion] = useState('');
    const excelInputRef = useRef(null);

    const [colWidths, setColWidths] = useState({
        code: 150, desc: 400, unit: 100, rate: 150, actions: 150
    });

    const handleResizeStart = (colKey) => (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const thElement = e.target.closest('th');
        const startWidth = thElement ? thElement.getBoundingClientRect().width : colWidths[colKey];

        const handleMouseMove = (moveEvent) => {
            setColWidths(prev => ({ ...prev, [colKey]: Math.max(50, startWidth + (moveEvent.clientX - startX)) }));
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const processedBOQs = useMemo(() => {
        let filtered = (masterBoqs || []).filter((boq) => {
            const matchCode = (boq.itemCode || '').toLowerCase().includes(searchCode.toLowerCase());
            const matchDesc = (boq.description || '').toLowerCase().includes(searchDesc.toLowerCase());
            return matchCode && matchDesc;
        });

        filtered.sort((a, b) => {
            const codeA = a.itemCode || '';
            const codeB = b.itemCode || '';
            return sortDirection === 'asc'
                ? codeA.localeCompare(codeB, undefined, { numeric: true })
                : codeB.localeCompare(codeA, undefined, { numeric: true });
        });
        return filtered;
    }, [masterBoqs, searchCode, searchDesc, sortDirection]);

    const paginatedBOQs = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return processedBOQs.slice(startIndex, startIndex + rowsPerPage);
    }, [processedBOQs, page, rowsPerPage]);

    return (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
                <Box display="flex" gap={2} flexWrap="wrap" flex={1} alignItems="flex-start">
                    <TextField placeholder="Search Code..." variant="outlined" size="small" value={searchCode} onChange={(e) => { setSearchCode(e.target.value); setPage(0); }} sx={{ flex: 1, minWidth: 150 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                    <TextField placeholder="Search Description..." variant="outlined" size="small" value={searchDesc} onChange={(e) => { setSearchDesc(e.target.value); setPage(0); }} sx={{ flex: 2, minWidth: 250 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                    <TextField select size="small" label="PREVIEW_REGION" value={previewRegion} onChange={e => setPreviewRegion(e.target.value)} sx={{ flex: 1, minWidth: 150 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                        <MenuItem value="">-- SELECT_REGION --</MenuItem>
                        {(regions || []).map(r => <MenuItem key={r.id} value={r.name} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{r.name}</MenuItem>)}
                    </TextField>
                </Box>
                <Box display="flex" gap={2} alignItems="flex-start">
                    <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={onDownloadTemplate} sx={{ height: 40, px: 3, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>TEMPLATE</Button>
                    <input type="file" accept=".xls,.xlsx" ref={excelInputRef} style={{ display: 'none' }} onChange={(e) => { onExcelUpload(e); excelInputRef.current.value = null; }} />
                    <Button size="small" variant="contained" disableElevation startIcon={<UploadIcon />} onClick={() => excelInputRef.current.click()} sx={{ height: 40, px: 3, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>IMPORT EXCEL</Button>
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ overflowX: 'auto', width: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Table size="small" sx={{ tableLayout: 'fixed', minWidth: '100%', width: Object.values(colWidths).reduce((a, b) => a + b, 0) }}>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                        <TableRow>
                            <TableCell sx={{ width: colWidths.code, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><TableSortLabel active direction={sortDirection} onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}><strong>ITEM_CODE</strong></TableSortLabel><Resizer onMouseDown={handleResizeStart('code')} /></TableCell>
                            <TableCell sx={{ width: colWidths.desc, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><strong>DESCRIPTION</strong><Resizer onMouseDown={handleResizeStart('desc')} /></TableCell>
                            <TableCell sx={{ width: colWidths.unit, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><strong>UNIT</strong><Resizer onMouseDown={handleResizeStart('unit')} /></TableCell>
                            <TableCell sx={{ width: colWidths.rate, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><strong>RATE_PREVIEW</strong><Resizer onMouseDown={handleResizeStart('rate')} /></TableCell>
                            <TableCell align="center" sx={{ width: colWidths.actions, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><strong>ACTIONS</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedBOQs.length > 0 ? paginatedBOQs.map((b) => {
                            const rate = previewRegion ? calculateMasterBoqRate(b, resources, masterBoqs, previewRegion) : 0;
                            return (
                                <TableRow key={b.id} hover>
                                    <TableCell sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{b.itemCode || '-'}</TableCell>
                                    <TableCell sx={{ maxWidth: colWidths.desc, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                                        {b.description}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{b.unit}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: previewRegion ? 'success.main' : 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{previewRegion ? `₹ ${rate.toFixed(2)}` : 'SELECT_REGION'}</TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" gap={1} justifyContent="center">
                                            <Button size="small" variant="outlined" color="warning" onClick={() => editMasterBoq(b)} sx={{ borderRadius: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>EDIT</Button>
                                            <Button size="small" variant="outlined" color="error" onClick={() => deleteMasterBoq(b.id)} sx={{ borderRadius: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>DELETE</Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        }) : <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'text.secondary' }}>NO_MATCHING_ITEMS</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination rowsPerPageOptions={[10, 25, 50, 100]} component="div" count={processedBOQs.length} rowsPerPage={rowsPerPage} page={page} onPageChange={(e, newPage) => setPage(newPage)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} sx={{ fontFamily: "'JetBrains Mono', monospace" }} />
        </Box>
    );
}

export default function DatabaseEditor({ onBack }) {
    const [tab, setTab] = useState("resources");

    const [regions, setRegions] = useState([]);
    const [resources, setResources] = useState([]);
    const [masterBoqs, setMasterBoqs] = useState([]);

    // 🔥 BULLETPROOF DATA LOADER
    // This catches raw strings/nulls from SQLite and forcefully parses them into safe objects so React never crashes.
    const loadData = async () => {
        try {
            const [reg, res, boqs] = await Promise.all([
                window.api.db.getRegions(),
                window.api.db.getResources(),
                window.api.db.getMasterBoqs()
            ]);

            // Defensively ensure 'rates' is always an object
            const safeRes = (res || []).map(r => {
                let parsedRates = {};
                if (typeof r.rates === 'string') { try { parsedRates = JSON.parse(r.rates); } catch (e) { } }
                else if (r.rates && typeof r.rates === 'object') { parsedRates = r.rates; }
                return { ...r, rates: parsedRates };
            });

            // Defensively ensure 'components' is always an array
            const safeBoqs = (boqs || []).map(b => {
                let parsedComps = [];
                if (typeof b.components === 'string') { try { parsedComps = JSON.parse(b.components); } catch (e) { } }
                else if (Array.isArray(b.components)) { parsedComps = b.components; }
                return { ...b, components: parsedComps };
            });

            setRegions(reg || []);
            setResources(safeRes);
            setMasterBoqs(safeBoqs);
        } catch (error) {
            console.error("Failed to load SQLite data:", error);
        }
    };

    useEffect(() => { loadData(); }, []);

    const [newRegion, setNewRegion] = useState("");
    const [importRegion, setImportRegion] = useState("");
    const [searchCode, setSearchCode] = useState("");
    const [searchDesc, setSearchDesc] = useState("");
    const [sortField, setSortField] = useState("code");
    const [sortAsc, setSortAsc] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const [resCode, setResCode] = useState("");
    const [resDesc, setResDesc] = useState("");
    const [resUnit, setResUnit] = useState("nos");

    const [editingBoqId, setEditingBoqId] = useState(null);
    const [boqCode, setBoqCode] = useState("");
    const [boqDesc, setBoqDesc] = useState("");
    const [boqUnit, setBoqUnit] = useState("cum");
    const [boqOH, setBoqOH] = useState(10);
    const [boqProfit, setBoqProfit] = useState(10);
    const [previewRegion, setPreviewRegion] = useState("");
    const [boqRows, setBoqRows] = useState([]);

    const [importData, setImportData] = useState(null);
    const fileInputRef = useRef(null);
    const [formulaHelpOpen, setFormulaHelpOpen] = useState(false);
    const [focusedQtyId, setFocusedQtyId] = useState(null);

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

    const handleAddRegion = async () => { if (!newRegion) return; await window.api.db.createRegion(newRegion); setNewRegion(""); loadData(); };
    const handleDeleteRegion = async (regionId, regionName) => { if (window.confirm(`Delete "${regionName}"?`)) { await window.api.db.deleteRegion(regionId, regionName); loadData(); } };
    const addResourceManually = async () => { if (!resDesc) return; await window.api.db.createResource({ code: resCode, description: resDesc, unit: resUnit }); setResCode(""); setResDesc(""); loadData(); };
    const updateResourceInline = async (id, field, value) => { await window.api.db.updateResource(id, field, value); loadData(); };
    const deleteResource = async (id) => { if (window.confirm("Delete this resource?")) { await window.api.db.deleteResource(id); loadData(); } };

    const handleSort = (field) => { if (sortField === field) setSortAsc(!sortAsc); else { setSortField(field); setSortAsc(true); } setCurrentPage(1); };

    const triggerLmrImport = async () => {
        if (!importRegion) return alert("Select a region for import first.");
        const res = await window.api.db.importExcel(importRegion);
        if (res.success) { alert(res.message); loadData(); } else if (res.message !== 'User cancelled') alert(res.error);
    };

    const generateDatabookTemplate = () => { /* Keep logic */ };
    const handleDatabookExcelUpload = (e) => { /* Keep logic */ };

    const addSpreadsheetRow = () => setBoqRows([...boqRows, { id: crypto.randomUUID(), itemType: "resource", itemId: "", formulaStr: "1", qty: 1 }]);
    const updateSpreadsheetRow = (id, field, value) => setBoqRows(boqRows.map(row => row.id === id ? { ...row, [field]: value, ...(field === 'itemType' ? { itemId: "", tempCode: undefined, tempDesc: undefined } : {}) } : row));
    const removeSpreadsheetRow = (id) => setBoqRows(boqRows.filter(row => row.id !== id));

    const saveMasterBoq = async (isSaveAsNew = false) => {
        if (!boqCode || !boqDesc) return alert("Please enter a Code and Description.");
        const validComponents = renderedRows.filter(r => r.itemId && r.computedQty !== 0).map(r => ({ itemType: r.itemType, itemId: r.itemId, qty: Number(r.computedQty), formulaStr: r.formulaStr || String(r.computedQty) }));
        if (validComponents.length === 0) return alert("Add at least one valid component.");
        const payload = { itemCode: boqCode, description: boqDesc, unit: boqUnit, overhead: Number(boqOH), profit: Number(boqProfit), components: JSON.stringify(validComponents) };
        await window.api.db.saveMasterBoq(payload, editingBoqId, isSaveAsNew);
        alert(isSaveAsNew ? "Saved as a New Databook Item!" : "Databook Item Saved!");
        setEditingBoqId(null); setBoqCode(""); setBoqDesc(""); setBoqRows([]); loadData();
    };

    const editMasterBoq = (b) => {
        setEditingBoqId(b.id); setBoqCode(b.itemCode || ""); setBoqDesc(b.description); setBoqUnit(b.unit); setBoqOH(b.overhead || 0); setBoqProfit(b.profit || 0);
        
        let finalComponents = b.components || [];
        if (finalComponents.length === 1) {
            const singleComp = finalComponents[0];
            const resource = resources.find(r => r.id === singleComp.itemId);
            if (resource && resource.code === b.itemCode) {
                finalComponents = [];
            }
        }

        setBoqRows(finalComponents.map(c => ({ id: crypto.randomUUID(), itemType: c.itemType || 'resource', itemId: c.itemId, qty: c.qty, formulaStr: c.formulaStr || String(c.qty) })));
        setTab("createBoq");
    };

    const deleteMasterBoq = async (id) => { if (window.confirm("Delete this Databook item?")) { await window.api.db.deleteMasterBoq(id); loadData(); } };

    const exportDatabase = () => { /* Keep logic */ };
    const handleFileSelect = (e) => { /* Keep logic */ };
    const handleImportProcess = async (mode) => { /* Keep logic */ };
    const purgeMasterDatabase = async () => { /* Keep logic */ };

    const filteredResources = useMemo(() => {
        let filtered = resources.filter(r => (r.code || "").toLowerCase().includes(searchCode.toLowerCase()) && (r.description || "").toLowerCase().includes(searchDesc.toLowerCase()));
        filtered.sort((a, b) => { let valA = (a[sortField] || "").toLowerCase(), valB = (b[sortField] || "").toLowerCase(); if (valA < valB) return sortAsc ? -1 : 1; if (valA > valB) return sortAsc ? 1 : -1; return 0; });
        return filtered;
    }, [resources, searchCode, searchDesc, sortField, sortAsc]);

    const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
    const paginatedResources = filteredResources.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const { renderedRows, subTotal, grandTotal, ohAmount, profitAmount } = useMemo(() => {
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

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack} variant="outlined" color="inherit" sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px', borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'primary.main', color: 'primary.main' } }}>{'< '}HOME</Button>
                <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '18px', md: '22px' } }}>DATABASE_MANAGER</Typography>
            </Box>

            <Paper elevation={0} variant="outlined" sx={{ mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto">
                    <Tab value="resources" label="01_LOCAL_MARKET_RATES" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.5px' }} />
                    <Tab value="createBoq" label={`02_${editingBoqId ? "EDIT_DATABOOK_ITEM" : "DATABOOK_BUILDER"}`} sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.5px' }} />
                    <Tab value="viewBoq" label="03_DATABOOK" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.5px' }} />
                    <Tab value="backup" label="04_BACKUP_&_RESTORE" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.5px' }} />
                </Tabs>
            </Paper>

            {tab === "backup" && (
                <>
                    <BackupTab
                        exportDatabase={exportDatabase}
                        importDatabase={handleImportProcess}
                        handleFileSelect={handleFileSelect}
                        handlePurgeDatabase={purgeMasterDatabase}
                        fileInputRef={fileInputRef}
                    />
                    <Dialog open={!!importData} onClose={() => { setImportData(null); if (fileInputRef.current) fileInputRef.current.value = null; }}>
                        <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>IMPORT_DATABASE</DialogTitle>
                        <DialogContent>
                            <DialogContentText sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                                How would you like to process this Master Database file?<br /><br />
                                <strong>REPLACE:</strong> Wipes all existing Databook items, Resources, and Regions before loading the new file.<br /><br />
                                <strong>APPEND:</strong> Keeps your existing data and only adds items/resources whose Codes do not already exist locally.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, pt: 0 }}>
                            <Button onClick={() => { setImportData(null); if (fileInputRef.current) fileInputRef.current.value = null; }} color="inherit" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>CANCEL</Button>
                            <Button onClick={() => handleImportProcess('append')} variant="outlined" color="primary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>APPEND MISSING</Button>
                            <Button onClick={() => handleImportProcess('replace')} variant="contained" color="error" disableElevation sx={{ fontFamily: "'JetBrains Mono', monospace" }}>REPLACE ALL</Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}

            {tab === "resources" && (
                <Box>
                    <Grid container spacing={3} mb={3}>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={0} variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                                <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: '13px' }}>IMPORT_EXCEL_LMR</Typography>
                                <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
                                    <TextField select size="small" label="TARGET_REGION" value={regions.some(r => r.name === importRegion) ? importRegion : ""} onChange={e => setImportRegion(e.target.value)} sx={{ minWidth: 150, flex: 1 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                                        <MenuItem value="">-- SELECT_REGION --</MenuItem>
                                        {(regions || []).map(r => <MenuItem key={r.id} value={r.name} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{r.name}</MenuItem>)}
                                    </TextField>
                                    <Button variant="contained" color="primary" disableElevation startIcon={<UploadIcon />} onClick={triggerLmrImport} sx={{ height: 40, px: 3, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px', whiteSpace: 'nowrap' }}>UPLOAD LMR</Button>
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={0} variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                                <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: '13px' }}>MANAGE_REGIONS</Typography>
                                <Box display="flex" gap={2} alignItems="flex-start">
                                    <TextField size="small" label="NEW_REGION" value={newRegion} onChange={e => setNewRegion(e.target.value)} fullWidth InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                                    <Button variant="contained" disableElevation onClick={handleAddRegion} sx={{ height: 40, px: 3, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}>ADD</Button>
                                </Box>
                                {regions.length > 0 && (
                                    <Box display="flex" gap={1} flexWrap="wrap" mt={2} pt={2} borderTop="1px dashed" borderColor="divider">
                                        {regions.map(r => <Chip key={r.id} label={r.name} onDelete={() => handleDeleteRegion(r.id, r.name)} size="small" variant="outlined" sx={{ borderRadius: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }} />)}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    <Paper elevation={0} variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: '12px' }}>SEARCH_RESOURCES</Typography>
                                <Box display="flex" gap={2} alignItems="flex-start">
                                    <TextField size="small" placeholder="Search Code..." value={searchCode} onChange={e => { setSearchCode(e.target.value); setCurrentPage(1); }} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                                    <TextField size="small" placeholder="Search Description..." value={searchDesc} onChange={e => { setSearchDesc(e.target.value); setCurrentPage(1); }} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                                </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" fontWeight="bold" mb={1} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: '12px' }}>ADD_RESOURCE</Typography>
                                <Box display="flex" gap={1} alignItems="flex-start">
                                    <TextField size="small" label="CODE" value={resCode} onChange={e => setResCode(e.target.value)} sx={{ width: 120 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                                    <TextField size="small" label="DESCRIPTION" value={resDesc} onChange={e => setResDesc(e.target.value)} fullWidth InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                                    <TextField size="small" label="UNIT" value={resUnit} onChange={e => setResUnit(e.target.value)} sx={{ width: 100 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                                    <Button variant="contained" disableElevation onClick={addResourceManually} sx={{ height: 40, px: 3, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}>ADD</Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>

                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ maxHeight: 600, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                        <Table stickyHeader size="small" sx={{ minWidth: '100%' }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 60, bgcolor: 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>ACTION</TableCell>
                                    <TableCell onClick={() => handleSort('code')} sx={{ cursor: 'pointer', width: 120, bgcolor: 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>CODE {sortField === 'code' ? (sortAsc ? '↑' : '↓') : ''}</TableCell>
                                    <TableCell onClick={() => handleSort('description')} sx={{ cursor: 'pointer', bgcolor: 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>DESCRIPTION {sortField === 'description' ? (sortAsc ? '↑' : '↓') : ''}</TableCell>
                                    <TableCell sx={{ width: 100, bgcolor: 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>UNIT</TableCell>
                                    {regions.map(r => <TableCell key={r.id} sx={{ color: 'primary.main', fontWeight: 'bold', width: 120, bgcolor: 'rgba(0,0,0,0.3)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>{r.name.toUpperCase()}</TableCell>)}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedResources.map(res => (
                                    <TableRow key={res.id} hover>
                                        <TableCell align="center"><IconButton size="small" color="error" onClick={() => deleteResource(res.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                        <TableCell><input value={res.code || ""} onChange={e => updateResourceInline(res.id, 'code', e.target.value)} style={tableInputStyle} /></TableCell>
                                        <TableCell><input value={res.description || ""} onChange={e => updateResourceInline(res.id, 'description', e.target.value)} style={tableInputStyle} /></TableCell>
                                        <TableCell><input value={res.unit || ""} onChange={e => updateResourceInline(res.id, 'unit', e.target.value)} style={tableInputStyle} /></TableCell>
                                        {/* 🔥 Ultra-Safe Render Binding to prevent null pointer crashes */}
                                        {regions.map(r => (
                                            <TableCell key={r.id}>
                                                <input type="number" value={res?.rates?.[r.name] ?? ""} onChange={e => updateResourceInline(res.id, 'rates', { ...(res?.rates || {}), [r.name]: Number(e.target.value) })} style={tableInputActiveStyle} />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {tab === "createBoq" && (
                <Paper elevation={0} variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Typography variant="h6" fontWeight="bold" mb={3} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '14px', md: '16px' } }}>
                        {editingBoqId ? "EDIT" : "CREATE"}_DATABOOK_ITEM
                    </Typography>

                    {/* 🔥 FIXED: Flexible stacking on mobile */}
                    <Box display="flex" gap={{ xs: 2, sm: 3 }} flexDirection={{ xs: 'column', md: 'row' }} mb={4}>
                        <TextField label="ITEM_CODE" value={boqCode} onChange={e => setBoqCode(e.target.value)} sx={{ flex: 1 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                        <TextField label="DESCRIPTION" value={boqDesc} onChange={e => setBoqDesc(e.target.value)} sx={{ flex: 3 }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                        <TextField label="UNIT" value={boqUnit} onChange={e => setBoqUnit(e.target.value)} sx={{ width: { xs: '100%', md: 100 } }} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                    </Box>

                    {/* 🔥 Assuming you have the Boq components table rendering here, ensure it has overflowX: 'auto' */}
                    <Box sx={{ width: '100%', overflowX: 'auto', mb: 4 }}>
                        <Button variant="outlined" disableElevation onClick={addSpreadsheetRow} sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px', width: { xs: '100%', sm: 'auto' } }}>+ ADD_COMPONENT</Button>
                    </Box>

                    <Box display="flex" justifyContent="flex-end">
                        {/* 🔥 FIXED: Removed hardcoded 400px width */}
                        <Paper elevation={0} variant="outlined" sx={{ width: { xs: '100%', sm: 400 }, p: { xs: 2, md: 3 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>

                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>SUBTOTAL:</Typography>
                                <Typography fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>₹ {subTotal.toFixed(2)}</Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>OVERHEAD (%):</Typography>
                                    <input type="number" value={boqOH} onChange={e => setBoqOH(e.target.value)} style={{ ...tableInputActiveStyle, width: 60 }} />
                                </Box>
                                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>₹ {ohAmount.toFixed(2)}</Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} pb={2} borderBottom="2px solid" borderColor="divider">
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>PROFIT (%):</Typography>
                                    <input type="number" value={boqProfit} onChange={e => setBoqProfit(e.target.value)} style={{ ...tableInputActiveStyle, width: 60 }} />
                                </Box>
                                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>₹ {profitAmount.toFixed(2)}</Typography>
                            </Box>

                            <Box display="flex" justifyContent="space-between" mb={3} color="success.main">
                                <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>FINAL_RATE/{boqUnit}:</Typography>
                                <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>₹ {grandTotal.toFixed(2)}</Typography>
                            </Box>

                            {/* 🔥 FIXED: Flexible button stacking */}
                            <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                                {editingBoqId && <Button variant="outlined" color="info" fullWidth size="large" onClick={() => saveMasterBoq(true)} disableElevation sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}>SAVE_AS_NEW</Button>}
                                <Button variant="contained" color="success" fullWidth size="large" onClick={() => saveMasterBoq(false)} startIcon={<SaveIcon />} disableElevation sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '13px' }}>{editingBoqId ? "UPDATE_ITEM" : "SAVE_ITEM"}</Button>
                            </Box>
                        </Paper>
                    </Box>
                </Paper>
            )}

            {tab === "viewBoq" && (
                <Box>
                    <MasterBOQTab masterBoqs={masterBoqs} regions={regions} resources={resources} editMasterBoq={editMasterBoq} deleteMasterBoq={deleteMasterBoq} onExcelUpload={handleDatabookExcelUpload} onDownloadTemplate={generateDatabookTemplate} />
                </Box>
            )}
        </Box>
    );
}