import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Autocomplete, Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { tableInputActiveStyle } from '../../styles';
import * as XLSX from 'xlsx';

import { useSettings } from '../../context/SettingsContext';

// 🔥 IMPORT REACT QUERY HOOKS
import { useQueryClient } from '@tanstack/react-query';
import { useProject, useProjectBoqs, useMasterBoqs, useResources, useCrmContacts, useUpdateProject } from '../../hooks/useQueries';
import { useProjectCalculations } from '../../hooks/useProjectCalculations';

// ============================================================================
// 🧩 SUB-COMPONENT: RATE INPUT CELL (Micro-State for 60fps typing)
// ============================================================================
const SubcontractorRateCell = ({ sub, item, handleSubRateChange, formatCurrency }) => {
    // Localize the typing state so the giant matrix doesn't re-render on every keystroke
    const initialRate = sub.rates[item.id] || "";
    const [localRate, setLocalRate] = useState(initialRate);

    // Sync with external updates
    useEffect(() => {
        setLocalRate(sub.rates[item.id] || "");
    }, [sub.rates, item.id]);

    const handleBlur = () => {
        if (Number(localRate) !== Number(sub.rates[item.id] || 0)) {
            handleSubRateChange(sub.id, item.id, localRate);
        }
    };

    const safeQty = Number(item.computedQty || 0);
    const subAmount = Number(localRate || 0) * safeQty;
    const safeAmount = Number(item.amount || 0);

    return (
        <React.Fragment>
            <TableCell sx={{ minWidth: '80px' }}>
                <input
                    type="number"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    onBlur={handleBlur}
                    style={tableInputActiveStyle}
                />
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: subAmount > safeAmount ? 'error.main' : 'success.main', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', borderRight: '2px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                {formatCurrency(subAmount)}
            </TableCell>
        </React.Fragment>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function SubcontractorBidTab({ projectId }) {
    const { formatCurrency } = useSettings();
    const queryClient = useQueryClient();

    // 1. Fetching Data Independently via React Query
    const { data: rawProject } = useProject(projectId);
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
    const { data: rawMasterBoqs = [] } = useMasterBoqs();
    const { data: rawResources = [] } = useResources();
    const { data: crmContacts = [] } = useCrmContacts();
    const updateProjectMutation = useUpdateProject();

    // 2. Safe Parsing
    const parseSafe = (str, fallback = []) => {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try { return JSON.parse(str); } catch { return fallback; }
    };

    const project = useMemo(() => {
        if (!rawProject) return null;
        return { ...rawProject, subcontractors: parseSafe(rawProject.subcontractors, []) };
    }, [rawProject]);

    const projectBoqItems = useMemo(() => rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })), [rawProjectBoqs]);
    const masterBoqs = useMemo(() => rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) })), [rawMasterBoqs]);
    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}) })), [rawResources]);

    // 3. Engine Calculations
    const { renderedProjectBoq, totalAmount } = useProjectCalculations(projectBoqItems, masterBoqs, resources, project);

    // 4. State
    const [newSubName, setNewSubName] = useState("");
    const fileInputRef = useRef(null);
    const [editingSubId, setEditingSubId] = useState(null);
    const [editSubName, setEditSubName] = useState("");

    const updateProjectField = async (field, value) => {
        await updateProjectMutation.mutateAsync({ id: projectId, data: { [field]: JSON.stringify(value) } });
    };

    // --- CRM MAPPING ---
    const subOptions = useMemo(() => {
        return crmContacts
            .filter(c => {
                const type = c.type ? c.type.toLowerCase() : "";
                return type === 'subcontractor' || type === 'supplier';
            })
            .map(c => c.company ? `${c.company} (${c.name})` : c.name);
    }, [crmContacts]);

    // --- TOTALS CALCULATION ---
    const subTotals = useMemo(() => {
        const totals = {};
        (project?.subcontractors || []).forEach(sub => {
            let sum = 0;
            renderedProjectBoq.forEach(item => {
                const qty = Number(item.computedQty || 0);
                const rate = Number(sub.rates[item.id] || 0);
                sum += (qty * rate);
            });
            totals[sub.id] = sum;
        });
        return totals;
    }, [project?.subcontractors, renderedProjectBoq]);

    const addSubcontractor = async () => {
        if (!newSubName) return;
        const cleanName = newSubName.trim();

        const existsInCrm = crmContacts.some(c =>
            c.name?.toLowerCase().trim() === cleanName.toLowerCase() ||
            c.company?.toLowerCase().trim() === cleanName.toLowerCase() ||
            `${c.company} (${c.name})`.toLowerCase().trim() === cleanName.toLowerCase()
        );

        if (!existsInCrm) {
            const newCrmContact = {
                id: crypto.randomUUID(),
                name: cleanName,
                company: "",
                type: "Subcontractor",
                status: "Active",
                email: "",
                phone: "",
                createdAt: Date.now()
            };
            await window.api.db.saveCrmContact(newCrmContact);
            queryClient.invalidateQueries({ queryKey: ['crmContacts'] });
        }

        const subs = [...(project.subcontractors || []), { id: crypto.randomUUID(), name: cleanName, rates: {} }];
        await updateProjectField("subcontractors", subs);
        setNewSubName("");
    };

    const deleteSubcontractor = async (subId) => {
        if (!window.confirm("Are you sure you want to remove this Subcontractor? All their entered bids will be permanently deleted.")) return;
        const subs = (project.subcontractors || []).filter(s => s.id !== subId);
        await updateProjectField("subcontractors", subs);
    };

    const openEditSubDialog = (sub) => {
        setEditingSubId(sub.id);
        setEditSubName(sub.name);
    };

    const saveEditedSubcontractor = async () => {
        if (!editSubName) return alert("Subcontractor name cannot be empty.");
        const cleanEditName = editSubName.trim();
        const subs = (project.subcontractors || []).map(s => s.id === editingSubId ? { ...s, name: cleanEditName } : s);
        await updateProjectField("subcontractors", subs);
        setEditingSubId(null);
        setEditSubName("");
    };

    const handleSubRateChange = async (subId, boqId, rate) => {
        const subs = [...(project.subcontractors || [])];
        const subIndex = subs.findIndex(s => s.id === subId);
        if (subIndex > -1) {
            subs[subIndex].rates[boqId] = Number(rate);
            await updateProjectField("subcontractors", subs);
        }
    };

    // Excel Export
    const exportTemplate = () => {
        const subs = project.subcontractors || [];
        const header = ["BOQ_ID", "Description", "Quantity", "Unit", "In-House Rate", ...subs.map(s => s.name)];

        const wsData = [header];
        renderedProjectBoq.forEach(item => {
            const row = [item.id, item.displayDesc, Number(item.computedQty || 0), item.displayUnit, Number(item.rate || 0)];
            subs.forEach(sub => row.push(Number(sub.rates[item.id] || 0)));
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SubcontractorBids");
        XLSX.writeFile(wb, `${project.name}_SubBids.xlsx`);
    };

    // Excel Import
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                if (jsonData.length === 0) return;

                let subs = [...(project.subcontractors || [])];
                const existingSubNames = subs.map(s => s.name.trim().toLowerCase());

                const standardCols = ["BOQ_ID", "Description", "Quantity", "Unit", "In-House Rate"];
                const allCols = Object.keys(jsonData[0]);
                const subCols = allCols.filter(c => !standardCols.includes(c));

                let addedToCrm = false;

                for (const rawSubName of subCols) {
                    const subName = rawSubName.trim();
                    if (!subName) continue;

                    if (!existingSubNames.includes(subName.toLowerCase())) {
                        subs.push({ id: crypto.randomUUID(), name: subName, rates: {} });
                        existingSubNames.push(subName.toLowerCase());
                    }

                    const existsInCrm = crmContacts.some(c =>
                        c.name?.toLowerCase().trim() === subName.toLowerCase() ||
                        c.company?.toLowerCase().trim() === subName.toLowerCase() ||
                        `${c.company} (${c.name})`.toLowerCase().trim() === subName.toLowerCase()
                    );

                    if (!existsInCrm) {
                        await window.api.db.saveCrmContact({
                            id: crypto.randomUUID(), name: subName, company: "", type: "Subcontractor",
                            status: "Active", email: "", phone: "", createdAt: Date.now()
                        });
                        addedToCrm = true;
                    }
                }

                if (addedToCrm) queryClient.invalidateQueries({ queryKey: ['crmContacts'] });

                jsonData.forEach(row => {
                    const boqId = row["BOQ_ID"];
                    if (boqId) {
                        subCols.forEach(rawSubName => {
                            const subName = rawSubName.trim();
                            const rate = Number(row[rawSubName]) || 0;
                            const subIndex = subs.findIndex(s => s.name.toLowerCase() === subName.toLowerCase());
                            if (subIndex > -1) {
                                subs[subIndex].rates[boqId] = rate;
                            }
                        });
                    }
                });

                await updateProjectField("subcontractors", subs);
                alert("Subcontractor bids imported successfully!");
            } catch (err) {
                console.error("Excel Parsing Error:", err);
                alert("Failed to parse Subcontractor Bid Excel.");
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
    };

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={2}>
                <Button fullWidth={{ xs: true, sm: false }} variant="outlined" startIcon={<DownloadIcon />} onClick={exportTemplate} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                    EXPORT MATRIX TEMPLATE
                </Button>
                <input type="file" accept=".xls,.xlsx" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
                <Button fullWidth={{ xs: true, sm: false }} variant="contained" disableElevation startIcon={<UploadIcon />} onClick={() => fileInputRef.current.click()} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                    IMPORT MATRIX
                </Button>
            </Box>

            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
                    <Autocomplete
                        freeSolo openOnFocus disablePortal options={subOptions} value={newSubName}
                        onInputChange={(e, newVal) => setNewSubName(newVal || "")}
                        sx={{ width: '100%', minWidth: { sm: 300 } }}
                        renderInput={(params) => (
                            <TextField {...params} size="small" label="SUBCONTRACTOR_NAME (CRM)" placeholder="Search Directory or type new..." InputLabelProps={{ ...params.InputLabelProps, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} />
                        )}
                    />
                    <Button fullWidth={{ xs: true, sm: false }} variant="contained" disableElevation onClick={addSubcontractor} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', flexShrink: 0, height: 40 }}>
                        + ADD BIDDER
                    </Button>
                </Box>

                <TableContainer sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <TableRow>
                                <TableCell rowSpan={2} sx={{ minWidth: 250, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>DESCRIPTION</TableCell>
                                <TableCell rowSpan={2} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>QTY</TableCell>
                                <TableCell colSpan={2} align="center" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', borderRight: '2px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>ESTIMATED (IN-HOUSE)</TableCell>
                                {(project?.subcontractors || []).map(sub => (
                                    <TableCell key={sub.id} colSpan={2} align="center" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'secondary.main', borderRight: '2px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                                        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                            {sub.name.toUpperCase()}
                                            <IconButton size="small" onClick={() => openEditSubDialog(sub)} sx={{ color: 'text.secondary', p: 0.5 }}>
                                                <EditIcon sx={{ fontSize: '14px' }} />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => deleteSubcontractor(sub.id)} sx={{ p: 0.5 }}>
                                                <DeleteIcon sx={{ fontSize: '14px' }} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>RATE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', borderRight: '2px solid rgba(255,255,255,0.1)' }}>AMOUNT</TableCell>
                                {(project?.subcontractors || []).map(sub => (
                                    <React.Fragment key={`${sub.id}-headers`}>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'secondary.main' }}>RATE</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'secondary.main', borderRight: '2px solid rgba(255,255,255,0.1)' }}>AMOUNT</TableCell>
                                    </React.Fragment>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {renderedProjectBoq.map(item => {
                                const safeQty = Number(item.computedQty || 0);
                                const safeRate = Number(item.rate || 0);
                                const safeAmount = Number(item.amount || 0);

                                return (
                                    <TableRow key={item.id} hover>
                                        <TableCell sx={{ minWidth: 250, maxWidth: 400, whiteSpace: 'normal', wordWrap: 'break-word', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                                            {item.displayDesc}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', whiteSpace: 'nowrap' }}>{safeQty.toFixed(2)} {item.displayUnit}</TableCell>

                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', whiteSpace: 'nowrap' }}>{formatCurrency(safeRate)}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', borderRight: '2px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>{formatCurrency(safeAmount)}</TableCell>

                                        {(project?.subcontractors || []).map(sub => (
                                            <SubcontractorRateCell
                                                key={`${sub.id}-${item.id}`}
                                                sub={sub}
                                                item={item}
                                                handleSubRateChange={handleSubRateChange}
                                                formatCurrency={formatCurrency}
                                            />
                                        ))}
                                    </TableRow>
                                )
                            })}

                            {/* 🔥 THE NEW GRAND TOTAL ROW */}
                            {renderedProjectBoq.length > 0 && (
                                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.4)' }}>
                                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                        GRAND TOTALS:
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', borderRight: '2px solid rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(totalAmount)}
                                    </TableCell>
                                    {(project?.subcontractors || []).map(sub => (
                                        <React.Fragment key={`total-${sub.id}`}>
                                            <TableCell sx={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}></TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', color: subTotals[sub.id] > totalAmount ? 'error.main' : 'success.main', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', borderRight: '2px solid rgba(255,255,255,0.05)', borderTop: '2px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap' }}>
                                                {formatCurrency(subTotals[sub.id])}
                                            </TableCell>
                                        </React.Fragment>
                                    ))}
                                </TableRow>
                            )}

                            {renderedProjectBoq.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4 + (project?.subcontractors?.length || 0) * 2} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                                        NO_ITEMS_IN_BOQ
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={!!editingSubId} onClose={() => setEditingSubId(null)} maxWidth="xs" fullWidth disableRestoreFocus>
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>EDIT_BIDDER_NAME</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <TextField fullWidth label="SUBCONTRACTOR_NAME" value={editSubName} onChange={e => setEditSubName(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Button onClick={() => setEditingSubId(null)} color="inherit" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>CANCEL</Button>
                    <Button variant="contained" color="success" onClick={saveEditedSubcontractor} disableElevation sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace" }}>SAVE CHANGES</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}