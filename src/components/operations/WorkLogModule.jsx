import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Box, Typography, Paper, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, TextField, MenuItem,
    Grid, Stack, alpha, useTheme, Select, Dialog, DialogTitle,
    DialogContent, DialogActions, List, ListItem, ListItemText, InputBase, Chip
} from '@mui/material';

// Icons
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SortIcon from '@mui/icons-material/Sort';
import DownloadIcon from '@mui/icons-material/Download';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TimerIcon from '@mui/icons-material/Timer';
import * as XLSX from 'xlsx';

const STATUS_OPTIONS = ['Ongoing', 'Completed', 'On Hold', 'Cancelled'];
const LOCATION_OPTIONS = ['Office', 'Site', 'Work From Home', 'Leave'];

export default function WorkLogModule({
    logs, staff, projects, currentUser, hasClearance, loadData
}) {
    const theme = useTheme();
    const formRef = useRef(null);

    // --- LOCAL UI STATE ---
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [columnOrder, setColumnOrder] = useState([
        { id: 'slNo', label: 'SL' },
        { id: 'date', label: 'DATE' },
        { id: 'staffId', label: 'PERSONNEL' },
        { id: 'projectId', label: 'PROJECT' },
        { id: 'workCategory', label: 'CATEGORY' },
        { id: 'durationMinutes', label: 'MINS' },
        { id: 'details', label: 'WORK EXECUTED' },
        { id: 'remarks', label: 'LOCATION' },
        { id: 'status', label: 'STATUS' },
    ]);
    const [colSettingsOpen, setColSettingsOpen] = useState(false);
    const [filterMonth, setFilterMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    // --- 🔥 PERSISTENT TIMER LOGIC ---
    const [activeTimer, setActiveTimer] = useState(() => {
        const saved = localStorage.getItem('openprix_active_timer');
        return saved ? JSON.parse(saved) : null;
    });
    const [elapsedDisplay, setElapsedDisplay] = useState("00:00:00");
    const [categories, setCategories] = useState(["Design", "Drafting", "Estimation", "Scheduling", "Liaison", "Site Visit"]);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        staffId: currentUser?.id || "",
        projectId: "",
        details: "",
        remarks: "Office",
        status: "Ongoing",
        workCategory: "Design",
        durationMinutes: 0
    });

    // Sync categories from settings
    useEffect(() => {
        const loadSettings = async () => {
            const res = await window.api.db.getSettings('work_log_categories');
            if (res?.data) setCategories(res.data);
        };
        loadSettings();
    }, []);

    // Timer persistence
    useEffect(() => {
        if (activeTimer) localStorage.setItem('openprix_active_timer', JSON.stringify(activeTimer));
        else localStorage.removeItem('openprix_active_timer');
    }, [activeTimer]);

    // Clock engine
    useEffect(() => {
        let interval;
        if (activeTimer) {
            const tick = () => {
                const diff = Math.floor((Date.now() - activeTimer.startTime) / 1000);
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                setElapsedDisplay(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            };
            tick();
            interval = setInterval(tick, 1000);
        }
        return () => clearInterval(interval);
    }, [activeTimer]);

    const handleStartStopTimer = () => {
        if (!activeTimer) {
            setActiveTimer({ startTime: Date.now(), projectId: formData.projectId });
        } else {
            const totalMins = Math.max(1, Math.ceil((Date.now() - activeTimer.startTime) / 60000));
            setFormData(prev => ({ ...prev, durationMinutes: totalMins, projectId: activeTimer.projectId }));
            setActiveTimer(null);
            formRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- ACTIONS ---
    const handleSaveLog = async () => {
        if (!formData.details && formData.remarks !== 'Leave') return alert("Work details required.");
        const newLog = { id: crypto.randomUUID(), slNo: logs.length + 1, ...formData, createdAt: Date.now() };
        await window.api.db.saveWorkLog(newLog);
        setFormData(prev => ({ ...prev, details: "", durationMinutes: 0 }));
        loadData();
    };

    const handleUpdateField = async (id, field, value) => {
        const originalLog = logs.find(l => l.id === id);
        if (!originalLog) return;
        if (originalLog[field] === value) return;

        const updatedLog = { ...originalLog, [field]: value };
        try {
            await window.api.db.updateWorkLog(id, updatedLog);
            loadData();
        } catch (err) {
            console.error("Update failed:", err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Permanently delete this entry?")) {
            await window.api.db.deleteWorkLog(id);
            loadData();
        }
    };

    // --- COLUMN REARRANGING ---
    const moveColumn = (index, direction) => {
        const newOrder = [...columnOrder];
        if (direction === 'up' && index > 0) {
            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        }
        setColumnOrder(newOrder);
    };

    // --- SORTING ---
    const handleSort = (key) => {
        setSortConfig({ key, direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    };

    const sortedLogs = useMemo(() => {
        let filtered = logs.filter(log => log.date?.startsWith(filterMonth));

        return [...filtered].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            if (sortConfig.key === 'staffId') {
                aVal = staff.find(s => s.id === a.staffId)?.name || "";
                bVal = staff.find(s => s.id === b.staffId)?.name || "";
            } else if (sortConfig.key === 'projectId') {
                aVal = projects.find(p => p.id === a.projectId)?.name || "";
                bVal = projects.find(p => p.id === b.projectId)?.name || "";
            }

            if (sortConfig.key === 'slNo' || sortConfig.key === 'durationMinutes') {
                const numA = Number(aVal) || 0;
                const numB = Number(bVal) || 0;
                return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
            }

            if (aVal === null || aVal === undefined) aVal = "";
            if (bVal === null || bVal === undefined) bVal = "";

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [logs, filterMonth, sortConfig, staff, projects]);

    // --- EXPORT ---
    const handleExportExcel = () => {
        if (sortedLogs.length === 0) return alert("No records found to export.");

        const exportData = sortedLogs.map(log => ({
            "SL NO": log.slNo,
            "DATE": log.date,
            "PERSONNEL": staff.find(s => s.id === log.staffId)?.name || 'Unknown',
            "PROJECT": projects.find(p => p.id === log.projectId)?.name || 'Internal / Office',
            "CATEGORY": log.workCategory,
            "TIME (MINS)": log.durationMinutes,
            "LOCATION": log.remarks || 'Office',
            "STATUS": log.status || 'Ongoing',
            "WORK EXECUTED": log.details
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Firm_Logs");
        XLSX.writeFile(wb, `Firm_Ledger_${filterMonth}.xlsx`);
    };

    // --- STYLES ---
    const ghostStyle = {
        fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', width: '100%', padding: '4px 8px',
        borderRadius: '4px', border: '1px solid transparent',
        '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.05), borderColor: 'divider' },
        '&.Mui-focused': { bgcolor: alpha(theme.palette.background.default, 0.8), borderColor: theme.palette.primary.main }
    };

    return (
        <Box>
            {/* 1. TIMER NOTIFIER */}
            {activeTimer && (
                <Paper sx={{ p: 1.5, mb: 2, bgcolor: alpha(theme.palette.success.main, 0.05), border: '1px solid', borderColor: 'success.dark', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TimerIcon color="success" sx={{ animation: 'pulse 1.5s infinite' }} />
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                            WORKING_ON: <span style={{ color: theme.palette.info.main }}>{projects.find(p => p.id === activeTimer.projectId)?.name || "General Office"}</span>
                        </Typography>
                        <Chip label={elapsedDisplay} size="small" color="success" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }} />
                    </Stack>
                    <Button variant="contained" color="success" size="small" startIcon={<StopIcon />} onClick={handleStartStopTimer} sx={{ borderRadius: 4 }}>STOP & LOG</Button>
                </Paper>
            )}

            {/* 2. CONTROLS */}
            <Box display="flex" justifyContent="space-between" mb={3}>
                <TextField type="month" size="small" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} sx={{ width: 180 }} />
                <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => setColSettingsOpen(true)}><ViewColumnIcon /></IconButton>
                    <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleExportExcel}>EXPORT</Button>
                </Stack>
            </Box>

            {/* 3. QUICK ADD FORM */}
            <Paper ref={formRef} elevation={0} sx={{ p: 2, mb: 4, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.2), borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={2}>
                        <TextField fullWidth label="DATE" type="date" size="small" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField
                            fullWidth select label="PERSONNEL" size="small"
                            value={staff.some(s => s.id === formData.staffId) ? formData.staffId : ""}
                            onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                            disabled={!hasClearance(4)}
                        >
                            {staff.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth select label="SELECT PROJECT" size="small" value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })}>
                            <MenuItem value="">-- General / Office --</MenuItem>
                            {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <TextField fullWidth select label="CATEGORY" size="small" value={formData.workCategory} onChange={e => setFormData({ ...formData, workCategory: e.target.value })}>
                            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                        <TextField fullWidth label="MINS" type="number" size="small" value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField fullWidth select label="LOCATION" size="small" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })}>
                            {LOCATION_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <TextField fullWidth select label="STATUS" size="small" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                            {STATUS_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="WORK EXECUTED" size="small" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth variant="outlined"
                            color={activeTimer ? "success" : "primary"}
                            startIcon={activeTimer ? <StopIcon /> : <PlayArrowIcon />}
                            onClick={handleStartStopTimer}
                            sx={{ height: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 'bold', borderWidth: 2 }}
                        >
                            {activeTimer ? "STOP" : "START"}
                        </Button>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button fullWidth variant="contained" color="primary" onClick={handleSaveLog} sx={{ height: 40, fontWeight: 'bold' }}>COMMIT</Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* 4. TABLE */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'transparent', borderRadius: 2 }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
                        <TableRow>
                            {columnOrder.map(col => (
                                <TableCell
                                    key={col.id}
                                    onClick={() => handleSort(col.id)}
                                    sx={{ cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary', whiteSpace: 'nowrap' }}
                                >
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        {col.label} <SortIcon sx={{ fontSize: 14, opacity: sortConfig.key === col.id ? 1 : 0.2 }} />
                                    </Box>
                                </TableCell>
                            ))}
                            <TableCell />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedLogs.map(log => (
                            <TableRow key={log.id} hover>
                                {columnOrder.map(col => (
                                    <TableCell key={col.id} sx={{ p: 0.5 }}>
                                        {col.id === 'durationMinutes' ? (
                                            <InputBase
                                                type="number"
                                                defaultValue={log.durationMinutes || 0}
                                                onBlur={e => handleUpdateField(log.id, 'durationMinutes', parseInt(e.target.value) || 0)}
                                                sx={{ ...ghostStyle, textAlign: 'center', fontWeight: 'bold' }}
                                            />
                                        ) : ['workCategory', 'projectId', 'staffId', 'status', 'remarks'].includes(col.id) ? (
                                            <Select
                                                value={log[col.id] || ""}
                                                onChange={e => handleUpdateField(log.id, col.id, e.target.value)}
                                                sx={ghostStyle}
                                                variant="standard"
                                                disableUnderline
                                            >
                                                {col.id === 'workCategory' && categories.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '12px' }}>{c}</MenuItem>)}
                                                {col.id === 'projectId' && [<MenuItem key="none" value="" sx={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.5 }}>-- Internal --</MenuItem>, ...projects.map(p => <MenuItem key={p.id} value={p.id} sx={{ fontSize: '12px' }}>{p.name}</MenuItem>)]}
                                                {col.id === 'staffId' && staff.map(s => <MenuItem key={s.id} value={s.id} sx={{ fontSize: '12px' }}>{s.name}</MenuItem>)}
                                                {col.id === 'status' && STATUS_OPTIONS.map(o => <MenuItem key={o} value={o} sx={{ fontSize: '12px' }}>{o}</MenuItem>)}
                                                {col.id === 'remarks' && LOCATION_OPTIONS.map(o => <MenuItem key={o} value={o} sx={{ fontSize: '12px' }}>{o}</MenuItem>)}
                                            </Select>
                                        ) : (
                                            <InputBase
                                                type={col.id === 'date' ? 'date' : 'text'}
                                                multiline={col.id === 'details'}
                                                defaultValue={log[col.id]}
                                                onBlur={e => handleUpdateField(log.id, col.id, e.target.value)}
                                                sx={ghostStyle}
                                            />
                                        )}
                                    </TableCell>
                                ))}
                                {hasClearance(4) && (
                                    <TableCell align="right" sx={{ width: 50 }}>
                                        <IconButton size="small" onClick={() => handleDelete(log.id)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* 5. COLUMNS DIALOG */}
            <Dialog open={colSettingsOpen} onClose={() => setColSettingsOpen(false)} PaperProps={{ sx: { bgcolor: '#0d1f3c', border: '1px solid', borderColor: 'divider', minWidth: 300, borderRadius: 2 } }}>
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'text.secondary' }}>TABLE_LAYOUT</DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <List>
                        {columnOrder.map((col, idx) => (
                            <ListItem key={col.id} divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <ListItemText primary={col.label} primaryTypographyProps={{ sx: { fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" } }} />
                                <IconButton size="small" onClick={() => moveColumn(idx, 'up')} disabled={idx === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
                                <IconButton size="small" onClick={() => moveColumn(idx, 'down')} disabled={idx === columnOrder.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setColSettingsOpen(false)} variant="contained" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', boxShadow: 'none' }}>APPLY</Button>
                </DialogActions>
            </Dialog>

            <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
        </Box>
    );
}