import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Paper, TextField, Button, Autocomplete,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// 🔥 IMPORT REACT QUERY HOOKS
import { useProject, useResources, useUpdateProject } from '../../hooks/useQueries';

// ============================================================================
// 🧩 SUB-COMPONENT 1: GRN ENTRY FORM (Isolated State)
// ============================================================================
const GrnEntryForm = ({ resources, onSubmit }) => {
    // Localized state prevents typing from re-calculating the entire stock engine
    const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
    const [grnRes, setGrnRes] = useState(null);
    const [grnQty, setGrnQty] = useState("");
    const [grnInvoice, setGrnInvoice] = useState("");
    const [grnSupplier, setGrnSupplier] = useState("");

    const handleSubmit = () => {
        if (!grnRes || !grnQty) return alert("Please select a resource and enter the quantity received.");

        const newGrn = {
            id: crypto.randomUUID(),
            date: grnDate,
            resourceId: grnRes.id,
            qty: Number(grnQty),
            invoiceNo: grnInvoice,
            supplier: grnSupplier
        };

        onSubmit(newGrn);

        // Reset form
        setGrnRes(null);
        setGrnQty("");
        setGrnInvoice("");
    };

    return (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(16, 185, 129, 0.05)' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="success.main" mb={3} sx={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '12px', sm: '14px' } }}>
                <LocalShippingIcon fontSize="small" /> LOG_MATERIAL_INWARD (GRN)
            </Typography>

            <Box display="flex" flexDirection="column" gap={2} mb={4}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                    <TextField
                        type="date" size="small" label="DELIVERY DATE"
                        value={grnDate} onChange={e => setGrnDate(e.target.value)}
                        InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }}
                        InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}
                        sx={{ width: { xs: '100%', sm: '200px' }, flexShrink: 0 }}
                    />
                    <Autocomplete
                        options={resources}
                        getOptionLabel={(option) => option ? `${option.code || ''} - ${option.description || ''}` : ''}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        value={grnRes}
                        onChange={(e, newVal) => setGrnRes(newVal)}
                        sx={{ flex: 1 }}
                        renderInput={(params) => <TextField {...params} size="small" label="DELIVERED RESOURCE" fullWidth InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ ...params.InputProps, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />}
                    />
                </Box>

                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                    <TextField
                        type="number" size="small" label="QTY RECEIVED"
                        value={grnQty} onChange={e => setGrnQty(e.target.value)}
                        sx={{ width: { xs: '100%', sm: '150px' }, flexShrink: 0 }}
                        InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }}
                        InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}
                    />
                    <TextField
                        size="small" label="CHALLAN / INVOICE NO."
                        value={grnInvoice} onChange={e => setGrnInvoice(e.target.value)}
                        sx={{ flex: 1, minWidth: { sm: '150px' } }}
                        InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }}
                        InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}
                    />
                    <TextField
                        size="small" label="SUPPLIER NAME"
                        value={grnSupplier} onChange={e => setGrnSupplier(e.target.value)}
                        sx={{ flex: 1.5, minWidth: { sm: '200px' } }}
                        InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }}
                        InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}
                    />
                    <Button variant="contained" color="success" onClick={handleSubmit} startIcon={<AddIcon />} sx={{ height: 40, width: { xs: '100%', sm: 'auto' }, flexShrink: 0, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                        RECORD GRN
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function InventoryTab({ projectId }) {
    // 1. Fetching Data Independently via React Query
    const { data: rawProject } = useProject(projectId);
    const { data: rawResources = [] } = useResources();
    const updateProjectMutation = useUpdateProject();

    // 2. Safe Parsing
    const parseSafe = (str, fallback = []) => {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try { return JSON.parse(str); } catch { return fallback; }
    };

    const project = useMemo(() => {
        if (!rawProject) return null;
        return {
            ...rawProject,
            grns: parseSafe(rawProject.grns, []),
            dailyLogs: parseSafe(rawProject.dailyLogs, [])
        };
    }, [rawProject]);

    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}) })), [rawResources]);

    const grns = project?.grns || [];
    const logs = project?.dailyLogs || [];

    // 🔥 THE CORE RECONCILIATION ENGINE 🔥
    const stockReconciliation = useMemo(() => {
        const stock = {};

        // 1. Calculate Inward from GRNs (Deliveries)
        grns.forEach(grn => {
            if (!stock[grn.resourceId]) stock[grn.resourceId] = { inward: 0, outward: 0 };
            stock[grn.resourceId].inward += Number(grn.qty);
        });

        // 2. Calculate Outward from Daily Logs (Consumption)
        logs.forEach(log => {
            // Check if log has actual resources logged against it
            const logResources = Array.isArray(log.resources) ? log.resources : [];
            logResources.forEach(resUsage => {
                if (!stock[resUsage.resourceId]) stock[resUsage.resourceId] = { inward: 0, outward: 0 };
                stock[resUsage.resourceId].outward += Number(resUsage.qty || 0);
            });
        });

        // 3. Map to Master Resource details
        return Object.entries(stock).map(([resId, data]) => {
            const res = resources.find(r => r.id === resId) || {};
            const currentStock = data.inward - data.outward;
            return {
                resourceId: resId,
                code: res.code || 'UNKNOWN',
                description: res.description || 'Unknown Resource',
                unit: res.unit || '-',
                inward: data.inward,
                outward: data.outward,
                currentStock: currentStock,
                status: currentStock < 0 ? 'Negative' : (currentStock === 0 ? 'Empty' : 'In Stock')
            };
        }).filter(item => item.inward > 0 || item.outward > 0);
    }, [grns, logs, resources]);

    const submitGrn = async (newGrn) => {
        await updateProjectMutation.mutateAsync({
            id: projectId,
            data: { grns: JSON.stringify([...grns, newGrn]) }
        });
    };

    const deleteGrn = async (id) => {
        if (window.confirm("Are you sure you want to delete this receipt? It will alter your current stock levels.")) {
            const updatedGrns = grns.filter(g => g.id !== id);
            await updateProjectMutation.mutateAsync({
                id: projectId,
                data: { grns: JSON.stringify(updatedGrns) }
            });
        }
    };

    const sortedGrns = [...grns].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <Box display="flex" flexDirection="column" gap={4}>

            {/* LIVE STOCK DASHBOARD */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={3} sx={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '12px', sm: '14px' } }}>
                    <InventoryIcon fontSize="small" color="primary" /> LIVE_STOCK_RECONCILIATION
                </Typography>

                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>RESOURCE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'success.main', whiteSpace: 'nowrap' }}>TOTAL INWARD (GRN)</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'warning.main', whiteSpace: 'nowrap' }}>TOTAL CONSUMED (LOGS)</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'info.main', whiteSpace: 'nowrap' }}>CURRENT STOCK</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>STATUS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stockReconciliation.map(item => (
                                <TableRow key={item.resourceId} hover>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', whiteSpace: 'nowrap' }}>
                                        <strong>{item.code}</strong> - {item.description}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'success.light', whiteSpace: 'nowrap' }}>
                                        {item.inward.toFixed(2)} {item.unit}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'warning.light', whiteSpace: 'nowrap' }}>
                                        {item.outward.toFixed(2)} {item.unit}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 'bold', color: item.currentStock < 0 ? 'error.main' : 'info.main', whiteSpace: 'nowrap' }}>
                                        {item.currentStock.toFixed(2)} {item.unit}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {item.status === 'Negative' ? (
                                            <Chip icon={<WarningAmberIcon />} label="GHOST CONSUMPTION" color="error" size="small" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} />
                                        ) : item.status === 'Empty' ? (
                                            <Chip label="OUT OF STOCK" color="default" size="small" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} />
                                        ) : (
                                            <Chip label="IN STOCK" color="success" size="small" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {stockReconciliation.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                        NO STOCK DATA AVAILABLE. RECORD A GRN OR DAILY LOG TO BEGIN RECONCILIATION.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <GrnEntryForm resources={resources} onSubmit={submitGrn} />

            {/* GRN HISTORY TABLE */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'text.secondary' }}>RECENT_RECEIPTS</Typography>
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 700 }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>DATE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>RESOURCE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>QTY RECEIVED</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>INVOICE REF</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>SUPPLIER</TableCell>
                                <TableCell align="center" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>ACTION</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedGrns.map(grn => {
                                const res = resources.find(r => r.id === grn.resourceId) || {};
                                return (
                                    <TableRow key={grn.id} hover>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{grn.date}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{res.code} - {res.description}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'success.light', whiteSpace: 'nowrap' }}>+ {grn.qty} {res.unit}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>{grn.invoiceNo || '-'}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{grn.supplier || '-'}</TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" color="error" onClick={() => deleteGrn(grn.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {sortedGrns.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                        No recent receipts.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}