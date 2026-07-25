import React, { useState, useMemo, useEffect } from "react";
import {
    Box, Typography, Button, Paper, Grid, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, MenuItem, Chip, IconButton
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SaveIcon from '@mui/icons-material/Save';
import { exportRaBillPdf } from "../../utils/exportPdf";
import { tableInputActiveStyle } from "../../styles";

import { useSettings } from "../../context/SettingsContext";

// 🔥 IMPORT REACT QUERY HOOKS
import { useProject, useProjectBoqs, useMasterBoqs, useResources, useUpdateProject } from '../../hooks/useQueries';
import { useProjectCalculations } from '../../hooks/useProjectCalculations';

// ============================================================================
// 🧩 SUB-COMPONENT 1: BILL ITEM ROW (Micro-State for 60fps typing)
// ============================================================================
const BillItemRow = ({ item, rowData, updateCurrentQty }) => {
    // Localize the typing state to prevent the entire table from recalculating on every keystroke
    const [localQty, setLocalQty] = useState(rowData.currentQty || 0);

    // Sync if parent changes
    useEffect(() => {
        setLocalQty(rowData.currentQty || 0);
    }, [rowData.currentQty]);

    const handleBlur = () => {
        if (Number(localQty) !== Number(rowData.currentQty)) {
            updateCurrentQty(item.id, localQty);
        }
    };

    return (
        <TableRow hover>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{item.slNo}</TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{item.displayDesc}</TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{item.displayUnit}</TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{Number(rowData.rate || 0).toFixed(2)}</TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'info.light' }}>{Number(rowData.mbookQty || 0).toFixed(2)}</TableCell>
            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'warning.light' }}>{Number(rowData.prevQty || 0).toFixed(2)}</TableCell>
            <TableCell>
                <input
                    type="number"
                    value={localQty}
                    onChange={(e) => setLocalQty(e.target.value)}
                    onBlur={handleBlur}
                    style={{ ...tableInputActiveStyle, minWidth: '80px' }}
                />
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                {(Number(localQty || 0) * Number(rowData.rate || 0)).toFixed(2)}
            </TableCell>
        </TableRow>
    );
};

// ============================================================================
// 🧩 SUB-COMPONENT 2: NEW BILL GENERATOR
// ============================================================================
const NewBillGenerator = ({ bills, renderedProjectBoq, billingPhase, billNo, setIsCreating, saveBillToDb, formatCurrency, settings }) => {
    const [currentBillItems, setCurrentBillItems] = useState({});
    const [taxPercent, setTaxPercent] = useState(18);

    // Initialize the bill items
    useEffect(() => {
        const initialItems = {};
        const targetItems = billingPhase === "All Phases"
            ? renderedProjectBoq
            : renderedProjectBoq.filter(i => (i.phase || "General") === billingPhase);

        targetItems.forEach(item => {
            const prevQty = bills.reduce((sum, b) => {
                const billedItem = b.items.find(i => i.boqId === item.id);
                return sum + (billedItem ? Number(billedItem.currentQty || 0) : 0);
            }, 0);

            const workDoneQty = Number(item.computedQty || 0);
            let unbilledQty = workDoneQty - prevQty;
            if (unbilledQty < 0) unbilledQty = 0;

            initialItems[item.id] = {
                prevQty: prevQty,
                mbookQty: workDoneQty,
                currentQty: unbilledQty,
                rate: Number(item.rate || 0)
            };
        });
        setCurrentBillItems(initialItems);
    }, [billingPhase, renderedProjectBoq, bills]);

    const updateCurrentQty = (boqId, qty) => {
        setCurrentBillItems(prev => ({ ...prev, [boqId]: { ...prev[boqId], currentQty: Number(qty) } }));
    };

    const { currentSubTotal, currentTax, currentGrandTotal } = useMemo(() => {
        let sub = 0;
        Object.values(currentBillItems).forEach(item => {
            sub += (Number(item.currentQty || 0) * Number(item.rate || 0));
        });
        const tax = sub * (Number(taxPercent || 0) / 100);
        return { currentSubTotal: sub, currentTax: tax, currentGrandTotal: sub + tax };
    }, [currentBillItems, taxPercent]);

    const handleSave = () => {
        if (currentSubTotal <= 0) return alert("Cannot save a bill with zero value.");

        const newBill = {
            id: crypto.randomUUID(),
            billNo,
            phase: billingPhase,
            date: new Date().toISOString().split('T')[0],
            status: "Approved",
            items: Object.entries(currentBillItems).map(([boqId, data]) => ({
                boqId,
                prevQty: Number(data.prevQty || 0),
                currentQty: Number(data.currentQty || 0),
                rate: Number(data.rate || 0),
                amount: Number(data.currentQty || 0) * Number(data.rate || 0)
            })),
            subTotal: currentSubTotal,
            taxPercent: Number(taxPercent || 0),
            taxAmount: currentTax,
            grandTotal: currentGrandTotal
        };

        saveBillToDb(newBill);
    };

    return (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={3}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '16px', sm: '20px' } }}>
                        GENERATE NEW RA BILL: <span style={{ color: '#3b82f6' }}>{billNo}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>
                        BILLING PHASE: {billingPhase.toUpperCase()}
                    </Typography>
                </Box>
                <Button variant="outlined" color="error" fullWidth={{ xs: true, sm: false }} onClick={() => setIsCreating(false)} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                    CANCEL
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800 }}>
                    <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                        <TableRow>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>SL.NO</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', width: '30%' }}>DESCRIPTION</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>UNIT</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>RATE ({settings.currencySymbol})</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'info.main', whiteSpace: 'nowrap' }}>MBOOK QTY</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'warning.main', whiteSpace: 'nowrap' }}>PREV BILLED</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'success.main', whiteSpace: 'nowrap' }}>CURRENT BILL QTY</TableCell>
                            <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>AMOUNT ({settings.currencySymbol})</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {renderedProjectBoq.filter(i => billingPhase === "All Phases" || (i.phase || "General") === billingPhase).map((item) => {
                            const rowData = currentBillItems[item.id];
                            if (!rowData) return null;
                            return (
                                <BillItemRow
                                    key={item.id}
                                    item={item}
                                    rowData={rowData}
                                    updateCurrentQty={updateCurrentQty}
                                />
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent={{ xs: 'center', sm: 'flex-end' }}>
                <Paper elevation={0} variant="outlined" sx={{ width: { xs: '100%', sm: 400 }, p: { xs: 2, sm: 3 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>SUBTOTAL:</Typography>
                        <Typography fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(currentSubTotal)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} pb={2} borderBottom="1px solid" borderColor="divider">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>TAX (%):</Typography>
                            <input type="number" value={taxPercent} onChange={e => setTaxPercent(e.target.value)} style={{ ...tableInputActiveStyle, width: 60 }} />
                        </Box>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>{formatCurrency(currentTax)}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={3} color="success.main" flexWrap="wrap" gap={1}>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '14px', sm: '16px' } }}>GRAND_TOTAL:</Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '14px', sm: '16px' } }}>{formatCurrency(currentGrandTotal)}</Typography>
                    </Box>
                    <Button variant="contained" color="success" fullWidth size="large" onClick={handleSave} startIcon={<SaveIcon />} sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '12px', sm: '14px' } }}>
                        APPROVE & SAVE RA BILL
                    </Button>
                </Paper>
            </Box>
        </Paper>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function ClientBillingTab({ projectId }) {
    const { formatCurrency, settings } = useSettings();

    // 1. Fetching Data Independently via React Query
    const { data: project } = useProject(projectId);
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
    const { data: rawMasterBoqs = [] } = useMasterBoqs();
    const { data: rawResources = [] } = useResources();
    const updateProjectMutation = useUpdateProject();

    // 2. Safe Parsing
    const parseSafe = (str, fallback = []) => {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try { return JSON.parse(str); } catch { return fallback; }
    };

    const bills = useMemo(() => {
        if (!project || !project.raBills) return [];
        return typeof project.raBills === 'string' ? parseSafe(project.raBills, []) : project.raBills;
    }, [project?.raBills]);

    const projectBoqItems = useMemo(() => rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })), [rawProjectBoqs]);
    const masterBoqs = useMemo(() => rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) })), [rawMasterBoqs]);
    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}), rateHistory: parseSafe(r.rateHistory, []) })), [rawResources]);

    // 3. Engine Calculations
    const { renderedProjectBoq, totalAmount } = useProjectCalculations(projectBoqItems, masterBoqs, resources, project);

    const availablePhases = useMemo(() => {
        const phases = new Set(renderedProjectBoq.map(item => item.phase || "General"));
        return Array.from(phases);
    }, [renderedProjectBoq]);

    const [isCreating, setIsCreating] = useState(false);
    const [billingPhase, setBillingPhase] = useState("All Phases");

    const totalContractValue = totalAmount;
    const totalBilled = bills.reduce((sum, bill) => sum + Number(bill.subTotal || 0), 0);
    const unbilledAmount = totalContractValue - totalBilled;

    const handleCreateNewBill = () => {
        const targetItems = billingPhase === "All Phases"
            ? renderedProjectBoq
            : renderedProjectBoq.filter(i => (i.phase || "General") === billingPhase);

        if (targetItems.length === 0) {
            return alert(`No BOQ items found for Phase: ${billingPhase}`);
        }
        setIsCreating(true);
    };

    const saveBillToDb = async (newBill) => {
        const updatedBills = [...bills, newBill];
        await updateProjectMutation.mutateAsync({
            id: projectId,
            data: { raBills: JSON.stringify(updatedBills) }
        });
        setIsCreating(false);
    };

    const deleteBill = async (billId) => {
        if (window.confirm("Delete this RA Bill? This will release the quantities back to the unbilled pool.")) {
            const updatedBills = bills.filter(b => b.id !== billId);
            await updateProjectMutation.mutateAsync({
                id: projectId,
                data: { raBills: JSON.stringify(updatedBills) }
            });
        }
    };

    if (isCreating) {
        return (
            <NewBillGenerator
                bills={bills}
                renderedProjectBoq={renderedProjectBoq}
                billingPhase={billingPhase}
                billNo={`RA-${String(bills.length + 1).padStart(2, '0')}`}
                setIsCreating={setIsCreating}
                saveBillToDb={saveBillToDb}
                formatCurrency={formatCurrency}
                settings={settings}
            />
        );
    }

    return (
        <Box>
            <Grid container spacing={2} mb={4}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 1 }}>TOTAL_CONTRACT_VALUE</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '18px', sm: '24px' } }}>{formatCurrency(totalContractValue)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 1 }}>CUMULATIVE_BILLED</Typography>
                        <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '18px', sm: '24px' } }}>{formatCurrency(totalBilled)}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 1 }}>UNBILLED_BALANCE</Typography>
                        <Typography variant="h5" fontWeight="bold" color="warning.main" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '18px', sm: '24px' } }}>{formatCurrency(unbilledAmount)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={3} gap={2}>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", pt: { md: 1 }, fontSize: { xs: '16px', sm: '20px' } }}>
                        APPROVED_RA_BILLS
                    </Typography>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                            select
                            size="small"
                            label="SELECT PHASE"
                            value={billingPhase}
                            onChange={(e) => setBillingPhase(e.target.value)}
                            sx={{ minWidth: { xs: '100%', sm: 200 } }}
                            InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }}
                            InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}
                        >
                            <MenuItem value="All Phases" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>ALL PHASES</MenuItem>
                            {availablePhases.map(phase => (
                                <MenuItem key={phase} value={phase} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                    {phase.toUpperCase()}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button variant="contained" color="primary" fullWidth={{ xs: true, sm: false }} startIcon={<AddIcon />} onClick={handleCreateNewBill} disableElevation sx={{ height: 40, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', flexShrink: 0 }}>
                            GENERATE BILL
                        </Button>
                    </Box>
                </Box>

                {bills.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', p: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>NO BILLS GENERATED YET</Typography>
                ) : (
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 800 }}>
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                                <TableRow>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>BILL_NO</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>PHASE</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>DATE</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>SUBTOTAL ({settings.currencySymbol})</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>TAX ({settings.currencySymbol})</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>GRAND_TOTAL ({settings.currencySymbol})</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>STATUS</TableCell>
                                    <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bills.map((bill) => (
                                    <TableRow key={bill.id} hover>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#3b82f6', whiteSpace: 'nowrap' }}>{bill.billNo}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{bill.phase || "All Phases"}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{bill.date}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{formatCurrency(bill.subTotal, false)}</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{formatCurrency(bill.taxAmount, false)}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'success.main', whiteSpace: 'nowrap' }}>{formatCurrency(bill.grandTotal, false)}</TableCell>
                                        <TableCell><Chip label={bill.status} color="success" size="small" icon={<CheckCircleIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} /></TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            <IconButton size="small" color="info" onClick={() => exportRaBillPdf(project, bill, renderedProjectBoq)}><PictureAsPdfIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => deleteBill(bill.id)}><DeleteIcon fontSize="small" /></IconButton>
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