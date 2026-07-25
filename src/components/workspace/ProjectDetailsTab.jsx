import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import {
    Box, Typography, Paper, Grid, TextField, MenuItem, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, LinearProgress, Tooltip, Chip, Checkbox, FormControlLabel,
    Collapse, Switch
} from '@mui/material';

import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const ALL_TABS = [
    { id: "details", label: "Project Details" },
    { id: "documents", label: "Docs & Drawings" },
    { id: "boq", label: "Master BOQ" },
    { id: "schedule", label: "Gantt Schedule" },
    { id: "subcontractors", label: "Subcontractors" },
    { id: "kanban", label: "Task Board" },
    { id: "gallery", label: "Site Photo Gallery" },
    { id: "daily_log", label: "Daily Log" },
    { id: "mbook", label: "Measurement Book" },
    { id: "resources", label: "Resource Deficits" },
    { id: "procurement", label: "Procurement (POs)" },
    { id: "inventory", label: "Stock Inventory" },
    { id: "billing", label: "Client RA Billing" },
    { id: "chat", label: "Project CommLink" }
];

// 🔥 CPM ENGINE DUPLICATED HERE FOR PERFECT SYNC
const calculateLiveForecast = (tasks) => {
    let live = tasks.map(t => {
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        const duration = Math.max(1, Math.ceil((end - start) / 86400000) + 1);
        return {
            ...t,
            plannedDuration: duration,
            forecastStart: t.actualStart || t.startDate,
            forecastEnd: t.actualEnd || null
        };
    });

    live = live.map(t => {
        if (!t.forecastEnd) {
            const fs = new Date(t.forecastStart);
            if (t.type !== 'Milestone') fs.setDate(fs.getDate() + t.plannedDuration - 1);
            t.forecastEnd = fs.toISOString().split('T')[0];
        }
        return t;
    });

    let changed = true;
    let iters = 0;
    while (changed && iters < 20) {
        changed = false;
        iters++;
        live = live.map(task => {
            let newStart = new Date(task.forecastStart);
            if (!task.actualStart && task.dependency && task.dependency.taskId) {
                const pred = live.find(t => t.id === task.dependency.taskId);
                if (pred && pred.forecastEnd) {
                    const predStart = new Date(pred.forecastStart);
                    const predEnd = new Date(pred.forecastEnd);
                    const lag = Number(task.dependency.lag) || 0;
                    const isMilestone = task.type === 'Milestone';

                    if (task.dependency.type === 'FS') {
                        newStart = new Date(predEnd);
                        newStart.setDate(newStart.getDate() + (isMilestone ? 0 : 1) + lag);
                    } else if (task.dependency.type === 'SS') {
                        newStart = new Date(predStart);
                        newStart.setDate(newStart.getDate() + lag);
                    } else if (task.dependency.type === 'FF') {
                        const tempEnd = new Date(predEnd);
                        tempEnd.setDate(tempEnd.getDate() + lag);
                        newStart = new Date(tempEnd);
                        if (!isMilestone) newStart.setDate(newStart.getDate() - task.plannedDuration + 1);
                    } else if (task.dependency.type === 'SF') {
                        const tempEnd = new Date(predStart);
                        tempEnd.setDate(tempEnd.getDate() + lag);
                        newStart = new Date(tempEnd);
                        if (!isMilestone) newStart.setDate(newStart.getDate() - task.plannedDuration + 1);
                    }
                }
            }

            let newEnd = task.actualEnd ? new Date(task.actualEnd) : new Date(newStart);
            if (!task.actualEnd && task.type !== 'Milestone') {
                newEnd.setDate(newStart.getDate() + task.plannedDuration - 1);
            }

            const startStr = newStart.toISOString().split('T')[0];
            const endStr = newEnd.toISOString().split('T')[0];

            if (task.forecastStart !== startStr || task.forecastEnd !== endStr) {
                changed = true;
                return { ...task, forecastStart: startStr, forecastEnd: endStr };
            }
            return task;
        });
    }
    return live;
};

const StaffRow = ({ staffId, staff, permissions, permissionMap, updateProject, hasClearance, handleRemoveStaff }) => {
    const [open, setOpen] = useState(false);
    const isL5 = staff.accessLevel >= 5;
    const canEdit = hasClearance(4) && !isL5;

    const handleToggle = (tabId, isChecked) => {
        const nextPerms = isChecked ? [...permissions, tabId] : permissions.filter(t => t !== tabId);
        const newMap = { ...permissionMap, [staffId]: nextPerms };
        updateProject('assignedStaff', JSON.stringify(newMap));
    };

    return (
        <React.Fragment>
            <TableRow
                hover
                onClick={() => canEdit && setOpen(!open)}
                sx={{
                    cursor: canEdit ? 'pointer' : 'default',
                    '& > *': { borderBottom: 'unset' },
                    bgcolor: open ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                }}
            >
                <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography component="div" variant="body2" sx={{ fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>
                            {staff.name} {isL5 && <Chip label="ROOT" size="small" sx={{ height: 16, fontSize: '8px', bgcolor: 'primary.main', ml: 1 }} />}
                        </Typography>
                        {canEdit && (open ? <ExpandLess fontSize="small" sx={{ opacity: 0.5 }} /> : <ExpandMore fontSize="small" sx={{ opacity: 0.5 }} />)}
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px' }}>
                        {staff.designation || 'Staff'}
                    </Typography>
                </TableCell>
                <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                        {isL5 ? (
                            <Chip label="FULL_SYSTEM_ACCESS" size="small" color="primary" variant="outlined" sx={{ fontSize: '9px', height: 18 }} />
                        ) : permissions.length > 0 ? (
                            permissions.slice(0, 4).map(p => <Chip key={p} label={p.toUpperCase()} size="small" sx={{ fontSize: '8px', height: 16, bgcolor: 'rgba(255,255,255,0.05)' }} />)
                        ) : (
                            <Typography variant="caption" sx={{ color: 'error.light', fontSize: '9px' }}>NO_ACCESS_GRANTED</Typography>
                        )}
                        {!isL5 && permissions.length > 4 && <Typography variant="caption" sx={{ fontSize: '9px', pt: 0.5 }}>+{permissions.length - 4} more</Typography>}
                    </Box>
                </TableCell>
                <TableCell align="right">
                    {hasClearance(4) && (
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleRemoveStaff(staffId); }}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>

            {canEdit && (
                <TableRow>
                    <TableCell colSpan={3} sx={{ p: 0, pt: 0, pb: open ? 2 : 0, borderBottom: open ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ mx: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, border: '1px solid rgba(34, 211, 238, 0.1)' }}>
                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", display: 'block', mb: 2, opacity: 0.6 }}>
                                    TOGGLE GRANTED PAGES:
                                </Typography>
                                <Grid container spacing={1}>
                                    {ALL_TABS.map(tab => (
                                        <Grid item xs={12} sm={6} md={4} lg={3} key={tab.id}>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        size="small"
                                                        color="info"
                                                        checked={permissions.includes(tab.id)}
                                                        onChange={(e) => handleToggle(tab.id, e.target.checked)}
                                                    />
                                                }
                                                label={<Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{tab.label.toUpperCase()}</Typography>}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

export default function ProjectDetailsTab({ project, updateProject, regions, resources, totalAmount, projectBoqItems, togglePriceLock, crmContacts, orgStaff }) {

    const { formatCurrency, settings } = useSettings();
    const { hasClearance } = useAuth();

    const [selectedNewMember, setSelectedNewMember] = useState("");

    const { permissionMap, assignedIdsArray } = useMemo(() => {
        const raw = project?.assignedStaff || '[]';
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                const map = {};
                parsed.forEach(id => map[id] = ["details", "documents", "chat"]);
                return { permissionMap: map, assignedIdsArray: parsed };
            } else {
                return { permissionMap: parsed, assignedIdsArray: Object.keys(parsed) };
            }
        } catch (e) {
            return { permissionMap: {}, assignedIdsArray: [] };
        }
    }, [project?.assignedStaff]);

    const availableStaff = (orgStaff || []).filter(staff => !assignedIdsArray.includes(staff.id));

    const handleAddMember = () => {
        if (!selectedNewMember) return;
        const newMap = { ...permissionMap, [selectedNewMember]: ["details", "documents", "chat"] };
        updateProject('assignedStaff', JSON.stringify(newMap));
        setSelectedNewMember("");
    };

    const handleRemoveStaff = (idToRemove) => {
        const newMap = { ...permissionMap };
        delete newMap[idToRemove];
        updateProject('assignedStaff', JSON.stringify(newMap));
    };

    const totalBilled = Array.isArray(project?.raBills) ? project.raBills.reduce((sum, bill) => sum + Number(bill.subTotal || 0), 0) : 0;
    const activeTasks = Array.isArray(project?.ganttTasks) ? project.ganttTasks.filter(t => t.status !== 'Completed').length : 0;
    const totalGrns = Array.isArray(project?.grns) ? project.grns.length : 0;

    const timelineMetrics = useMemo(() => {
        const tasks = Array.isArray(project?.ganttTasks) ? project.ganttTasks : [];
        const liveTasks = calculateLiveForecast(tasks);

        let start = new Date(project?.startDate || project?.createdAt || Date.now());
        let end = project?.endDate ? new Date(project.endDate) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
        let baselineEnd = new Date(end);
        let completedTasksCount = 0;

        if (liveTasks.length > 0) {
            let min = new Date(liveTasks[0].startDate);
            let max = new Date(liveTasks[0].forecastEnd);
            let baseMax = new Date(liveTasks[0].endDate);

            liveTasks.forEach(task => {
                const sDate = new Date(task.startDate);
                const bEnd = new Date(task.endDate);
                const fEnd = new Date(task.forecastEnd);

                if (sDate < min) min = sDate;
                if (fEnd > max) max = fEnd;
                if (bEnd > baseMax) baseMax = bEnd;
                if (task.status === "Completed") completedTasksCount++;
            });
            start = min;
            end = max;
            baselineEnd = baseMax;
        }

        const today = new Date();
        const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const daysElapsed = Math.max(0, Math.ceil((today - start) / (1000 * 60 * 60 * 24)) + 1);
        const remaining = Math.max(0, totalDays - daysElapsed);

        const scheduleVariance = Math.round((end - baselineEnd) / (1000 * 60 * 60 * 24));
        const timePercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
        const taskPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

        return {
            start: start.toLocaleDateString(), end: end.toLocaleDateString(),
            duration: totalDays, elapsed: daysElapsed, remaining,
            timePercent, taskPercent, totalTasks: tasks.length,
            completedTasks: completedTasksCount, scheduleVariance
        };
    }, [project]);

    const inflationRisk = useMemo(() => {
        let totalExposure = 0;
        (projectBoqItems || []).forEach(item => {
            const res = resources?.find(r => r.code === item.itemCode);
            if (res && Array.isArray(res.rateHistory) && res.rateHistory.length > 0) {
                const sortedHistory = [...res.rateHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
                const currentMarketRate = Number(sortedHistory[0].rate || 0);
                const budgetedRate = Number(item.rate || 0);
                if (currentMarketRate > budgetedRate) {
                    totalExposure += ((currentMarketRate - budgetedRate) * Number(item.computedQty || 0));
                }
            }
        });
        return totalExposure;
    }, [projectBoqItems, resources]);

    const costByPhaseData = useMemo(() => {
        const phases = {};
        (projectBoqItems || []).forEach(item => {
            const phase = item.phase || "General";
            phases[phase] = (phases[phase] || 0) + Number(item.amount || 0);
        });
        return Object.entries(phases).map(([name, value]) => ({ name: name.toUpperCase(), value })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    }, [projectBoqItems]);

    const timeSeriesData = useMemo(() => {
        const months = {};
        const getMonthKey = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr);
            return isNaN(d) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        };

        (Array.isArray(project?.raBills) ? project.raBills : []).forEach(bill => {
            const key = getMonthKey(bill.date);
            if (key) {
                if (!months[key]) months[key] = { name: key, planned: 0, actual: 0 };
                months[key].actual += Number(bill.subTotal || 0);
            }
        });

        const tasks = Array.isArray(project?.ganttTasks) ? project.ganttTasks : [];
        tasks.forEach(task => {
            const key = getMonthKey(task.createdAt || task.actualStart || project?.createdAt);
            if (key) {
                if (!months[key]) months[key] = { name: key, planned: 0, actual: 0 };
                months[key].planned += (totalAmount / (tasks.length || 1));
            }
        });

        let cumulativePlanned = 0, cumulativeActual = 0;
        return Object.values(months).sort((a, b) => a.name.localeCompare(b.name)).map(month => {
            cumulativePlanned += month.planned; cumulativeActual += month.actual;
            return { name: month.name, MonthlyBilled: month.actual, CumulativePlanned: cumulativePlanned, CumulativeActual: cumulativeActual };
        });
    }, [project, totalAmount]);

    const [localProject, setLocalProject] = useState(project || {});

    useEffect(() => { setLocalProject(project || {}); }, [project]);

    const debouncedUpdateProject = useCallback(
        debounce((field, value) => { updateProject(field, value); }, 500),
        [updateProject]
    );

    const handleChange = (field, value) => {
        setLocalProject(prev => ({ ...prev, [field]: value }));
        debouncedUpdateProject(field, value);
    };

    const formatYAxis = (val) => {
        if (settings.currencyLocale === 'en-IN') return `${settings.currencySymbol}${(val / 100000).toFixed(1)}L`;
        if (val >= 1000000) return `${settings.currencySymbol}${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${settings.currencySymbol}${(val / 1000).toFixed(0)}K`;
        return `${settings.currencySymbol}${val}`;
    };

    const getExpectedSubPath = () => {
        let template = settings.scaffoldPathTemplate || "./{TYPE}/{STATUS}/{NAME}";
        template = template.replace(/^[.\/\\]+/, '');
        const safeStr = (str, fallback) => (str ? String(str).replace(/[<>:"|?*]/g, '').trim() : fallback);

        return template
            .replace(/\{\{?TYPE\}\}?/ig, safeStr(localProject?.type, 'Uncategorized'))
            .replace(/\{\{?STATUS\}\}?/ig, safeStr(localProject?.status, 'Active'))
            .replace(/\{\{?CODE\}\}?/ig, safeStr(localProject?.code, 'NOCODE'))
            .replace(/\{\{?NAME\}\}?/ig, safeStr(localProject?.name, 'Untitled Project'))
            .replace(/\{\{?CLIENT\}\}?/ig, safeStr(localProject?.clientName, 'No Client'));
    };

    // 🔥 FIXED: SCAFFOLD LOGIC
    const handleScaffold = async () => {
        if (!settings.scaffoldRoot) return alert("Please configure the Scaffold Root in Company Settings first.");
        if (!window.api?.os?.scaffoldProject) return alert("Scaffolding is only supported on the Desktop Host App.");

        try {
            // Force the folders into a strict Array for Rust
            let safeFolders = [];
            if (Array.isArray(settings.templateFolders)) {
                safeFolders = settings.templateFolders;
            } else if (typeof settings.templateFolders === 'string') {
                safeFolders = settings.templateFolders.split(',').map(f => f.trim()).filter(Boolean);
            }

            const payload = {
                rootPath: String(settings.scaffoldRoot).trim(),
                projectFolderName: String(getExpectedSubPath()).trim(),
                templateFolders: safeFolders
            };

            const res = await window.api.os.scaffoldProject(payload);

            // 🔥 FIX: Because webBridge unwraps successful data, `res` is just the path string!
            // If it failed, it will be an object { success: false, error: ... }
            if (typeof res === 'string') {
                await updateProject('isScaffolded', 1);
                await updateProject('isManuallyLinked', 0);
                await updateProject('scaffoldPath', res);
                alert("Workspace scaffolded successfully!");
            } else {
                alert("Failed to scaffold: " + (res?.error || "Unknown error"));
            }
        } catch (err) {
            alert("Error: " + err.message);
        }
    };

    const handleLinkExisting = async () => {
        if (!window.api?.os?.pickDirectory) return alert("File system access is only supported on the Desktop Host App.");
        const path = await window.api.os.pickDirectory();
        if (path) {
            await updateProject('isScaffolded', 1);
            await updateProject('isManuallyLinked', 1);
            await updateProject('scaffoldPath', path);
            alert("Successfully linked to the existing folder!");
        }
    };

    const handleUnlinkScaffold = async () => {
        if (window.confirm("Unlink this workspace from its host folder?\n\nYour actual files will NOT be deleted.")) {
            await updateProject('isScaffolded', 0);
            await updateProject('isManuallyLinked', 0);
            await updateProject('scaffoldPath', null);
        }
    };

    const handleMetadataBlur = async () => {
        if (!project?.isScaffolded || !project?.scaffoldPath || !settings.scaffoldRoot || project?.isManuallyLinked) return;
        if (!window.api?.os?.renameProjectFolder) return;

        // Future-proofing for when we build renameProjectFolder in Rust
        const res = await window.api.os.renameProjectFolder({
            rootPath: settings.scaffoldRoot,
            oldPath: project.scaffoldPath,
            newFolderName: getExpectedSubPath()
        });
        if (res.success) await updateProject('scaffoldPath', res.data);
    };

    const clientList = (crmContacts || []).filter(c => c.type === 'Client');
    const contractorList = (crmContacts || []).filter(c => c.type === 'Subcontractor' || c.type === 'Supplier');

    return (
        <Box display="flex" flexDirection="column" gap={4}>

            {/* 🔥 TIER 1: KPI DASHBOARD */}
            <Grid container spacing={2}>
                {[
                    { label: 'TOTAL CONTRACT', val: formatCurrency(totalAmount), color: '#3b82f6' },
                    { label: 'BILLED TO DATE', val: formatCurrency(totalBilled), color: '#10b981' },
                    {
                        label: 'SCHEDULE VARIANCE',
                        val: timelineMetrics.scheduleVariance > 0 ? `+${timelineMetrics.scheduleVariance} Days (Lag)` : timelineMetrics.scheduleVariance < 0 ? `${Math.abs(timelineMetrics.scheduleVariance)} Days (Lead)` : 'On Schedule',
                        color: timelineMetrics.scheduleVariance > 0 ? '#ef4444' : timelineMetrics.scheduleVariance < 0 ? '#10b981' : '#f59e0b',
                        icon: timelineMetrics.scheduleVariance > 0 ? <ReportProblemIcon fontSize="small" /> : timelineMetrics.scheduleVariance < 0 ? <CheckCircleIcon fontSize="small" /> : null
                    },
                    { label: 'INFLATION RISK', val: `+${formatCurrency(inflationRisk)}`, color: '#ef4444', icon: <ReportProblemIcon fontSize="small" /> },
                    { label: 'PENDING TASKS', val: `${activeTasks} Items`, color: '#f59e0b' },
                    { label: 'GRNs LOGGED', val: `${totalGrns} Inward`, color: '#8b5cf6' }
                ].map((kpi, i) => (
                    <Grid item xs={12} sm={6} md={2} key={i}>
                        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)', borderTop: `4px solid ${kpi.color}`, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: 'text.secondary', whiteSpace: 'nowrap' }}>{kpi.label}</Typography>
                            <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", mt: 1, display: 'flex', alignItems: 'center', gap: 1, fontSize: { xs: '1.1rem', md: '1.25rem' }, color: kpi.color === '#ef4444' || kpi.color === '#10b981' || kpi.color === '#f59e0b' ? kpi.color : 'inherit', whiteSpace: 'nowrap' }}>
                                {kpi.icon} {kpi.val}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* 🔥 TIER 2: TIMELINE CARDS */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.3)' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.main' }}>PROJECT SCHEDULE TRACKING (LIVE FORECAST)</Typography>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={6} md={3}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <CalendarTodayIcon color="primary" />
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>START_DATE</Typography>
                                <Typography variant="body1" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{timelineMetrics.start}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <AccessTimeIcon color="warning" />
                            <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>EST_COMPLETION</Typography>
                                <Typography variant="body1" fontWeight="bold" color="warning.main" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>{timelineMetrics.end}</Typography>
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>TIME ELAPSED: <strong style={{ color: '#fff' }}>{timelineMetrics.elapsed} / {timelineMetrics.duration} Days</strong></Typography>
                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace" }}><strong style={{ color: '#f59e0b' }}>{timelineMetrics.timePercent}%</strong></Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={timelineMetrics.timePercent} sx={{ height: 6, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }} />
                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>TASK COMPLETION: <strong style={{ color: '#fff' }}>{timelineMetrics.completedTasks} / {timelineMetrics.totalTasks} Tasks</strong></Typography>
                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace" }}><strong style={{ color: '#10b981' }}>{timelineMetrics.taskPercent}%</strong></Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={timelineMetrics.taskPercent} color="success" sx={{ height: 6, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.1)' }} />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* 🔥 TIER 3: METADATA FORM */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Box display="flex" flexDirection={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} gap={2} mb={3}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>PROJECT CORE METADATA</Typography>

                    <Box sx={{ width: { xs: '100%', lg: 'auto' }, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap' }}>
                        {project?.isScaffolded ? (
                            <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }}>
                                <Button variant="outlined" color="info" onClick={() => window.api.os.openFile(project.scaffoldPath)} fullWidth startIcon={<FolderOpenIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', borderRadius: 50, whiteSpace: 'nowrap' }}>OPEN DIRECTORY</Button>
                                <Tooltip title="Unlink Directory">
                                    <IconButton color="error" onClick={handleUnlinkScaffold} sx={{ border: '1px solid', borderColor: 'error.dark', borderRadius: 50, px: 2 }}><LinkOffIcon fontSize="small" /></IconButton>
                                </Tooltip>
                            </Box>
                        ) : (
                            <Box display="flex" gap={1} width={{ xs: '100%', sm: 'auto' }} flexDirection={{ xs: 'column', sm: 'row' }}>
                                <Button variant="outlined" color="info" onClick={handleLinkExisting} fullWidth={{ xs: true, sm: false }} startIcon={<LinkIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', borderRadius: 50, whiteSpace: 'nowrap' }}>LINK FOLDER</Button>
                                <Button variant="contained" color="primary" onClick={handleScaffold} fullWidth={{ xs: true, sm: false }} startIcon={<CreateNewFolderIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', borderRadius: 50, whiteSpace: 'nowrap' }}>SCAFFOLD FOLDERS</Button>
                            </Box>
                        )}
                        <Button variant={project?.isPriceLocked ? "outlined" : "contained"} color={project?.isPriceLocked ? "success" : "warning"} onClick={togglePriceLock} fullWidth={{ xs: true, sm: false }} startIcon={project?.isPriceLocked ? <LockIcon /> : <LockOpenIcon />} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', borderRadius: 50, whiteSpace: 'nowrap' }}>
                            {project?.isPriceLocked ? "PRICING LOCKED" : "LOCK PRICING"}
                        </Button>
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth label="PROJECT NAME" value={localProject?.name || ''} onChange={(e) => handleChange('name', e.target.value)} onBlur={handleMetadataBlur} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 'bold' } }} disabled={!hasClearance(4)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth label="PROJECT CODE" value={localProject?.code || ''} onChange={(e) => handleChange('code', e.target.value)} onBlur={handleMetadataBlur} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)} />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField fullWidth label="PROJECT TYPE" value={localProject?.type || ''} placeholder="e.g. Residential, Hospital" onChange={(e) => handleChange('type', e.target.value)} onBlur={handleMetadataBlur} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField select fullWidth label="CLIENT NAME" value={localProject?.clientName || ''} onChange={(e) => handleChange('clientName', e.target.value)} onBlur={handleMetadataBlur} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)}>
                            <MenuItem value="" sx={{ fontStyle: 'italic', fontFamily: "'JetBrains Mono', monospace" }}>-- No Client Assigned --</MenuItem>
                            {clientList.map(c => <MenuItem key={c.id} value={c.name} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField select fullWidth label="PRIMARY CONTRACTOR" value={localProject?.pmc || ''} onChange={(e) => handleChange('pmc', e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)}>
                            <MenuItem value="" sx={{ fontStyle: 'italic', fontFamily: "'JetBrains Mono', monospace" }}>-- Open / Self-Executed --</MenuItem>
                            {contractorList.map(c => <MenuItem key={c.id} value={c.name} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth label="LOCATION / SITE" value={localProject?.location || ''} onChange={(e) => handleChange('location', e.target.value)} onBlur={handleMetadataBlur} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)} />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth select label="REGION / COST ZONE" value={localProject?.region || ''} onChange={(e) => handleChange('region', e.target.value)} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)}>
                            <MenuItem value="">-- Auto-Detect First Rate --</MenuItem>
                            {regions.map(r => <MenuItem key={r.id} value={r.name} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{r.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField fullWidth select label="PROJECT STATUS" value={localProject?.status || ''} onChange={(e) => handleChange('status', e.target.value)} onBlur={handleMetadataBlur} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' } }} disabled={!hasClearance(4)}>
                            {['Draft', 'Planning', 'Active', 'On Hold', 'Completed'].map(s => <MenuItem key={s} value={s} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{s}</MenuItem>)}
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            {/* 🔥 TIER 4: PROJECT TEAM ROSTER WITH GRANULAR PERMISSIONS */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', mb: 3 }}>PROJECT TEAM ROSTER & PERMISSIONS</Typography>
                <Grid container spacing={3}>
                    {hasClearance(4) && (
                        <Grid item xs={12}>
                            <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'center' }} p={2} sx={{ border: '1px dashed', borderColor: 'primary.main', borderRadius: 2, bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
                                <TextField select fullWidth size="small" label="Select Staff Member to Assign" value={selectedNewMember} onChange={(e) => setSelectedNewMember(e.target.value)} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                                    {availableStaff.length === 0 && <MenuItem disabled value="" sx={{ fontStyle: 'italic' }}>No available staff</MenuItem>}
                                    {availableStaff.map((staff) => <MenuItem key={staff.id} value={staff.id}>{staff.name} — {staff.designation}</MenuItem>)}
                                </TextField>
                                <Button variant="contained" onClick={handleAddMember} disabled={!selectedNewMember} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'nowrap', px: 3 }}>ASSIGN_MEMBER</Button>
                            </Box>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)' }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.4)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary', width: '35%' }}>MEMBER_IDENTITY</TableCell>
                                        <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary', width: '55%' }}>ACCESS_PERMISSIONS</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary', width: '10%' }}>ACTION</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {assignedIdsArray.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>No personnel currently assigned.</TableCell></TableRow>
                                    ) : (
                                        assignedIdsArray.map((staffId) => {
                                            const staff = orgStaff?.find(s => s.id === staffId);
                                            if (!staff) return null;
                                            return (
                                                <StaffRow
                                                    key={staffId}
                                                    staffId={staffId}
                                                    staff={staff}
                                                    permissions={permissionMap[staffId] || []}
                                                    permissionMap={permissionMap}
                                                    updateProject={updateProject}
                                                    hasClearance={hasClearance}
                                                    handleRemoveStaff={handleRemoveStaff}
                                                />
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                </Grid>
            </Paper>

            {/* 🔥 TIER 5: ANALYTICS DASHBOARD */}
            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Typography variant="subtitle2" fontWeight="bold" mb={3} sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>PROJECT S-CURVE (CUMULATIVE PLANNED VS. ACTUAL)</Typography>
                        <Box sx={{ width: '100%', minHeight: 350 }}>
                            {timeSeriesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
                                        <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={formatYAxis} width={60} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(13,31,60,0.9)', borderColor: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }} formatter={(val) => formatCurrency(val)} />
                                        <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="CumulativeActual" name="Actual Progress" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                                        <Line type="monotone" dataKey="CumulativePlanned" name="Baseline" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box display="flex" height={350} alignItems="center" justifyContent="center"><Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '12px' }}>NOT ENOUGH DATA TO PLOT S-CURVE</Typography></Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Typography variant="subtitle2" fontWeight="bold" mb={1} sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>BUDGET DISTRIBUTION BY PHASE</Typography>
                        <Box sx={{ width: '100%', minHeight: 350 }}>
                            {costByPhaseData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie data={costByPhaseData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                                            {costByPhaseData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(13,31,60,0.9)', borderColor: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }} formatter={(val) => formatCurrency(val)} />
                                        <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box display="flex" height={350} alignItems="center" justifyContent="center"><Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '12px' }}>ADD BOQ ITEMS TO SEE DISTRIBUTION</Typography></Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)' }}>
                        <Typography variant="subtitle2" fontWeight="bold" mb={3} sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>MONTHLY REVENUE / CASH FLOW</Typography>
                        <Box sx={{ width: '100%', minHeight: 350 }}>
                            {timeSeriesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
                                        <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} tickFormatter={formatYAxis} width={60} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(13,31,60,0.9)', borderColor: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} formatter={(val) => formatCurrency(val)} />
                                        <Legend wrapperStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }} />
                                        <Bar dataKey="MonthlyBilled" name="Actual Revenue (Billed)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box display="flex" height={350} alignItems="center" justifyContent="center"><Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '12px' }}>NO CASH FLOW DATA TO DISPLAY</Typography></Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}