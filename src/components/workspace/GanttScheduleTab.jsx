import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom'; // 🔥 REQUIRED FOR PORTALS
import {
    Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Autocomplete, IconButton, MenuItem, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DownloadIcon from '@mui/icons-material/Download';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TimelineIcon from '@mui/icons-material/Timeline';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 🔥 IMPORT REACT QUERY HOOKS & ENGINE & DND
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useProject, useProjectBoqs, useUpdateProject } from '../../hooks/useQueries';
import { calculateLiveForecast } from '../../engines/scheduleEngine';

const STICKY_BG = '#0b172d';

// ============================================================================
// 🧠 PURE FUNCTIONS
// ============================================================================
const cascadeDates = (taskList) => {
    let changed = true;
    let iterations = 0;
    let currentTasks = [...taskList];

    while (changed && iterations < 10) {
        changed = false;
        iterations++;

        currentTasks = currentTasks.map(task => {
            if (!task.dependency || !task.dependency.taskId) return task;
            const pred = currentTasks.find(t => t.id === task.dependency.taskId);
            if (!pred) return task;

            const newStart = new Date(task.startDate);
            const newEnd = new Date(task.endDate);
            const duration = Math.max(0, (newEnd - newStart) / 86400000);
            const isMilestone = task.type === 'Milestone';
            const lag = Number(task.dependency.lag) || 0;

            const predStart = new Date(pred.startDate);
            const predEnd = new Date(pred.endDate);

            let expectedStart = new Date(newStart);
            let expectedEnd = new Date(newEnd);

            if (task.dependency.type === 'FS') {
                expectedStart = new Date(predEnd);
                expectedStart.setDate(expectedStart.getDate() + (isMilestone ? 0 : 1) + lag);
                expectedEnd = new Date(expectedStart);
                if (!isMilestone) expectedEnd.setDate(expectedEnd.getDate() + duration);
            } else if (task.dependency.type === 'SS') {
                expectedStart = new Date(predStart);
                expectedStart.setDate(expectedStart.getDate() + lag);
                expectedEnd = new Date(expectedStart);
                if (!isMilestone) expectedEnd.setDate(expectedEnd.getDate() + duration);
            } else if (task.dependency.type === 'FF') {
                expectedEnd = new Date(predEnd);
                expectedEnd.setDate(expectedEnd.getDate() + lag);
                expectedStart = new Date(expectedEnd);
                if (!isMilestone) expectedStart.setDate(expectedStart.getDate() - duration);
            } else if (task.dependency.type === 'SF') {
                expectedEnd = new Date(predStart);
                expectedEnd.setDate(expectedEnd.getDate() + lag);
                expectedStart = new Date(expectedEnd);
                if (!isMilestone) expectedStart.setDate(expectedStart.getDate() - duration);
            }

            const expectedStartStr = expectedStart.toISOString().split('T')[0];
            const expectedEndStr = expectedEnd.toISOString().split('T')[0];

            if (task.startDate !== expectedStartStr || task.endDate !== expectedEndStr) {
                changed = true;
                return { ...task, startDate: expectedStartStr, endDate: expectedEndStr };
            }
            return task;
        });
    }
    return currentTasks;
};

// ============================================================================
// 🧩 SUB-COMPONENT 1: TASK CREATION FORM
// ============================================================================
const GanttTaskForm = ({ tasks, liveTasks, availablePhases, saveTasks }) => {
    const [taskName, setTaskName] = useState("");
    const [taskType, setTaskType] = useState("Task");
    const [activePhase, setActivePhase] = useState("General");
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    const [predecessorId, setPredecessorId] = useState("");
    const [dependencyType, setDependencyType] = useState("FS");
    const [dependencyLag, setDependencyLag] = useState(0);

    const addTask = async () => {
        if (!taskName || !startDate) return alert("Task Name and Start date are required.");
        const finalEndDate = taskType === "Milestone" ? startDate : endDate;
        if (new Date(finalEndDate) < new Date(startDate)) return alert("End date cannot be before Start date.");

        const newTask = {
            id: crypto.randomUUID(), name: taskName, type: taskType,
            phase: activePhase || "General", startDate, endDate: finalEndDate,
            actualStart: null, actualEnd: null, status: "Not Started", priority: "Medium",
            dependency: predecessorId ? { taskId: predecessorId, type: dependencyType, lag: Number(dependencyLag) } : null,
            createdAt: new Date().toISOString()
        };
        await saveTasks([...tasks, newTask]);
        setTaskName(""); setPredecessorId(""); setDependencyLag(0);
    };

    return (
        <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', fontSize: '14px' }}>
                ADD_SCHEDULE_ITEM
            </Typography>
            <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={2}>
                    <TextField select fullWidth size="small" label="TYPE" value={taskType} onChange={e => setTaskType(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                        <MenuItem value="Task" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>Task</MenuItem>
                        <MenuItem value="Milestone" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>Milestone</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth size="small" label="NAME" value={taskName} onChange={e => setTaskName(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Autocomplete freeSolo fullWidth options={availablePhases} value={activePhase} onChange={(e, newVal) => setActivePhase(newVal || "General")} onInputChange={(e, newVal) => setActivePhase(newVal || "General")} renderInput={(params) => <TextField {...params} size="small" label="PHASE" InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ ...params.InputProps, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />} />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField type="date" fullWidth size="small" label="BASELINE START" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField type="date" fullWidth size="small" label="BASELINE END" value={taskType === "Milestone" ? startDate : endDate} onChange={e => setEndDate(e.target.value)} disabled={taskType === "Milestone"} inputProps={{ min: startDate }} InputLabelProps={{ shrink: true, sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <TextField select fullWidth size="small" label="PREDECESSOR" value={predecessorId} onChange={e => setPredecessorId(e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                        <MenuItem value="">-- NONE --</MenuItem>
                        {liveTasks.map(t => <MenuItem key={t.id} value={t.id} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'normal' }}>{t.name}</MenuItem>)}
                    </TextField>
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField select fullWidth size="small" label="DEP TYPE" value={dependencyType} onChange={e => setDependencyType(e.target.value)} disabled={!predecessorId} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                        {[{ value: "FS", label: "Finish-to-Start (FS)" }, { value: "SS", label: "Start-to-Start (SS)" }, { value: "FF", label: "Finish-to-Finish (FF)" }, { value: "SF", label: "Start-to-Finish (SF)" }].map(opt => <MenuItem key={opt.value} value={opt.value} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>{opt.value}</MenuItem>)}
                    </TextField>
                </Grid>
                <Grid item xs={6} md={1}>
                    <TextField type="number" fullWidth size="small" label="LAG" value={dependencyLag} onChange={e => setDependencyLag(e.target.value)} disabled={!predecessorId} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button fullWidth variant="contained" color="primary" onClick={addTask} startIcon={<AddIcon />} sx={{ height: 40, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}>ADD</Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

// ============================================================================
// 🧩 SUB-COMPONENT 2.1: THE INDIVIDUAL ROW (WITH PORTAL)
// ============================================================================
const GanttWbsTableRow = ({ task, provided, snapshot, liveTasks, updateTaskInline, updateDependency, deleteTask }) => {
    const isMilestone = task.type === "Milestone";
    const isStartLocked = task.dependency && (task.dependency.type === 'FS' || task.dependency.type === 'SS');
    const isEndLocked = isMilestone || (task.dependency && (task.dependency.type === 'FF' || task.dependency.type === 'SF'));
    const nativeSelectStyle = { background: 'transparent', color: 'inherit', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', outline: 'none', borderBottom: '1px dotted rgba(255,255,255,0.3)', cursor: 'pointer', width: '100%' };

    const usePortal = snapshot.isDragging;

    const rowContent = (
        <TableRow
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{
                ...provided.draggableProps.style,
                // 🔥 CRITICAL: Force table layout when in portal to prevent cell collapse
                display: usePortal ? 'table' : 'table-row',
                tableLayout: 'fixed',
                width: usePortal ? '100%' : 'auto',
                maxWidth: usePortal ? '90vw' : 'none',
                zIndex: 9999
            }}
            sx={{
                bgcolor: snapshot.isDragging ? '#1a2e4c' : 'inherit',
                boxShadow: snapshot.isDragging ? '0 15px 30px rgba(0,0,0,0.8)' : 'none',
                transition: 'background-color 0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
            }}
        >
            {/* 🔥 FIXED WIDTHS: Prevents the "Twitch" during drag start */}
            <TableCell {...provided.dragHandleProps} sx={{ width: 40, p: 0, textAlign: 'center', cursor: 'grab' }}>
                <DragIndicatorIcon color="action" fontSize="small" sx={{ verticalAlign: 'middle' }} />
            </TableCell>
            <TableCell sx={{ width: 300 }}>
                <Box display="flex" alignItems="center">
                    <input type="text" value={task.name} onChange={e => updateTaskInline(task.id, "name", e.target.value)} style={{ background: 'transparent', color: 'inherit', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 'bold', width: '100%', outline: 'none' }} />
                    {isMilestone && <Typography component="span" color="warning.main" ml={0.5}>◆</Typography>}
                </Box>
            </TableCell>
            <TableCell sx={{ width: 140 }}>
                <input type="date" value={task.startDate} onChange={e => updateTaskInline(task.id, "startDate", e.target.value)} disabled={isStartLocked} style={{ background: 'transparent', color: isStartLocked ? 'gray' : 'inherit', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', width: '100%', outline: 'none' }} />
            </TableCell>
            <TableCell sx={{ width: 140 }}>
                <input type="date" value={task.endDate} onChange={e => updateTaskInline(task.id, "endDate", e.target.value)} disabled={isEndLocked} style={{ background: 'transparent', color: isEndLocked ? 'gray' : 'inherit', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', width: '100%', outline: 'none' }} />
            </TableCell>
            <TableCell sx={{ width: 220, whiteSpace: 'nowrap' }}>
                <Box display="flex" gap={1}>
                    <select value={task.dependency?.taskId || ""} onChange={e => updateDependency(task.id, e.target.value, task.dependency?.type || "FS", task.dependency?.lag || 0)} style={{ ...nativeSelectStyle, width: '110px' }}>
                        <option value="" style={{ color: 'black' }}>- None -</option>
                        {liveTasks.filter(t => t.id !== task.id).map(t => <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.name}</option>)}
                    </select>
                    <select value={task.dependency?.type || "FS"} onChange={e => updateDependency(task.id, task.dependency?.taskId, e.target.value, task.dependency?.lag || 0)} disabled={!task.dependency?.taskId} style={{ ...nativeSelectStyle, width: '40px', opacity: !task.dependency?.taskId ? 0.3 : 1 }}>
                        <option value="FS" style={{ color: 'black' }}>FS</option><option value="SS" style={{ color: 'black' }}>SS</option>
                        <option value="FF" style={{ color: 'black' }}>FF</option><option value="SF" style={{ color: 'black' }}>SF</option>
                    </select>
                    <input type="number" value={task.dependency?.lag || 0} onChange={e => updateDependency(task.id, task.dependency?.taskId, task.dependency?.type || "FS", e.target.value)} disabled={!task.dependency?.taskId} style={{ ...nativeSelectStyle, width: '40px', opacity: !task.dependency?.taskId ? 0.3 : 1 }} />
                </Box>
            </TableCell>
            <TableCell sx={{ width: 140 }}>
                <select value={task.status || "Not Started"} onChange={e => updateTaskInline(task.id, "status", e.target.value)} style={{ ...nativeSelectStyle }}>
                    <option value="Not Started" style={{ color: 'black' }}>Not Started</option>
                    <option value="Pending Procurement" style={{ color: 'black' }}>Procurement</option>
                    <option value="In Progress" style={{ color: 'black' }}>In Progress</option>
                    <option value="Quality Check" style={{ color: 'black' }}>QA Check</option>
                    <option value="Completed" style={{ color: 'black' }}>Completed</option>
                </select>
            </TableCell>
            <TableCell align="center" sx={{ width: 60 }}>
                <IconButton size="small" color="error" onClick={() => deleteTask(task.id)}><DeleteIcon fontSize="small" /></IconButton>
            </TableCell>
        </TableRow>
    );

    // 🔥 TELEPORT TO BODY: Solves the mouse offset / clipping issue
    if (usePortal) {
        return ReactDOM.createPortal(rowContent, document.body);
    }
    return rowContent;
};

// ============================================================================
// 🧩 SUB-COMPONENT 2: THE WBS DATA TABLE 
// ============================================================================
const GanttWbsTable = ({ tasks, liveTasks, groupedTasks, saveTasks }) => {

    const updateTaskInline = async (id, field, value) => {
        const updatedTasks = tasks.map(t => {
            if (t.id === id) {
                const updated = { ...t, [field]: value };
                if (field === "startDate" && !updated.actualStart) updated.actualStart = value;
                if (field === "endDate" && !updated.actualEnd) updated.actualEnd = value;
                if (updated.type === "Milestone" && field !== "name") {
                    updated.endDate = updated.startDate;
                    if (!updated.actualEnd) updated.actualEnd = updated.actualStart;
                } else if (updated.startDate && updated.endDate && new Date(updated.endDate) < new Date(updated.startDate)) {
                    updated.endDate = updated.startDate;
                }
                return updated;
            }
            return t;
        });
        await saveTasks(updatedTasks);
    };

    const updateDependency = async (id, predId, type, lag = 0) => {
        const updatedTasks = tasks.map(t => t.id === id ? { ...t, dependency: predId ? { taskId: predId, type, lag: Number(lag) } : null } : t);
        await saveTasks(updatedTasks);
    };

    const deleteTask = async (id) => {
        const updatedTasks = tasks.filter(t => t.id !== id).map(t => {
            if (t.dependency && t.dependency.taskId === id) return { ...t, dependency: null };
            return t;
        });
        await saveTasks(updatedTasks);
    };

    // 🔥 FLAT LIST DND HANDLER
    const handleOnDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const movedTask = tasks.find(t => String(t.id) === draggableId);
        if (!movedTask) return;

        const remainingTasks = tasks.filter(t => String(t.id) !== draggableId);
        const destPhaseTasks = groupedTasks[destination.droppableId] || [];
        const targetTaskInPhase = destPhaseTasks.filter(t => String(t.id) !== draggableId)[destination.index];

        let insertIndex = remainingTasks.length;
        if (targetTaskInPhase) {
            insertIndex = remainingTasks.findIndex(t => t.id === targetTaskInPhase.id);
        } else {
            const lastTaskInPhase = destPhaseTasks.filter(t => String(t.id) !== draggableId).pop();
            if (lastTaskInPhase) {
                insertIndex = remainingTasks.findIndex(t => t.id === lastTaskInPhase.id) + 1;
            } else {
                insertIndex = 0;
            }
        }

        movedTask.phase = destination.droppableId;
        remainingTasks.splice(insertIndex, 0, movedTask);
        await saveTasks(remainingTasks);
    };

    return (
        <Paper elevation={0} sx={{ p: { xs: 1, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={{ xs: 1, sm: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountTreeIcon color="primary" fontSize="small" /> WORK BREAKDOWN STRUCTURE (WBS)
                </Typography>
            </Box>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 1040, tableLayout: 'fixed' }}>
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <TableRow>
                                {/* 🔥 MATCHING EXPLICIT WIDTHS FOR HEADERS */}
                                <TableCell sx={{ width: 40 }}></TableCell>
                                <TableCell sx={{ width: 300, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>TASK NAME</TableCell>
                                <TableCell sx={{ width: 140, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary' }}>BASELINE START</TableCell>
                                <TableCell sx={{ width: 140, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary' }}>BASELINE END</TableCell>
                                <TableCell sx={{ width: 220, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>DEPENDENCY</TableCell>
                                <TableCell sx={{ width: 140, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>STATUS</TableCell>
                                <TableCell align="center" sx={{ width: 60 }}></TableCell>
                            </TableRow>
                        </TableHead>

                        {Object.keys(groupedTasks).length > 0 ? (
                            Object.entries(groupedTasks).map(([phaseName, phaseTasks]) => (
                                <React.Fragment key={`wbs-phase-${phaseName}`}>
                                    {/* 🔥 ISOLATED NON-DRAGGABLE HEADER */}
                                    <TableBody>
                                        <TableRow sx={{ bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
                                            <TableCell colSpan={7} sx={{ py: 1.5, borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                <Typography variant="subtitle2" color="primary.main" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>◲ PHASE: {phaseName.toUpperCase()}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>

                                    {/* 🔥 DROPPABLE PHASE BODY */}
                                    <Droppable droppableId={phaseName}>
                                        {(provided) => (
                                            <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                                                {phaseTasks.map((task, index) => (
                                                    <Draggable key={String(task.id)} draggableId={String(task.id)} index={index}>
                                                        {(provided, snapshot) => (
                                                            <GanttWbsTableRow
                                                                task={task} provided={provided} snapshot={snapshot}
                                                                liveTasks={liveTasks} updateTaskInline={updateTaskInline}
                                                                updateDependency={updateDependency} deleteTask={deleteTask}
                                                            />
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </TableBody>
                                        )}
                                    </Droppable>
                                </React.Fragment>
                            ))
                        ) : (
                            <TableBody>
                                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>NO_TASKS_SCHEDULED</TableCell></TableRow>
                            </TableBody>
                        )}
                    </Table>
                </TableContainer>
            </DragDropContext>
        </Paper>
    );
};

// ============================================================================
// 🧩 SUB-COMPONENT 3: THE LIVE FORECAST GANTT MATRIX (Unchanged)
// ============================================================================
const GanttMatrix = ({ projectName, tasks, liveTasks, groupedTasks }) => {
    const [zoomLevel, setZoomLevel] = useState(1);

    const { minDate, maxDate, totalDays } = useMemo(() => {
        if (liveTasks.length === 0) return { minDate: null, maxDate: null, totalDays: 0 };
        let min = new Date(liveTasks[0].startDate);
        let max = new Date(liveTasks[0].endDate);

        liveTasks.forEach(task => {
            const bStart = new Date(task.startDate);
            const bEnd = new Date(task.endDate);
            const fStart = new Date(task.forecastStart);
            const fEnd = new Date(task.forecastEnd);
            if (bStart < min) min = bStart;
            if (fStart < min) min = fStart;
            if (bEnd > max) max = bEnd;
            if (fEnd > max) max = fEnd;
        });

        const span = Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
        return { minDate: min, maxDate: max, totalDays: span };
    }, [liveTasks]);

    const baseDayWidth = 30;
    const ganttColumnWidth = totalDays > 0 ? Math.max(400, totalDays * baseDayWidth * zoomLevel) : 400;
    const pixelsPerDay = totalDays > 0 ? ganttColumnWidth / totalDays : 0;

    const getBarColor = (status) => {
        switch (status) {
            case 'Completed': return '#10b981';
            case 'In Progress': return '#3b82f6';
            case 'Pending Procurement': return '#f59e0b';
            case 'Quality Check': return '#9c27b0';
            default: return '#6b7280';
        }
    };

    const getBaselineStyles = (task) => {
        if (!task.startDate || totalDays === 0) return null;
        const start = new Date(task.startDate);
        const end = new Date(task.endDate);
        const startOffsetDays = Math.floor((start - minDate) / (1000 * 60 * 60 * 24));
        const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

        if (task.type === 'Milestone') {
            let offsetModifier = task.dependency && (task.dependency.type === 'FS' || task.dependency.type === 'FF') ? 1 : 0;
            return { left: `${((startOffsetDays + offsetModifier) / totalDays) * 100}%`, width: `0%` };
        }
        return { left: `${Math.max(0, (startOffsetDays / totalDays) * 100)}%`, width: `${Math.min(100, (durationDays / totalDays) * 100)}%` };
    };

    const getForecastStyles = (task) => {
        if (totalDays === 0) return null;
        const start = new Date(task.forecastStart);
        const end = new Date(task.forecastEnd);

        const startOffsetDays = Math.floor((start - minDate) / (1000 * 60 * 60 * 24));
        const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const barColor = getBarColor(task.status);
        const isFutureForecast = task.status === 'Not Started';

        if (task.type === 'Milestone') {
            let offsetModifier = task.dependency && (task.dependency.type === 'FS' || task.dependency.type === 'FF') ? 1 : 0;
            return { left: `${((startOffsetDays + offsetModifier) / totalDays) * 100}%`, width: `0%`, bgcolor: task.status === "Completed" ? '#10b981' : '#f59e0b', opacity: isFutureForecast ? 0.5 : 1 };
        }
        return { left: `${Math.max(0, (startOffsetDays / totalDays) * 100)}%`, width: `${Math.min(100, (durationDays / totalDays) * 100)}%`, bgcolor: barColor, opacity: isFutureForecast ? 0.6 : 1 };
    };

    const renderTimelineHeader = () => {
        if (!minDate || totalDays <= 0) return null;
        const daysArray = [];
        let cur = new Date(minDate);

        let scaleMode = 'days';
        if (pixelsPerDay < 15) scaleMode = 'weeks';
        if (pixelsPerDay < 5) scaleMode = 'months';

        for (let i = 0; i < totalDays; i++) {
            daysArray.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }

        return (
            <Box sx={{ display: 'flex', width: '100%', height: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {daysArray.map((d, idx) => {
                    const isMon = d.getDay() === 1;
                    const isFirst = d.getDate() === 1;
                    let label = "";
                    if (scaleMode === 'days') label = d.getDate();
                    else if (scaleMode === 'weeks' && isMon) label = `W${Math.ceil(d.getDate() / 7)}`;
                    else if (scaleMode === 'months' && isFirst) label = d.toLocaleDateString('en-US', { month: 'short' });

                    return (
                        <Box key={idx} sx={{ flex: 1, borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', pl: 0.5, fontSize: '10px', color: 'text.secondary', overflow: 'visible', whiteSpace: 'nowrap' }}>
                            {label}
                        </Box>
                    );
                })}
            </Box>
        );
    };

    const exportGanttToExcel = async () => {
        if (!minDate || tasks.length === 0) return alert("No schedule data to export.");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Project Schedule');

        const columns = [
            { header: 'Task / Milestone', key: 'name', width: 35 },
            { header: 'Baseline Start', key: 'bstart', width: 15 },
            { header: 'Baseline End', key: 'bend', width: 15 },
            { header: 'Live Forecast End', key: 'fend', width: 15 },
            { header: 'Phase', key: 'phase', width: 20 },
        ];
        worksheet.columns = columns;

        Object.entries(groupedTasks).forEach(([phaseName, phaseTasks]) => {
            const phaseRow = worksheet.addRow({ name: `PHASE: ${phaseName.toUpperCase()}` });
            phaseRow.font = { bold: true, color: { argb: 'FF3B82F6' } };
            phaseRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };

            phaseTasks.forEach(task => {
                worksheet.addRow({
                    name: task.name + (task.type === "Milestone" ? " ◆" : ""),
                    bstart: task.startDate,
                    bend: task.endDate,
                    fend: task.forecastEnd,
                    phase: task.phase
                });
            });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `${projectName || 'Project'}_Live_Schedule.xlsx`);
    };

    return (
        <Paper elevation={0} sx={{ overflow: "hidden", borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
            <Box sx={{ p: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)', gap: 2 }}>
                <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimelineIcon color="primary" fontSize="small" /> LIVE FORECAST MATRIX
                    </Typography>
                    <Box display="flex" alignItems="center" gap={0.5} bgcolor="rgba(0,0,0,0.3)" borderRadius={2} px={1}>
                        <IconButton size="small" onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.2))} color="primary"><ZoomOutIcon fontSize="small" /></IconButton>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: '40px', textAlign: 'center' }}>{Math.round(zoomLevel * 100)}%</Typography>
                        <IconButton size="small" onClick={() => setZoomLevel(z => Math.min(4, z + 0.2))} color="primary"><ZoomInIcon fontSize="small" /></IconButton>
                    </Box>
                    <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={exportGanttToExcel} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                        EXPORT
                    </Button>
                </Box>
                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                    EXPECTED DURATION: <Typography component="span" fontWeight="bold" color={totalDays > 0 ? "warning.main" : "text.secondary"}>{totalDays > 0 ? `${totalDays} DAYS` : "TBD"}</Typography>
                </Typography>
            </Box>

            <TableContainer sx={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <Table size="small" sx={{ minWidth: 'max-content' }}>
                    <TableHead sx={{ bgcolor: STICKY_BG }}>
                        <TableRow>
                            <TableCell sx={{ width: { xs: 120, sm: 200, md: 300 }, minWidth: { xs: 120, sm: 200, md: 300 }, maxWidth: { xs: 120, sm: 200, md: 300 }, position: 'sticky', left: 0, zIndex: 20, bgcolor: STICKY_BG, fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '10px', md: '11px' }, borderRight: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                TASK / MILESTONE
                            </TableCell>
                            <TableCell sx={{ width: ganttColumnWidth, minWidth: ganttColumnWidth, maxWidth: ganttColumnWidth, p: 0, verticalAlign: 'bottom' }}>
                                {renderTimelineHeader()}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.keys(groupedTasks).length > 0 ? (
                            Object.entries(groupedTasks).map(([phaseName, phaseTasks]) => (
                                <React.Fragment key={`gantt-phase-${phaseName}`}>
                                    <TableRow sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                                        <TableCell sx={{ py: 1.5, position: 'sticky', left: 0, zIndex: 10, bgcolor: STICKY_BG, borderBottom: '1px solid rgba(59, 130, 246, 0.3)', borderRight: '1px solid rgba(255,255,255,0.05)', width: { xs: 120, sm: 200, md: 300 }, minWidth: { xs: 120, sm: 200, md: 300 }, maxWidth: { xs: 120, sm: 200, md: 300 }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <Typography variant="subtitle2" color="primary.main" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: { xs: '11px', md: '14px' } }}>
                                                ❖ PHASE: {phaseName.toUpperCase()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ borderBottom: '1px solid rgba(59, 130, 246, 0.3)' }}></TableCell>
                                    </TableRow>

                                    {phaseTasks.map(task => {
                                        const baseStyles = getBaselineStyles(task);
                                        const actStyles = getForecastStyles(task);
                                        const isMilestone = task.type === "Milestone";

                                        return (
                                            <TableRow key={`matrix-${task.id}`} hover>
                                                <TableCell sx={{ position: 'sticky', left: 0, zIndex: 10, bgcolor: STICKY_BG, borderRight: '1px solid rgba(255,255,255,0.05)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', width: { xs: 120, sm: 200, md: 300 }, minWidth: { xs: 120, sm: 200, md: 300 }, maxWidth: { xs: 120, sm: 200, md: 300 } }}>
                                                    <Box display="flex" alignItems="center" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {task.name}
                                                        {isMilestone && <Typography component="span" color="warning.main" ml={0.5}>◆</Typography>}
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ position: 'relative', borderLeft: '1px dashed rgba(255,255,255,0.1)', p: 1, backgroundImage: totalDays > 0 ? `repeating-linear-gradient(to right, transparent, transparent calc(100% / ${totalDays} - 1px), rgba(255,255,255,0.05) calc(100% / ${totalDays}))` : 'none' }}>
                                                    <Box sx={{ width: '100%', height: '28px', position: 'relative', borderRadius: 1 }}>
                                                        {baseStyles && (
                                                            isMilestone ? (
                                                                <Box sx={{ position: 'absolute', left: baseStyles.left, width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', transform: 'translate(-50%, -50%) rotate(45deg)', top: '50%', zIndex: 1 }} />
                                                            ) : (
                                                                <Box sx={{ ...baseStyles, position: 'absolute', height: '50%', top: '25%', borderRadius: 1, border: '1px dashed rgba(255,255,255,0.4)', bgcolor: 'rgba(255,255,255,0.05)', zIndex: 1 }} />
                                                            )
                                                        )}
                                                        {actStyles && (
                                                            isMilestone ? (
                                                                <Box sx={{ position: 'absolute', left: actStyles.left, width: '14px', height: '14px', bgcolor: actStyles.bgcolor, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)', transform: 'translate(-50%, -50%) rotate(45deg)', top: '50%', boxShadow: '0 0 8px rgba(0,0,0,0.5)', opacity: actStyles.opacity, zIndex: 2 }} />
                                                            ) : (
                                                                <Box sx={{ ...actStyles, position: 'absolute', height: '80%', top: '10%', borderRadius: 1, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.2) 4px, rgba(0,0,0,0.2) 6px)', boxShadow: '0 0 8px rgba(0,0,0,0.4)', transition: 'all 0.3s ease', zIndex: 2 }} />
                                                            )
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </React.Fragment>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>NO_TASKS_SCHEDULED</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function GanttScheduleTab({ projectId }) {
    const { data: project } = useProject(projectId);
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
    const updateProjectMutation = useUpdateProject();

    const tasks = useMemo(() => {
        if (!project || !project.ganttTasks) return [];
        if (typeof project.ganttTasks === 'string') {
            try { return JSON.parse(project.ganttTasks); } catch { return []; }
        }
        return project.ganttTasks;
    }, [project?.ganttTasks]);

    const projectBoqItems = useMemo(() => {
        return rawProjectBoqs.map(b => {
            try { return { ...b, measurements: JSON.parse(b.measurements || '[]') }; }
            catch { return { ...b, measurements: [] }; }
        });
    }, [rawProjectBoqs]);

    const availablePhases = useMemo(() => {
        const phases = new Set((projectBoqItems || []).map(item => item.phase).filter(Boolean));
        tasks.forEach(t => { if (t.phase) phases.add(t.phase); });
        if (phases.size === 0) return ["Substructure", "Superstructure", "Finishing", "MEP", "General"];
        return Array.from(phases);
    }, [projectBoqItems, tasks]);

    const liveTasks = useMemo(() => calculateLiveForecast(tasks), [tasks]);

    const groupedTasks = useMemo(() => {
        const groups = {};
        liveTasks.forEach(task => {
            const phase = task.phase || "General";
            if (!groups[phase]) groups[phase] = [];
            groups[phase].push(task);
        });
        return groups;
    }, [liveTasks]);

    const saveTasks = async (newTasks) => {
        const scheduledTasks = cascadeDates(newTasks);
        await updateProjectMutation.mutateAsync({
            id: projectId,
            data: { ganttTasks: JSON.stringify(scheduledTasks) }
        });
    };

    return (
        <Box display="flex" flexDirection="column" gap={4}>
            <GanttTaskForm
                tasks={tasks}
                liveTasks={liveTasks}
                availablePhases={availablePhases}
                saveTasks={saveTasks}
            />

            <GanttWbsTable
                tasks={tasks}
                liveTasks={liveTasks}
                groupedTasks={groupedTasks}
                saveTasks={saveTasks}
            />

            <GanttMatrix
                projectName={project?.name}
                tasks={tasks}
                liveTasks={liveTasks}
                groupedTasks={groupedTasks}
            />
        </Box>
    );
}