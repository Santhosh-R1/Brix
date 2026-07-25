import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { tableInputStyle } from '../../styles';

// 🔥 IMPORT REACT QUERY HOOKS
import { useProject, useProjectBoqs, useMasterBoqs, useResources, useUpdateProjectBoq } from '../../hooks/useQueries';
import { useProjectCalculations } from '../../hooks/useProjectCalculations';

// ============================================================================
// 🧩 SUB-COMPONENT 1: INDIVIDUAL MEASUREMENT ROW (Micro-State)
// ============================================================================
const MeasurementRow = ({ m, index, updateMeasurementInline, deleteMeasurementRow }) => {
    // Localize typing state so ONLY this row re-renders when typing!
    const [localVals, setLocalVals] = useState({ no: m.no, l: m.l, b: m.b, d: m.d, details: m.details });
    const [focusedCell, setFocusedCell] = useState(null);

    // Keep sync with external changes
    useEffect(() => {
        setLocalVals({ no: m.no, l: m.l, b: m.b, d: m.d, details: m.details });
    }, [m.no, m.l, m.b, m.d, m.details]);

    const handleBlur = (field) => {
        setFocusedCell(null);
        if (localVals[field] !== m[field]) {
            updateMeasurementInline(m.id, field, localVals[field]);
        }
    };

    const renderInput = (field, computedVal) => {
        const isFocused = focusedCell === field;
        return (
            <input
                type="text"
                value={isFocused ? (localVals[field] !== undefined ? localVals[field] : "") : ((m[field] === "" || m[field] === undefined) ? "" : Number(computedVal || 0).toFixed(2))}
                onFocus={() => { setFocusedCell(field); setLocalVals(prev => ({ ...prev, [field]: m[field] !== undefined ? m[field] : "" })); }}
                onBlur={() => handleBlur(field)}
                onChange={e => setLocalVals(prev => ({ ...prev, [field]: e.target.value }))}
                style={{ ...tableInputStyle, minWidth: '60px', width: '100%' }}
            />
        );
    };

    return (
        <TableRow hover>
            <TableCell>
                <input
                    value={localVals.details || ""}
                    onChange={e => setLocalVals(prev => ({ ...prev, details: e.target.value }))}
                    onBlur={() => handleBlur('details')}
                    style={{ ...tableInputStyle, minWidth: '150px', width: '100%' }}
                />
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>Row Index: {index + 1}</Typography>
            </TableCell>
            <TableCell>{renderInput('no', m.computedNo)}</TableCell>
            <TableCell>{renderInput('l', m.computedL)}</TableCell>
            <TableCell>{renderInput('b', m.computedB)}</TableCell>
            <TableCell>{renderInput('d', m.computedD)}</TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', whiteSpace: 'nowrap' }}>
                {Number(m.computedQty || 0).toFixed(2)}
            </TableCell>
            <TableCell align="center">
                <IconButton color="error" size="small" onClick={() => deleteMeasurementRow(m.id)}>
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

// ============================================================================
// 🧩 SUB-COMPONENT 2: INDIVIDUAL BOQ ITEM CARD
// ============================================================================
const MeasurementBookCard = ({ item, projectId, updateBoqMutation, setFormulaHelpOpen }) => {
    // Localize the "Add New" inputs to just this card
    const [draft, setDraft] = useState({ details: "", no: "", l: "", b: "", d: "" });

    const addMeasurementRow = async () => {
        if (!draft.details) return alert("Please enter a location/detail description.");
        const newRow = {
            id: crypto.randomUUID(),
            details: draft.details,
            no: String(draft.no || 1),
            l: String(draft.l || ""),
            b: String(draft.b || ""),
            d: String(draft.d || "")
        };

        const updatedMeasurements = [...(item.measurements || []), newRow];
        await updateBoqMutation.mutateAsync({ id: item.id, projectId, data: { measurements: JSON.stringify(updatedMeasurements) } });
        setDraft({ details: "", no: "", l: "", b: "", d: "" });
    };

    const deleteMeasurementRow = async (measurementId) => {
        const updatedMeasurements = (item.measurements || []).filter(m => m.id !== measurementId);
        await updateBoqMutation.mutateAsync({ id: item.id, projectId, data: { measurements: JSON.stringify(updatedMeasurements) } });
    };

    const updateMeasurementInline = async (measurementId, field, value) => {
        const updatedMeasurements = (item.measurements || []).map(m => m.id === measurementId ? { ...m, [field]: value } : m);
        await updateBoqMutation.mutateAsync({ id: item.id, projectId, data: { measurements: JSON.stringify(updatedMeasurements) } });
    };

    return (
        <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>

            {/* Header */}
            <Box sx={{
                bgcolor: "rgba(0,0,0,0.2)", p: { xs: 1.5, sm: 2 }, borderBottom: "1px solid", borderColor: "divider",
                display: "flex", flexDirection: { xs: 'column', sm: 'row' }, justifyContent: "space-between",
                alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5
            }}>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: { xs: '13px', sm: '14px' } }}>
                        {item.slNo}. {item.displayCode ? `[${item.displayCode}]` : ''} {item.displayDesc}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                        TOTAL_QTY: <Box component="span" color="success.main" fontWeight="bold" fontSize="1rem">{Number(item.computedQty || 0).toFixed(2)} {item.displayUnit}</Box>
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                    fullWidth={{ xs: true, sm: false }}
                    startIcon={<HelpOutlineIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setFormulaHelpOpen(true)}
                    sx={{
                        py: 0.5,
                        px: 1.5,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        borderRadius: '20px',
                        textTransform: 'uppercase',
                        minWidth: '150px',
                        height: '32px',
                        borderColor: 'secondary.main',
                        '&:hover': {
                            borderColor: 'secondary.light',
                            bgcolor: 'rgba(156, 39, 176, 0.08)'
                        }
                    }}
                >
                    FORMULA GUIDE
                </Button>
            </Box>

            {/* Table */}
            <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <TableRow>
                            <TableCell sx={{ width: '30%', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>LOCATION_DETAILS</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>NO.</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>L</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>B</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>D/H</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>QTY</TableCell>
                            <TableCell align="center" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>ACTION</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(item.computedMeasurements || []).map((m, idx) => (
                            <MeasurementRow
                                key={m.id} m={m} index={idx}
                                updateMeasurementInline={updateMeasurementInline}
                                deleteMeasurementRow={deleteMeasurementRow}
                            />
                        ))}

                        {/* Draft Row */}
                        <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.15)' }}>
                            <TableCell><input placeholder="Location..." value={draft.details} onChange={e => setDraft({ ...draft, details: e.target.value })} style={{ ...tableInputStyle, minWidth: '150px', width: '100%' }} /></TableCell>
                            <TableCell><input type="text" placeholder="No" value={draft.no} onChange={e => setDraft({ ...draft, no: e.target.value })} style={{ ...tableInputStyle, minWidth: '60px', width: '100%' }} /></TableCell>
                            <TableCell><input type="text" placeholder="L" value={draft.l} onChange={e => setDraft({ ...draft, l: e.target.value })} style={{ ...tableInputStyle, minWidth: '60px', width: '100%' }} /></TableCell>
                            <TableCell><input type="text" placeholder="B" value={draft.b} onChange={e => setDraft({ ...draft, b: e.target.value })} style={{ ...tableInputStyle, minWidth: '60px', width: '100%' }} /></TableCell>
                            <TableCell><input type="text" placeholder="D/H" value={draft.d} onChange={e => setDraft({ ...draft, d: e.target.value })} style={{ ...tableInputStyle, minWidth: '60px', width: '100%' }} /></TableCell>
                            <TableCell color="text.secondary">-</TableCell>
                            <TableCell align="center">
                                <Button variant="contained" size="small" onClick={addMeasurementRow} fullWidth sx={{ borderRadius: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '0.5px' }}>ADD</Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function MeasurementBookTab({ projectId, setFormulaHelpOpen }) {
    // 1. Fetching Data Independently via React Query
    const { data: project } = useProject(projectId);
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
    const { data: rawMasterBoqs = [] } = useMasterBoqs();
    const { data: rawResources = [] } = useResources();

    // 2. Safe Parsing
    const parseSafe = (str, fallback = []) => {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try { return JSON.parse(str); } catch { return fallback; }
    };

    const projectBoqItems = useMemo(() => {
        return rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })).sort((a, b) => a.slNo - b.slNo);
    }, [rawProjectBoqs]);

    const masterBoqs = useMemo(() => rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) })), [rawMasterBoqs]);
    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}), rateHistory: parseSafe(r.rateHistory, []) })), [rawResources]);

    // 3. Engine Calculations
    const { renderedProjectBoq } = useProjectCalculations(projectBoqItems, masterBoqs, resources, project);

    // 4. Mutation Hooks
    const updateBoqMutation = useUpdateProjectBoq();

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            {renderedProjectBoq.length === 0 && (
                <Paper sx={{ p: 4, textAlign: "center", borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>
                        ADD_ITEMS_TO_BOQ_FIRST
                    </Typography>
                </Paper>
            )}

            {renderedProjectBoq.map(item => (
                <MeasurementBookCard
                    key={item.id}
                    item={item}
                    projectId={projectId}
                    updateBoqMutation={updateBoqMutation}
                    setFormulaHelpOpen={setFormulaHelpOpen}
                />
            ))}
        </Box>
    );
}