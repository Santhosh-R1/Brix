import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom'; // 🔥 REQUIRED FOR PORTALS
import {
    Box, Typography, Paper, Grid, IconButton, Button,
    Chip, Avatar, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// 🔥 IMPORT THE POINTER-BASED DND LIBRARY
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { useProject, useProjectBoqs, useMasterBoqs, useResources, useStaff, useUpdateProject } from '../../hooks/useQueries';
import { useProjectCalculations } from '../../hooks/useProjectCalculations';

const COLUMNS = [
    { id: 'Not Started', label: '01_BACKLOG', color: '#94a3b8' },
    { id: 'Pending Procurement', label: '02_PROCUREMENT', color: '#f59e0b' },
    { id: 'In Progress', label: '03_IN_PROGRESS', color: '#3b82f6' },
    { id: 'Quality Check', label: '04_QUALITY_CONTROL', color: '#8b5cf6' },
    { id: 'Completed', label: '05_COMPLETED', color: '#10b981' }
];

// ============================================================================
// 🧩 SUB-COMPONENT 1: THE DRAGGABLE CARD (WITH PORTAL)
// ============================================================================
const KanbanTaskCard = ({ task, provided, snapshot, handleOpenDialog, handleDeleteTask }) => {
    const usePortal = snapshot.isDragging;

    const cardContent = (
        <Paper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style} // Let the library control width/coords
            sx={{
                p: 2, mb: 2, bgcolor: '#0b172d', border: '1px solid',
                borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                borderRadius: 2,
                boxShadow: snapshot.isDragging ? '0 15px 30px rgba(0,0,0,0.8)' : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.05)' },
                ...(usePortal && { zIndex: 9999 }) // Ensure it sits above modals and navbars
            }}
        >
            <Box display="flex" justifyContent="space-between" mb={1}>
                <Chip
                    label={task.priority?.toUpperCase() || 'MEDIUM'}
                    size="small"
                    sx={{
                        fontSize: '9px', height: 18, fontFamily: "'JetBrains Mono', monospace",
                        bgcolor: task.priority === 'High' || task.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: task.priority === 'High' || task.priority === 'CRITICAL' ? 'error.main' : 'text.secondary'
                    }}
                />
                <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(task)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
                        <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteTask(task.id)} sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>
            </Box>

            <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 1, color: 'text.primary' }}>
                {task.title || task.name}
            </Typography>

            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={0.5} sx={{ opacity: 0.6 }}>
                    <AccessTimeIcon sx={{ fontSize: 12 }} />
                    <Typography sx={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(task.createdAt || Date.now()).toLocaleDateString()}
                    </Typography>
                </Box>
                <Avatar sx={{ width: 22, height: 22, fontSize: '10px', bgcolor: 'primary.dark', border: '1px solid #3b82f6', color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {task.assigneeId ? task.assigneeId.charAt(0) : '?'}
                </Avatar>
            </Box>
        </Paper>
    );

    // 🔥 TELEPORT TO BODY: Prevents clipping and mouse offset
    if (usePortal) {
        return ReactDOM.createPortal(cardContent, document.body);
    }
    return cardContent;
};

// ============================================================================
// 🚀 MAIN COMPONENT
// ============================================================================
export default function KanbanBoardTab({ projectId }) {
    const { data: project } = useProject(projectId);
    const { data: orgStaff = [] } = useStaff();
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
    const { data: rawMasterBoqs = [] } = useMasterBoqs();
    const { data: rawResources = [] } = useResources();
    const updateProjectMutation = useUpdateProject();

    const parseSafe = (str, fallback = []) => {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try { return JSON.parse(str); } catch { return fallback; }
    };

    const tasks = useMemo(() => {
        if (!project || !project.ganttTasks) return [];
        return typeof project.ganttTasks === 'string' ? parseSafe(project.ganttTasks, []) : project.ganttTasks;
    }, [project?.ganttTasks]);

    const projectBoqItems = useMemo(() => rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })), [rawProjectBoqs]);
    const masterBoqs = useMemo(() => rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) })), [rawMasterBoqs]);
    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}), rateHistory: parseSafe(r.rateHistory, []) })), [rawResources]);

    const { renderedProjectBoq } = useProjectCalculations(projectBoqItems, masterBoqs, resources, project);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [formData, setFormData] = useState({ title: '', status: 'Not Started', priority: 'Medium', boqItemId: '', assigneeId: '' });

    const executeUpdate = async (updatedTasks) => {
        await updateProjectMutation.mutateAsync({
            id: projectId,
            data: { ganttTasks: JSON.stringify(updatedTasks) }
        });
    };

    const handleOnDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        const updatedTasks = tasks.map(t => t.id === draggableId ? { ...t, status: newStatus } : t);

        await executeUpdate(updatedTasks);
    };

    const handleOpenDialog = (task = null) => {
        if (task) {
            setEditingTaskId(task.id);
            setFormData({ ...task, title: task.title || task.name || '' });
        } else {
            setEditingTaskId(null);
            setFormData({ title: '', status: 'Not Started', priority: 'Medium', boqItemId: '', assigneeId: '' });
        }
        setIsDialogOpen(true);
    };

    const handleSaveTask = async () => {
        if (!formData.title) return;
        const payload = {
            ...formData,
            name: formData.title,
            id: editingTaskId || crypto.randomUUID(),
            createdAt: formData.createdAt || new Date().toISOString()
        };

        let updatedTasks;
        if (editingTaskId) {
            updatedTasks = tasks.map(t => t.id === editingTaskId ? payload : t);
        } else {
            updatedTasks = [...tasks, payload];
        }

        await executeUpdate(updatedTasks);
        setIsDialogOpen(false);
    };

    const handleDeleteTask = async (id) => {
        if (window.confirm("Delete this task?")) {
            const updatedTasks = tasks.filter(t => t.id !== id);
            await executeUpdate(updatedTasks);
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
                    TASK_MANAGER: <span style={{ color: '#3b82f6' }}>KANBAN</span>
                </Typography>
                <Button
                    variant="contained" startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', px: 3 }}
                >
                    NEW_TASK
                </Button>
            </Box>

            <DragDropContext onDragEnd={handleOnDragEnd}>
                <Grid container spacing={2} sx={{ minHeight: '65vh' }}>
                    {COLUMNS.map(col => {
                        const columnTasks = tasks.filter(t => t.status === col.id);

                        return (
                            <Grid item xs={12} md={2.4} key={col.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{
                                    bgcolor: 'rgba(13, 31, 60, 0.4)', borderRadius: 2, p: 1.5, flexGrow: 1,
                                    border: '1px solid', borderColor: 'divider', transition: '0.2s',
                                    '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.05)' }
                                }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={2} px={1}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: col.color }} />
                                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 'bold', color: 'text.secondary' }}>
                                            {col.label}
                                        </Typography>
                                        <Typography sx={{ ml: 'auto', fontSize: '11px', opacity: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>
                                            {columnTasks.length}
                                        </Typography>
                                    </Box>

                                    <Droppable droppableId={col.id}>
                                        {(provided, snapshot) => (
                                            <Box
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                sx={{
                                                    height: '100%',
                                                    minHeight: '100px',
                                                    bgcolor: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                    transition: 'background-color 0.2s ease',
                                                    borderRadius: 1
                                                }}
                                            >
                                                {columnTasks.map((task, index) => (
                                                    <Draggable key={String(task.id)} draggableId={String(task.id)} index={index}>
                                                        {(provided, snapshot) => (
                                                            <KanbanTaskCard
                                                                task={task}
                                                                provided={provided}
                                                                snapshot={snapshot}
                                                                handleOpenDialog={handleOpenDialog}
                                                                handleDeleteTask={handleDeleteTask}
                                                            />
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </Box>
                                        )}
                                    </Droppable>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            </DragDropContext>

            {/* TASK DIALOG (EDIT / ADD) */}
            <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                    {editingTaskId ? 'UPDATE_TASK' : 'INITIALIZE_TASK'}
                </DialogTitle>
                <DialogContent dividers sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)', pt: 3 }}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <TextField fullWidth label="TASK_TITLE" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />

                        <TextField select fullWidth label="PRIORITY" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                            {['Low', 'Medium', 'High', 'CRITICAL'].map(p => <MenuItem key={p} value={p} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.toUpperCase()}</MenuItem>)}
                        </TextField>

                        <TextField select fullWidth label="STATUS_LANE" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                            {COLUMNS.map(col => <MenuItem key={col.id} value={col.id} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{col.label}</MenuItem>)}
                        </TextField>

                        <TextField select fullWidth label="LINK_BOQ_ITEM" value={formData.boqItemId || ""} onChange={e => setFormData({ ...formData, boqItemId: e.target.value })}>
                            <MenuItem value="">NONE</MenuItem>
                            {renderedProjectBoq.map(item => (
                                <MenuItem key={item.id} value={item.id} sx={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>{item.displayDesc}</MenuItem>
                            ))}
                        </TextField>

                        <TextField select fullWidth label="ASSIGN_TO" value={formData.assigneeId || ""} onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}>
                            <MenuItem value="">UNASSIGNED</MenuItem>
                            {orgStaff.map(s => <MenuItem key={s.id} value={s.name} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{s.name.toUpperCase()}</MenuItem>)}
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Button onClick={() => setIsDialogOpen(false)} color="inherit" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>CANCEL</Button>
                    <Button variant="contained" color="success" onClick={handleSaveTask} sx={{ fontFamily: "'JetBrains Mono', monospace", borderRadius: 50, px: 3 }}>
                        {editingTaskId ? 'SYNC_CHANGES' : 'COMMIT_TASK'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}