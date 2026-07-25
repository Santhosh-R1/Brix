import React, { useState, useMemo, useEffect } from "react";
import {
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, MenuItem, Chip, IconButton, Tooltip, Zoom
} from "@mui/material";
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SaveIcon from '@mui/icons-material/Save';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import AddIcon from '@mui/icons-material/Add';
import TimelineIcon from '@mui/icons-material/Timeline';
import { exportPoPdf } from "../../utils/exportPdf";
import { tableInputActiveStyle } from "../../styles";
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

import { useSettings } from "../../context/SettingsContext";

// 🔥 IMPORT REACT QUERY HOOKS
import { useProject, useProjectBoqs, useMasterBoqs, useResources, useCrmContacts, useUpdateProject } from '../../hooks/useQueries';
import { useProjectCalculations } from '../../hooks/useProjectCalculations';

// ============================================================================
// 🧩 SUB-COMPONENT 1: PRICE INSIGHT CHART (Unchanged)
// ============================================================================
const PriceInsight = ({ resource, formatCurrency }) => {
    const history = useMemo(() => {
        return (resource?.rateHistory || []).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [resource]);

    if (history.length < 2) return <Typography variant="caption" sx={{ p: 1, display: 'block' }}>Limited price data available</Typography>;

    return (
        <Box sx={{ width: 220, height: 120, p: 1.5, bgcolor: '#0b172d', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold', color: 'primary.main', fontFamily: "'JetBrains Mono', monospace" }}>
                MARKET_TREND ({resource.unit})
            </Typography>
            <ResponsiveContainer width="100%" height="70%">
                <LineChart data={history}>
                    <Line type="monotone" dataKey="rate" stroke="#3b82f6" dot={false} strokeWidth={2} />
                    <YAxis hide domain={['auto', 'auto']} />
                </LineChart>
            </ResponsiveContainer>
            <Box display="flex" justifyContent="space-between" mt={1}>
                <Typography sx={{ fontSize: '9px', opacity: 0.6 }}>Old: {formatCurrency(history[0].rate)}</Typography>
                <Typography sx={{ fontSize: '9px', fontWeight: 'bold' }}>New: {formatCurrency(history[history.length - 1].rate)}</Typography>
            </Box>
        </Box>
    );
};

// ============================================================================
// 🧩 SUB-COMPONENT 2: DRAFT PO ROW (Micro-State for 60fps typing)
// ============================================================================
const DraftPoRow = ({ resId, rowData, resource, updatePoItem, formatCurrency, settings }) => {
    // Localize typing state to prevent full-table re-renders
    const [localQty, setLocalQty] = useState(rowData.orderQty || "");
    const [localRate, setLocalRate] = useState(rowData.rate || "");
    const [localDesc, setLocalDesc] = useState(rowData.description || "");
    const [localUnit, setLocalUnit] = useState(rowData.unit || "");

    useEffect(() => { setLocalQty(rowData.orderQty || ""); }, [rowData.orderQty]);
    useEffect(() => { setLocalRate(rowData.rate || ""); }, [rowData.rate]);
    useEffect(() => { setLocalDesc(rowData.description || ""); }, [rowData.description]);
    useEffect(() => { setLocalUnit(rowData.unit || ""); }, [rowData.unit]);

    const handleBlur = (field, val) => {
        if (rowData[field] !== val) {
            updatePoItem(resId, field, val);
        }
    };

    return (
        <TableRow hover>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                <Box display="flex" alignItems="center">
                    {rowData.isCustom ? (
                        <input
                            value={localDesc}
                            placeholder="Type description..."
                            onChange={(e) => setLocalDesc(e.target.value)}
                            onBlur={() => handleBlur('description', localDesc)}
                            style={{ ...tableInputActiveStyle, width: '100%' }}
                        />
                    ) : (
                        <>
                            <strong>{rowData.code}</strong> - {rowData.description}
                            {resource && (
                                <Tooltip TransitionComponent={Zoom} title={<PriceInsight resource={resource} formatCurrency={formatCurrency} />} arrow placement="right">
                                    <IconButton size="small" color="primary" sx={{ ml: 1, p: 0.5, opacity: 0.7, '&:hover': { opacity: 1 } }}>
                                        <TimelineIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </>
                    )}
                </Box>
            </TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                {rowData.isCustom ? (
                    <input
                        value={localUnit}
                        placeholder="Unit"
                        onChange={(e) => setLocalUnit(e.target.value)}
                        onBlur={() => handleBlur('unit', localUnit)}
                        style={{ ...tableInputActiveStyle, width: '60px' }}
                    />
                ) : rowData.unit}
            </TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'info.light' }}>
                {rowData.estRequired > 0 ? Number(rowData.estRequired || 0).toFixed(2) : '-'}
            </TableCell>
            <TableCell>
                <input
                    type="number"
                    value={localQty}
                    placeholder="0"
                    onChange={(e) => setLocalQty(e.target.value)}
                    onBlur={() => handleBlur('orderQty', localQty)}
                    style={{ ...tableInputActiveStyle, minWidth: '60px' }}
                />
            </TableCell>
            <TableCell>
                <input
                    type="number"
                    value={localRate}
                    onChange={(e) => setLocalRate(e.target.value)}
                    onBlur={() => handleBlur('rate', localRate)}
                    style={{ ...tableInputActiveStyle, minWidth: '80px' }}
                />
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: Number(localQty) > 0 ? 'success.main' : 'text.primary' }}>
                {Number((Number(localQty) || 0) * (Number(localRate) || 0)).toFixed(2)}
            </TableCell>
        </TableRow>
    );
};

// ============================================================================
// 🧩 SUB-COMPONENT 3: NEW PO GENERATOR
// ============================================================================
const NewPoGenerator = ({ initialItems, poNumber, suppliers, resources, pos, siteRequests, updateProject, setIsCreating, formatCurrency, settings }) => {
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [taxPercent, setTaxPercent] = useState(18);
    const [poItems, setPoItems] = useState(initialItems);

    const addUnplannedItem = () => {
        const customId = `custom-${crypto.randomUUID()}`;
        setPoItems(prev => ({
            ...prev,
            [customId]: { isCustom: true, code: 'UNPLANNED', description: '', unit: '', estRequired: 0, orderQty: 0, rate: 0 }
        }));
    };

    const updatePoItem = (resId, field, value) => {
        setPoItems(prev => ({
            ...prev,
            [resId]: {
                ...prev[resId],
                [field]: (field === 'description' || field === 'unit') ? value : Number(value)
            }
        }));
    };

    const { currentSubTotal, currentTax, currentGrandTotal } = useMemo(() => {
        let sub = 0;
        Object.values(poItems).forEach(item => { if (item.orderQty > 0) sub += (Number(item.orderQty || 0) * Number(item.rate || 0)); });
        const tax = sub * (Number(taxPercent || 0) / 100);
        return { currentSubTotal: sub, currentTax: tax, currentGrandTotal: sub + tax };
    }, [poItems, taxPercent]);

    const savePurchaseOrder = async () => {
        if (!selectedSupplier) return alert("Please select a supplier.");
        if (currentSubTotal <= 0) return alert("Please enter quantities and rates to order.");

        const activeItems = Object.entries(poItems)
            .filter(([id, data]) => data.orderQty > 0)
            .map(([id, data]) => ({
                resId: id, code: data.code, description: data.description, unit: data.unit, qty: data.orderQty, rate: data.rate, amount: data.orderQty * data.rate, linkedReqId: data.linkedReqId
            }));

        const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name || "Unknown";
        const newPo = {
            id: crypto.randomUUID(),
            poNumber,
            date: new Date().toISOString().split('T')[0],
            supplierId: selectedSupplier,
            supplierName,
            status: "Issued",
            items: activeItems,
            subTotal: currentSubTotal,
            taxPercent: Number(taxPercent),
            taxAmount: currentTax,
            grandTotal: currentGrandTotal
        };

        let updatedRequests = [...siteRequests];
        activeItems.forEach(item => {
            if (item.linkedReqId) {
                updatedRequests = updatedRequests.map(r => r.id === item.linkedReqId ? { ...r, status: 'Ordered' } : r);
            }
        });

        await updateProject('purchaseOrders', [...pos, newPo]);
        await updateProject('materialRequests', updatedRequests);
        setIsCreating(false);
    };

    return (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={3}>
                <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '16px', sm: '20px' } }}>
                    DRAFT PURCHASE ORDER: <span style={{ color: '#3b82f6' }}>{poNumber}</span>
                </Typography>
                <Button variant="outlined" color="error" fullWidth={{ xs: true, sm: false }} onClick={() => setIsCreating(false)} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>CANCEL</Button>
            </Box>

            <Box mb={3} sx={{ width: { xs: '100%', sm: '300px' } }}>
                <TextField select size="small" fullWidth label="SELECT SUPPLIER / VENDOR" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                    {suppliers.map(s => <MenuItem key={s.id} value={s.id} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{s.name}</MenuItem>)}
                </TextField>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)', maxHeight: 500, overflowX: 'auto' }}>
                <Table size="small" stickyHeader sx={{ minWidth: 800 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ bgcolor: 'rgba(13, 31, 60, 1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>RESOURCE</TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(13, 31, 60, 1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>UNIT</TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(13, 31, 60, 1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'info.main' }}>EST. REQ.</TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(13, 31, 60, 1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'success.main' }}>ORDER QTY</TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(13, 31, 60, 1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>RATE ({settings.currencySymbol})</TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(13, 31, 60, 1)', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>AMOUNT ({settings.currencySymbol})</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(poItems).map(([resId, rowData]) => {
                            const resource = !rowData.isCustom ? resources.find(r => r.id === resId) : null;
                            return (
                                <DraftPoRow
                                    key={resId} resId={resId} rowData={rowData} resource={resource}
                                    updatePoItem={updatePoItem} formatCurrency={formatCurrency} settings={settings}
                                />
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'flex-start' }} gap={3}>
                <Button variant="outlined" color="info" startIcon={<AddIcon />} onClick={addUnplannedItem} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', alignSelf: { xs: 'stretch', lg: 'flex-start' } }}>+ ADD UNPLANNED ITEM</Button>
                <Paper elevation={0} variant="outlined" sx={{ width: { xs: '100%', lg: 400 }, p: { xs: 2, sm: 3 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" mb={2}><Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>SUBTOTAL:</Typography><Typography fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(currentSubTotal)}</Typography></Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} pb={2} borderBottom="1px solid" borderColor="divider">
                        <Box display="flex" alignItems="center" gap={1}><Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>TAX (%):</Typography><input type="number" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} style={{ ...tableInputActiveStyle, width: 60 }} /></Box>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(currentTax)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={3} color="success.main"><Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '13px', sm: '14px' } }}>GRAND TOTAL:</Typography><Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '13px', sm: '14px' } }}>{formatCurrency(currentGrandTotal)}</Typography></Box>
                    <Button variant="contained" color="success" fullWidth size="large" onClick={savePurchaseOrder} startIcon={<SaveIcon />} sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>ISSUE PURCHASE ORDER</Button>
                </Paper>
            </Box>
        </Paper>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function ProcurementTab({ projectId }) {
    const { formatCurrency, settings } = useSettings();

    // 1. Fetch Data Independently
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
        return {
            ...rawProject,
            purchaseOrders: parseSafe(rawProject.purchaseOrders, []),
            materialRequests: parseSafe(rawProject.materialRequests, [])
        };
    }, [rawProject]);

    const pos = project?.purchaseOrders || [];
    const siteRequests = project?.materialRequests || [];

    const projectBoqItems = useMemo(() => rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })), [rawProjectBoqs]);
    const masterBoqs = useMemo(() => rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) })), [rawMasterBoqs]);
    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}), rateHistory: parseSafe(r.rateHistory, []) })), [rawResources]);

    // 3. Engine Calculations
    const { projectResourceMap } = useProjectCalculations(projectBoqItems, masterBoqs, resources, project);

    const suppliers = crmContacts.filter(c => c.type === 'Vendor' || c.type === 'Supplier' || c.type === 'Subcontractor');

    const [isCreating, setIsCreating] = useState(false);
    const [initialPoData, setInitialPoData] = useState(null);

    const updateProject = async (field, value) => {
        await updateProjectMutation.mutateAsync({
            id: projectId,
            data: { [field]: JSON.stringify(value) }
        });
    };

    const handleCreateNewPO = () => {
        const initialItems = {};
        Object.entries(projectResourceMap).forEach(([resId, data]) => {
            const masterResource = resources.find(r => r.id === resId);
            const rate = masterResource?.rates?.[project?.region] || 0;
            initialItems[resId] = { isCustom: false, code: data.code, description: data.description, unit: data.unit, estRequired: data.estimatedQty, orderQty: 0, rate: rate };
        });
        setInitialPoData(initialItems);
        setIsCreating(true);
    };

    const handleConvertRequestToPo = (req) => {
        const customId = `custom-${crypto.randomUUID()}`;
        setInitialPoData({
            [customId]: { isCustom: true, code: 'REQ', description: req.item, unit: 'Nos', estRequired: req.qty, orderQty: req.qty, rate: 0, linkedReqId: req.id }
        });
        setIsCreating(true);
    };

    const deletePo = async (poId) => {
        if (window.confirm("Are you sure you want to delete this Purchase Order?")) {
            await updateProject('purchaseOrders', pos.filter(p => p.id !== poId));
        }
    };

    if (isCreating) {
        return (
            <NewPoGenerator
                initialItems={initialPoData}
                poNumber={`PO-${String(pos.length + 1).padStart(3, '0')}`}
                suppliers={suppliers}
                resources={resources}
                pos={pos}
                siteRequests={siteRequests}
                updateProject={updateProject}
                setIsCreating={setIsCreating}
                formatCurrency={formatCurrency}
                settings={settings}
            />
        );
    }

    const pendingRequests = siteRequests.filter(r => r.status === 'Pending Procurement');

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            {/* INCOMING SITE REQUISITIONS */}
            {pendingRequests.length > 0 && (
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'warning.main', bgcolor: 'rgba(245, 158, 11, 0.05)' }}>
                    <Typography variant="h6" fontWeight="bold" color="warning.main" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 2, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '14px', sm: '18px' } }}>
                        <AssignmentLateIcon /> PENDING SITE REQUISITIONS ({pendingRequests.length})
                    </Typography>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 600 }}>
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                                <TableRow>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#fff' }}>DATE</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#fff' }}>REQUESTED ITEM</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#fff' }}>QTY</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#fff' }}>URGENCY</TableCell>
                                    <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#fff' }}>ACTION</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingRequests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{req.date}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold' }}>{req.item}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{req.qty}</TableCell>
                                        <TableCell><Chip label={req.urgency} color={req.urgency === 'High' ? 'error' : 'default'} size="small" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} /></TableCell>
                                        <TableCell align="right">
                                            <Button variant="contained" color="warning" size="small" onClick={() => handleConvertRequestToPo(req)} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', whiteSpace: 'nowrap' }}>
                                                CONVERT TO P.O.
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}

            {/* ISSUED PURCHASE ORDERS */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} mb={3}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '16px', sm: '20px' } }}>ISSUED_PURCHASE_ORDERS</Typography>
                    <Button variant="contained" color="primary" startIcon={<AddShoppingCartIcon />} onClick={handleCreateNewPO} disableElevation sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                        DRAFT NEW P.O.
                    </Button>
                </Box>

                {pos.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>NO PURCHASE ORDERS ISSUED</Typography>
                ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 800 }}>
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <TableRow>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>PO_NUMBER</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>DATE</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>SUPPLIER</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>ITEMS</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>TOTAL ({settings.currencySymbol})</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>STATUS</TableCell>
                                    <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pos.map((po) => (
                                    <TableRow key={po.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#3b82f6' }}>{po.poNumber}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{po.date}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{po.supplierName}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{po.items.length} items</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'success.main', whiteSpace: 'nowrap' }}>{formatCurrency(po.grandTotal, false)}</TableCell>
                                        <TableCell><Chip label={po.status} color="info" size="small" icon={<LocalShippingIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} /></TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            <IconButton size="small" color="info" onClick={() => exportPoPdf(project, po)}><PictureAsPdfIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => deletePo(po.id)}><DeleteIcon fontSize="small" /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
}