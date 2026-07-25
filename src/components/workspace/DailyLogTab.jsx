import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
    Box, Paper, Typography, Button, TextField, Autocomplete,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import SendIcon from '@mui/icons-material/Send';

// 🔥 IMPORT REACT QUERY HOOKS
import { useQueryClient } from '@tanstack/react-query';
import { useProject, useProjectBoqs, useResources, useUpdateProject } from '../../hooks/useQueries';

// ============================================================================
// 🧩 SUB-COMPONENT: TASK EXECUTION ROW (Micro-State for smooth typing)
// ============================================================================
const TaskExecutionRow = ({ task, updateTaskInline }) => {
    // Localize typing state to prevent full-tab re-renders
    const [actualStart, setActualStart] = useState(task.actualStart || "");
    const [actualEnd, setActualEnd] = useState(task.actualEnd || "");

    // Sync if parent changes
    useEffect(() => { setActualStart(task.actualStart || ""); }, [task.actualStart]);
    useEffect(() => { setActualEnd(task.actualEnd || ""); }, [task.actualEnd]);

    const handleBlur = (field, value) => {
        if (task[field] !== value) {
            updateTaskInline(task.id, field, value);
        }
    };

    const handleStatusChange = (newStatus) => {
        updateTaskInline(task.id, 'status', newStatus);
    };

    const isDone = task.status === "Completed";

    return (
        <TableRow hover sx={{ bgcolor: isDone ? 'rgba(16, 185, 129, 0.05)' : 'inherit' }}>
            <TableCell sx={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>{task.name}</TableCell>
            <TableCell sx={{ color: 'info.main', fontSize: '11px', whiteSpace: 'nowrap' }}>{task.phase}</TableCell>
            <TableCell>
                <TextField select size="small" fullWidth value={task.status || "Not Started"} onChange={e => handleStatusChange(e.target.value)} InputProps={{ sx: { fontSize: '11px', height: 32, minWidth: '130px' } }}>
                    <MenuItem value="Not Started">Not Started</MenuItem>
                    <MenuItem value="In Progress" sx={{ color: 'info.main' }}>In Progress</MenuItem>
                    <MenuItem value="Completed" sx={{ color: 'success.main' }}>Completed</MenuItem>
                </TextField>
            </TableCell>
            <TableCell>
                <TextField
                    type="date" size="small" fullWidth
                    value={actualStart}
                    onChange={e => setActualStart(e.target.value)}
                    onBlur={() => handleBlur('actualStart', actualStart)}
                    InputProps={{ sx: { fontSize: '11px', height: 32, minWidth: '120px' } }}
                />
            </TableCell>
            <TableCell>
                <TextField
                    type="date" size="small" fullWidth
                    value={actualEnd}
                    onChange={e => setActualEnd(e.target.value)}
                    onBlur={() => handleBlur('actualEnd', actualEnd)}
                    InputProps={{ sx: { fontSize: '11px', height: 32, minWidth: '120px' } }}
                />
            </TableCell>
        </TableRow>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function DailyLogTab({ projectId }) {
    const queryClient = useQueryClient();

    // 1. Fetching Data Independently via React Query
    const { data: rawProject } = useProject(projectId);
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
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
            dailyLogs: parseSafe(rawProject.dailyLogs, []),
            dailySchedules: parseSafe(rawProject.dailySchedules, []),
            ganttTasks: parseSafe(rawProject.ganttTasks, []),
            materialRequests: parseSafe(rawProject.materialRequests, [])
        };
    }, [rawProject]);

    const projectBoqItems = useMemo(() => rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })), [rawProjectBoqs]);
    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}) })), [rawResources]);

    const validLogs = project?.dailyLogs || [];
    const validSchedules = project?.dailySchedules || [];
    const validTasks = project?.ganttTasks || [];
    const validRequests = project?.materialRequests || [];

    // --- STATE ---
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [activePhase, setActivePhase] = useState("General");
    const [selectedRes, setSelectedRes] = useState(null);
    const [qty, setQty] = useState("");

    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [customCode, setCustomCode] = useState("");
    const [customDesc, setCustomDesc] = useState("");
    const [customUnit, setCustomUnit] = useState("nos");

    // --- REQUISITION STATE ---
    const [reqItem, setReqItem] = useState("");
    const [reqQty, setReqQty] = useState("");
    const [reqUrgency, setReqUrgency] = useState("Normal");

    // --- DAILY SCHEDULE STATE ---
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
    const [shiftStart, setShiftStart] = useState("08:00");
    const [shiftEnd, setShiftEnd] = useState("17:00");
    const [weather, setWeather] = useState("Clear");
    const [shiftNotes, setShiftNotes] = useState("");

    const fileInputRef = useRef(null);

    const availablePhases = useMemo(() => {
        const phases = new Set((projectBoqItems || []).map(item => item.phase).filter(Boolean));
        if (phases.size === 0) return ["Substructure", "Superstructure", "Finishing", "MEP", "General"];
        return Array.from(phases);
    }, [projectBoqItems]);

    // --- DATABASE ACTIONS ---
    const updateProjectField = async (field, value) => {
        await updateProjectMutation.mutateAsync({
            id: projectId,
            data: { [field]: JSON.stringify(value) }
        });
    };

    const submitMaterialRequest = async () => {
        if (!reqItem || !reqQty) return alert("Please enter item name and quantity.");
        try {
            const newReq = {
                id: crypto.randomUUID(),
                date: new Date().toISOString().split('T')[0],
                item: reqItem,
                qty: Number(reqQty),
                urgency: reqUrgency,
                status: "Pending Procurement"
            };

            const newTask = {
                id: crypto.randomUUID(),
                name: `ORDER: ${reqItem} (${reqQty})`,
                phase: "Procurement",
                status: "Not Started",
                columnId: "todo",
                priority: reqUrgency === "High" ? "High" : "Medium",
                assignedTo: "Procurement Team",
                description: `Site requested ${reqQty} of ${reqItem} on ${newReq.date}.`
            };

            // Batch update using the React Query mutation
            await updateProjectMutation.mutateAsync({
                id: projectId,
                data: {
                    materialRequests: JSON.stringify([...validRequests, newReq]),
                    ganttTasks: JSON.stringify([...validTasks, newTask])
                }
            });

            setReqItem(""); setReqQty("");
            alert("Requisition successfully submitted to Procurement & Kanban board!");
        } catch (error) {
            console.error(error);
            alert("Failed to save. Ensure your database is properly configured.");
        }
    };

    const addLog = async () => {
        if (!date || !activePhase || !selectedRes || !qty) return alert("Please fill all fields.");
        // 🔥 CRITICAL INVENTORY FIX: Structure it so InventoryTab.jsx can read the nested resources
        const newLog = {
            id: crypto.randomUUID(),
            date,
            phase: activePhase,
            resourceId: selectedRes.id, // For backward compatibility
            qty: Number(qty), // For backward compatibility
            resources: [{ resourceId: selectedRes.id, qty: Number(qty) }] // 🔥 Correct format for InventoryTab
        };
        await updateProjectField("dailyLogs", [...validLogs, newLog]);
        setQty(""); setSelectedRes(null);
    };

    const deleteLog = async (id) => {
        await updateProjectField("dailyLogs", validLogs.filter(l => l.id !== id));
    };

    const saveCustomResource = async () => {
        if (!customCode || !customDesc) return alert("Code and Description required.");
        const newRes = { id: crypto.randomUUID(), code: customCode, description: customDesc, unit: customUnit, rates: "{}" };
        await window.api.db.createResource(newRes);
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        setSelectedRes(newRes);
        setIsCustomOpen(false);
        setCustomCode(""); setCustomDesc("");
    };

    const addSchedule = async () => {
        if (!scheduleDate || !shiftStart || !shiftEnd) return alert("Please specify Date and Shift timings.");
        const newSchedule = { id: crypto.randomUUID(), date: scheduleDate, shiftStart, shiftEnd, weather, notes: shiftNotes };
        await updateProjectField("dailySchedules", [...validSchedules, newSchedule]);
        setShiftNotes("");
    };

    const deleteSchedule = async (id) => {
        await updateProjectField("dailySchedules", validSchedules.filter(s => s.id !== id));
    };

    // Passed down to the TaskExecutionRow
    const updateTaskInline = async (taskId, field, value) => {
        const today = new Date().toISOString().split('T')[0];
        const updatedTasks = validTasks.map(t => {
            if (t.id === taskId) {
                const updated = { ...t, [field]: value };
                if (field === 'status') {
                    if (value === "In Progress" && !updated.actualStart) updated.actualStart = today;
                    if (value === "Completed") {
                        if (!updated.actualStart) updated.actualStart = today;
                        if (!updated.actualEnd) updated.actualEnd = today;
                    }
                }
                return updated;
            }
            return t;
        });
        await updateProjectField("ganttTasks", updatedTasks);
    };

    const exportTemplate = () => {
        const header = ["Date", "Phase", "Resource Code", "Resource Description", "Quantity Consumed", "Unit"];
        const wsData = [header];
        if (validLogs.length === 0) {
            wsData.push([new Date().toISOString().split('T')[0], "General", "CEM-01", "Sample Cement", 50, "Bags"]);
        } else {
            validLogs.forEach(log => {
                const res = resources.find(r => r.id === log.resourceId) || {};
                wsData.push([log.date || "", log.phase || "", res.code || "", res.description || "", Number(log.qty) || 0, res.unit || ""]);
            });
        }
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily_Material_Logs");
        XLSX.writeFile(wb, `${project?.name || 'Project'}_MaterialLogs.xlsx`);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
                if (jsonData.length === 0) return;

                const newLogs = [];
                let requiresGlobalRefresh = false;

                for (const row of jsonData) {
                    const dateRaw = row["Date"] || row["Date (YYYY-MM-DD)"];
                    const phase = row["Phase"] || "General";
                    const code = String(row["Resource Code"] || "").trim();
                    const qty = Number(row["Quantity Consumed"]);
                    const desc = String(row["Resource Description"] || "");
                    const unit = String(row["Unit"] || "nos");

                    if (!dateRaw || !code || isNaN(qty)) continue;

                    let resource = resources.find(r => (r.code || "").trim().toLowerCase() === code.toLowerCase());
                    if (!resource) {
                        const newResId = crypto.randomUUID();
                        const newRes = { id: newResId, code: code, description: desc || `Imported ${code}`, unit: unit, rates: "{}" };
                        await window.api.db.createResource(newRes);
                        resource = newRes;
                        requiresGlobalRefresh = true;
                    }
                    if (resource) {
                        newLogs.push({
                            id: crypto.randomUUID(),
                            date: dateRaw,
                            phase,
                            resourceId: resource.id,
                            qty,
                            resources: [{ resourceId: resource.id, qty: qty }]
                        });
                    }
                }
                if (newLogs.length > 0) {
                    await updateProjectField("dailyLogs", [...validLogs, ...newLogs]);
                    alert(`Imported ${newLogs.length} logs!`);
                    if (requiresGlobalRefresh) queryClient.invalidateQueries({ queryKey: ['resources'] });
                }
            } catch (err) { alert("Import failed. Please check file format."); }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
    };

    const sortedLogs = [...validLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const sortedSchedules = [...validSchedules].sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            {/* --- TOP EXPORT/IMPORT BUTTONS --- */}
            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={2}>
                <Button fullWidth={{ xs: true, sm: false }} variant="outlined" startIcon={<DownloadIcon />} onClick={exportTemplate} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                    EXPORT LOG TEMPLATE
                </Button>
                <input type="file" accept=".xls,.xlsx" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
                <Button fullWidth={{ xs: true, sm: false }} variant="contained" disableElevation startIcon={<UploadIcon />} onClick={() => fileInputRef.current.click()} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                    IMPORT EXCEL
                </Button>
            </Box>

            {/* --- SITE MATERIAL REQUISITION --- */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'warning.main', bgcolor: 'rgba(245, 158, 11, 0.05)' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="warning.main" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SendIcon fontSize="small" /> SITE REQUISITION (UNPLANNED)
                </Typography>
                <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                    <Box sx={{ flex: 2 }}>
                        <input
                            placeholder="Item Description"
                            value={reqItem}
                            onChange={e => setReqItem(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </Box>
                    <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }} sx={{ flex: 1.5 }}>
                        <input
                            type="number"
                            placeholder="Qty"
                            value={reqQty}
                            onChange={e => setReqQty(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', boxSizing: 'border-box' }}
                        />
                        <select
                            value={reqUrgency}
                            onChange={e => setReqUrgency(e.target.value)}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', boxSizing: 'border-box' }}
                        >
                            <option value="Normal">Normal</option>
                            <option value="High">Urgent</option>
                        </select>
                    </Box>
                    <Button fullWidth={{ xs: true, md: false }} variant="contained" color="warning" onClick={submitMaterialRequest} sx={{ height: 42, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', flexShrink: 0 }}>
                        SEND REQUEST
                    </Button>
                </Box>
            </Paper>

            {/* --- DAILY WORK SCHEDULE --- */}
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: '14px' }}>
                    DAILY_WORK_SCHEDULE
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} mb={3}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField fullWidth type="date" size="small" label="DATE" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                        <TextField fullWidth type="time" size="small" label="START" value={shiftStart} onChange={e => setShiftStart(e.target.value)} InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                        <TextField fullWidth type="time" size="small" label="END" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                        <TextField fullWidth select size="small" label="WEATHER" value={weather} onChange={e => setWeather(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                            {["Clear", "Cloudy", "Rain", "Heavy Rain", "Extreme Heat"].map(w => (<MenuItem key={w} value={w}>{w}</MenuItem>))}
                        </TextField>
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
                        <TextField fullWidth size="small" label="GENERAL NOTES" value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} placeholder="Site conditions..." InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                        <Button fullWidth={{ xs: true, md: false }} variant="contained" color="primary" onClick={addSchedule} startIcon={<AddIcon />} sx={{ height: 40, minWidth: '140px', borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', flexShrink: 0 }}>LOG_SHIFT</Button>
                    </Box>
                </Box>
                <TableContainer sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Table size="small" sx={{ minWidth: 600 }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>DATE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>SHIFT</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>WEATHER</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>NOTES</TableCell>
                                <TableCell align="center" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>ACTION</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedSchedules.map(s => (
                                <TableRow key={s.id} hover>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap' }}>{s.date}</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{s.shiftStart}-{s.shiftEnd}</TableCell>
                                    <TableCell sx={{ color: 'info.main', fontSize: '12px', whiteSpace: 'nowrap' }}>{s.weather}</TableCell>
                                    <TableCell sx={{ fontSize: '12px' }}>{s.notes || "-"}</TableCell>
                                    <TableCell align="center"><IconButton size="small" color="error" onClick={() => deleteSchedule(s.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* --- MATERIAL CONSUMPTION LOG --- */}
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>LOG_MATERIAL_CONSUMPTION</Typography>
                <Box display="flex" flexDirection="column" gap={2} mb={3}>
                    <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                        <TextField fullWidth type="date" size="small" label="DATE" value={date} onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} />
                        <Autocomplete fullWidth freeSolo options={availablePhases} value={activePhase} onChange={(e, v) => setActivePhase(v || "General")} renderInput={(params) => <TextField {...params} size="small" label="PHASE" />} />
                    </Box>
                    <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
                        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} flex={2} gap={1}>
                            <Autocomplete fullWidth options={resources} getOptionLabel={o => `${o.code || ''} - ${o.description || ''}`} value={selectedRes} onChange={(e, v) => setSelectedRes(v)} renderInput={(params) => <TextField {...params} size="small" label="RESOURCE" />} />
                            <Button fullWidth={{ xs: true, sm: false }} variant="outlined" color="secondary" onClick={() => setIsCustomOpen(true)} sx={{ minWidth: '90px', fontSize: '10px' }}>+ CUSTOM</Button>
                        </Box>
                        <TextField fullWidth type="number" size="small" label="QTY" value={qty} onChange={e => setQty(e.target.value)} sx={{ flex: 1 }} />
                        <Button fullWidth={{ xs: true, md: false }} variant="contained" onClick={addLog} startIcon={<AddIcon />} sx={{ height: 40, borderRadius: 2 }}>LOG</Button>
                    </Box>
                </Box>
                <TableContainer sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Table size="small" sx={{ minWidth: 600 }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>DATE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>PHASE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>CODE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>RESOURCE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>QTY</TableCell>
                                <TableCell align="center"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedLogs.map(log => {
                                const res = resources.find(r => r.id === log.resourceId) || {};
                                return (
                                    <TableRow key={log.id} hover>
                                        <TableCell sx={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{log.date}</TableCell>
                                        <TableCell sx={{ color: 'info.main', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.phase}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>{res.code || "-"}</TableCell>
                                        <TableCell sx={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{res.description}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: 'warning.main', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.qty} {res.unit}</TableCell>
                                        <TableCell align="center"><IconButton size="small" color="error" onClick={() => deleteLog(log.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* --- TASK EXECUTION TRACKER (OPTIMIZED) --- */}
            <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>TASK_EXECUTION_&_TRACKING</Typography>
                <Typography variant="body2" color="text.secondary" mb={3} sx={{ fontSize: '12px' }}>Update status and dates. Syncs with Gantt Chart.</Typography>

                <TableContainer sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Table size="small" sx={{ minWidth: 800 }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>TASK</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>PHASE</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>STATUS</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>ACTUAL START</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }}>ACTUAL END</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {validTasks.map(task => (
                                <TaskExecutionRow
                                    key={task.id}
                                    task={task}
                                    updateTaskInline={updateTaskInline}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* CUSTOM RESOURCE DIALOG WITH ARIA FIX */}
            <Dialog open={isCustomOpen} onClose={() => setIsCustomOpen(false)} maxWidth="sm" fullWidth disableRestoreFocus>
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>ADD_CUSTOM_RESOURCE</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField label="CODE" fullWidth value={customCode} onChange={e => setCustomCode(e.target.value)} />
                    <TextField label="DESCRIPTION" fullWidth value={customDesc} onChange={e => setCustomDesc(e.target.value)} multiline rows={2} />
                    <TextField label="UNIT" fullWidth value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Button onClick={() => setIsCustomOpen(false)} color="inherit">CANCEL</Button>
                    <Button variant="contained" color="success" onClick={saveCustomResource}>SAVE</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}