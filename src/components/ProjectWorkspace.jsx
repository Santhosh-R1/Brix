import React, { useState, useEffect, useRef, useMemo } from "react";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { exportProjectExcel } from "../utils/exportExcel";
import { exportProjectPdf, exportResourceTrackerPdf } from "../utils/exportPdf";
import { getSelectedRate } from "../engines/calculationEngine";

import { useProjectCalculations } from "../hooks/useProjectCalculations";
import MasterBoqEditor from "./workspace/MasterBoqEditor";

import ProjectDetailsTab from "./workspace/ProjectDetailsTab";
import BoqBuilderTab from "./workspace/BoqBuilderTab";
import MeasurementBookTab from "./workspace/MeasurementBookTab";
import GanttScheduleTab from "./workspace/GanttScheduleTab";
import SubcontractorBidTab from "./workspace/SubcontractorBidTab";
import DailyLogTab from "./workspace/DailyLogTab";
import ResourceTrackerTab from "./workspace/ResourceTrackerTab";
import ProcurementTab from "./workspace/ProcurementTab";
import ClientBillingTab from "./workspace/ClientBillingTab";
import KanbanBoardTab from "./workspace/KanbanBoardTab";
import FormulaGuideDialog from "./workspace/FormulaGuideDialog";
import InventoryTab from "./workspace/InventoryTab";
import DocumentsTab from "./workspace/DocumentsTab";
import SiteGalleryTab from "./workspace/SiteGalleryTab";
import ChatModule from "./workspace/ChatModule";
import VectorPlanEstimator from "./workspace/VectorPlanEstimator";

import {
    Box, Typography, Button, Paper, Dialog, DialogTitle, DialogContent,
    DialogActions, FormControlLabel, Checkbox, IconButton, Tooltip,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Chip, Grid, Skeleton
} from "@mui/material";

// Workspace Navigation Icons
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import SquareFootOutlinedIcon from '@mui/icons-material/SquareFootOutlined';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

import { useAuth } from "../context/AuthContext";

// 🔥 REACT QUERY HOOKS
import { useQueryClient } from '@tanstack/react-query';
import {
    useProject, useRegions, useResources, useMasterBoqs, useProjectBoqs,
    useCrmContacts, useStaff, useUpdateProject, useUpdateProjectBoq
} from "../hooks/useQueries";

const RAW_CATEGORIES = {
    planning: {
        id: "planning", label: "PLANNING & SETUP", minClearance: 1, color: '#3b82f6',
        children: [
            { id: "details", label: "Project Details", minClearance: 1, icon: <InfoOutlinedIcon /> },
            // { id: "documents", label: "Docs & Drawings", minClearance: 1, icon: <FolderCopyOutlinedIcon /> },
            { id: "boq", label: "Master BOQ", minClearance: 3, icon: <ListAltOutlinedIcon /> },
            // { id: "schedule", label: "Gantt Schedule", minClearance: 2, icon: <CalendarTodayOutlinedIcon /> },
            // { id: "subcontractors", label: "Subcontractors", minClearance: 3, icon: <HandshakeOutlinedIcon /> }
        ]
    },
    execution: {
        id: "execution", label: "SITE EXECUTION", minClearance: 2, color: '#f59e0b',
        children: [
            // { id: "kanban", label: "Task Board", minClearance: 2, icon: <ViewKanbanOutlinedIcon /> },
            // { id: "gallery", label: "Site Photo Gallery", minClearance: 2, icon: <PhotoLibraryOutlinedIcon /> },
            // { id: "daily_log", label: "Daily Log", minClearance: 2, icon: <MenuBookOutlinedIcon /> },
            { id: "mbook", label: "Measurement Book", minClearance: 2, icon: <SquareFootOutlinedIcon /> },
            { id: "pdf_estimator", label: "PDF Qty Estimator", minClearance: 2, icon: <PictureAsPdfIcon /> }
        ]
    },
    supply_chain: {
        id: "supply_chain", label: "SUPPLY CHAIN", minClearance: 2, color: '#10b981',
        children: [
            { id: "resources", label: "Resource Deficits", minClearance: 3, icon: <PrecisionManufacturingOutlinedIcon /> },
            // { id: "procurement", label: "Procurement (POs)", minClearance: 3, icon: <ShoppingCartOutlinedIcon /> },
            // { id: "inventory", label: "Stock Inventory", minClearance: 2, icon: <Inventory2OutlinedIcon /> }
        ]
    },
    // financials: {
    //     id: "financials", label: "FINANCIALS", minClearance: 4, color: '#8b5cf6',
    //     children: [
    //         { id: "billing", label: "Client RA Billing", minClearance: 4, icon: <ReceiptLongOutlinedIcon /> }
    //     ]
    // },
    // communication: {
    //     id: "communication", label: "COMMUNICATION", minClearance: 1, color: '#ec4899',
    //     children: [
    //         { id: "chat", label: "Project CommLink", minClearance: 1, icon: <ForumOutlinedIcon /> }
    //     ]
    // }
};

export default function ProjectWorkspace({ projectId, onBack }) {
    const { hasClearance, currentUser } = useAuth();
    const queryClient = useQueryClient();

    // --- SIDEBAR STATE ---
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const SIDEBAR_CLOSED_WIDTH = 68;
    const SIDEBAR_OPEN_WIDTH = 260;

    // 🔥 AUTOMATIC DATA FETCHING VIA REACT QUERY
    const { data: rawProject, isLoading: isProjectLoading, error: projectError } = useProject(projectId);
    const { data: regions = [] } = useRegions();
    const { data: rawResources = [] } = useResources();
    const { data: rawMasterBoqs = [] } = useMasterBoqs();
    const { data: rawProjectBoqs = [] } = useProjectBoqs(projectId);
    const { data: crmContacts = [] } = useCrmContacts();
    const { data: orgStaff = [] } = useStaff();

    // 🔥 MUTATION HOOKS
    const updateProjectMutation = useUpdateProject();
    const updateProjectBoqMutation = useUpdateProjectBoq();

    // 🔥 SAFE DATA PARSING
    const parseSafe = (str, fallback = []) => {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try { return JSON.parse(str); } catch { return fallback; }
    };

    const project = useMemo(() => {
        if (!rawProject) return null;
        return {
            ...rawProject,
            dailyLogs: parseSafe(rawProject.dailyLogs, []), dailySchedules: parseSafe(rawProject.dailySchedules, []),
            actualResources: parseSafe(rawProject.actualResources, {}), ganttTasks: parseSafe(rawProject.ganttTasks, []),
            subcontractors: parseSafe(rawProject.subcontractors, []), purchaseOrders: parseSafe(rawProject.purchaseOrders, []),
            raBills: parseSafe(rawProject.raBills, []), phaseAssignments: parseSafe(rawProject.phaseAssignments, {}),
            materialRequests: parseSafe(rawProject.materialRequests, []), grns: parseSafe(rawProject.grns, [])
        };
    }, [rawProject]);

    const resources = useMemo(() => rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}), rateHistory: parseSafe(r.rateHistory, []) })), [rawResources]);
    const masterBoqs = useMemo(() => rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) })), [rawMasterBoqs]);
    const projectBoqItems = useMemo(() => rawProjectBoqs.map(b => ({ ...b, measurements: parseSafe(b.measurements, []) })), [rawProjectBoqs]);

    const loadData = () => {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        queryClient.invalidateQueries({ queryKey: ['projectBoqs', projectId] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        queryClient.invalidateQueries({ queryKey: ['masterBoqs'] });
    };

    // 🔥 HYBRID WORKSPACE GATEKEEPER
    useEffect(() => {
        if (!project || !currentUser) return;

        // 1. Super Admins bypass all locks
        if (hasClearance(5)) return;

        let permissions = {};
        try {
            const parsed = JSON.parse(project.assignedStaff || '{}');
            if (Array.isArray(parsed)) {
                parsed.forEach(id => permissions[id] = ["details", "documents"]);
            } else {
                permissions = parsed;
            }
        } catch (e) { permissions = {}; }

        const userRule = permissions[currentUser.id];

        // 2. EXPLICIT DENY: Overrides Level 4 Clearance
        if (userRule === 'blocked') {
            alert("ACCESS DENIED: You have been explicitly blocked from this project.");
            return onBack();
        }

        // 3. GLOBAL FALLBACK: If not explicitly assigned, check clearance
        if (userRule === undefined) {
            const userPerms = typeof currentUser?.globalPermissions === 'string' ? JSON.parse(currentUser.globalPermissions) : (currentUser?.globalPermissions || []);
            const hasGlobalOverride = userPerms.includes('workspace');

            if (!hasClearance(4) && !hasGlobalOverride) {
                alert("ACCESS DENIED: You are not assigned to this project's team.");
                return onBack();
            }
        }
    }, [project, currentUser, hasClearance, onBack]);

    // 🔥 HYBRID GRANULAR TABS RESOLVER
    const ALLOWED_CATEGORIES = useMemo(() => {
        if (!project || !currentUser) return {};
        const isSuperAdmin = hasClearance(5);

        let permissions = {};
        try {
            const parsed = JSON.parse(project.assignedStaff || '{}');
            if (Array.isArray(parsed)) {
                parsed.forEach(id => permissions[id] = ["details", "documents"]);
            } else {
                permissions = parsed;
            }
        } catch (e) { permissions = {}; }

        const userRule = permissions[currentUser.id];
        if (userRule === 'blocked') return {}; // Secondary safety catch

        let userGlobalPerms = [];
        try { userGlobalPerms = typeof currentUser?.globalPermissions === 'string' ? JSON.parse(currentUser.globalPermissions) : (currentUser?.globalPermissions || []); } catch (e) { }

        const filtered = {};

        for (const [key, cat] of Object.entries(RAW_CATEGORIES)) {
            const allowedChildren = cat.children.filter(child => {
                // Super Admins see everything
                if (isSuperAdmin) return true;

                // 1. STRICT GRANULAR RULE OVERRIDE
                if (Array.isArray(userRule)) {
                    // If the PM explicitly assigned this user a strict list of tabs, enforce it.
                    // This blocks a Level 4 from seeing "billing" if they were only granted "details".
                    return userRule.includes(child.id);
                }

                // 2. DEFAULT HYBRID FALLBACK (User has no strict array rule, rely on global RBAC)
                const hasGlobalLevelAccess = hasClearance(child.minClearance);
                const hasGranularGlobalOverride = userGlobalPerms.includes(child.id);

                return hasGlobalLevelAccess || hasGranularGlobalOverride;
            });

            if (allowedChildren.length > 0) {
                filtered[key] = { ...cat, children: allowedChildren };
            }
        }
        return filtered;
    }, [project, hasClearance, currentUser]);

    const defaultCategory = Object.keys(ALLOWED_CATEGORIES)[0] || "planning";
    const defaultTab = ALLOWED_CATEGORIES[defaultCategory]?.children[0]?.id || "details";
    const [activeTab, setActiveTab] = useState(defaultTab);

    useEffect(() => {
        let found = false;
        for (const cat of Object.values(ALLOWED_CATEGORIES)) {
            if (cat.children.find(c => c.id === activeTab)) found = true;
        }
        if (!found) setActiveTab(defaultTab);
    }, [ALLOWED_CATEGORIES, activeTab, defaultTab]);

    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportOpts, setExportOpts] = useState({
        details: true, boq: true, schedule_and_tasks: true, dailyLogs: true,
        subcontractors: true, inventory_grns: true, procurement_pos: true, financial_billing: true
    });

    const { renderedProjectBoq, totalAmount, projectResourceMap } = useProjectCalculations(projectBoqItems, masterBoqs, resources, project);

    // Compute Resource Tracker state at workspace level for PDF exporting
    const computedResourceTracker = useMemo(() => {
        if (!project || !renderedProjectBoq) return {};
        const tracker = {};
        const masterBoqCodes = new Set((masterBoqs || []).map(b => b.itemCode).filter(Boolean));

        // 1. Daily logs parsing
        let safeDailyLogs = [];
        if (project.dailyLogs) {
            if (typeof project.dailyLogs === 'string') {
                try { safeDailyLogs = JSON.parse(project.dailyLogs); } catch { }
            } else {
                safeDailyLogs = project.dailyLogs;
            }
        }

        const autoActuals = {};
        safeDailyLogs.forEach(log => {
            if (!log.resourceId) return;
            const key = `${log.phase || 'General'}_${log.resourceId}`;
            autoActuals[key] = (autoActuals[key] || 0) + Number(log.qty || 0);
        });

        // 2. Manual actuals & brands
        let manualActuals = {};
        let selectedBrands = {};
        let actualRes = project.actualResources;
        if (typeof actualRes === 'string') {
            try { actualRes = JSON.parse(actualRes); } catch { }
        }
        if (actualRes) {
            Object.entries(actualRes).forEach(([k, v]) => {
                if (k.startsWith('brand_')) {
                    selectedBrands[k.substring(6)] = v;
                } else {
                    manualActuals[k] = v;
                }
            });
        }

        const trackingMode = project.resourceTrackingMode || 'manual';

        renderedProjectBoq.forEach(item => {
            const phase = item.phase || "General";
            if (!tracker[phase]) tracker[phase] = {};

            if (item.masterBoq && item.masterBoq.components) {
                const components = typeof item.masterBoq.components === 'string'
                    ? JSON.parse(item.masterBoq.components)
                    : item.masterBoq.components;

                components.forEach(comp => {
                    if (comp.itemType === 'resource') {
                        const resId = comp.itemId;
                        const resourceData = resources.find(r => r.id === resId);

                        if (resourceData && !masterBoqCodes.has(resourceData.code)) {
                            const totalRequired = Number(comp.qty) * Number(item.computedQty || 0);

                            if (!tracker[phase][resId]) {
                                tracker[phase][resId] = {
                                    code: resourceData.code,
                                    description: resourceData.description,
                                    unit: resourceData.unit,
                                    estimatedQty: 0,
                                    actualQty: trackingMode === 'auto' ? (autoActuals[`${phase}_${resId}`] || 0) : (manualActuals[`${phase}_${resId}`] || 0),
                                    resourceData: resourceData
                                };
                            }
                            tracker[phase][resId].estimatedQty += totalRequired;
                        }
                    }
                });
            }
        });

        // Inject any daily log items
        safeDailyLogs.forEach(log => {
            if (!log.resourceId) return;
            const phase = log.phase || "General";
            const resId = log.resourceId;
            if (!tracker[phase]) tracker[phase] = {};

            if (!tracker[phase][resId]) {
                const resourceData = resources.find(r => r.id === resId);
                if (resourceData && !masterBoqCodes.has(resourceData.code)) {
                    tracker[phase][resId] = {
                        code: resourceData.code,
                        description: resourceData.description,
                        unit: resourceData.unit,
                        estimatedQty: 0,
                        actualQty: trackingMode === 'auto' ? (autoActuals[`${phase}_${resId}`] || 0) : (manualActuals[`${phase}_${resId}`] || 0),
                        resourceData: resourceData
                    };
                }
            }
        });

        return { tracker, selectedBrands };
    }, [project, renderedProjectBoq, resources, masterBoqs]);

    const handleExportResourceTracker = () => {
        const { tracker, selectedBrands } = computedResourceTracker;
        const activeRegionName = project?.region || "";
        exportResourceTrackerPdf(project, tracker, activeRegionName, selectedBrands, getSelectedRate);
    };

    const [formulaHelpOpen, setFormulaHelpOpen] = useState(false);
    const [editorItem, setEditorItem] = useState(null);

    // 🔥 MUTATION ACTIONS
    const updateProject = async (field, value) => {
        const valToSave = (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value;
        await updateProjectMutation.mutateAsync({ id: projectId, data: { [field]: valToSave } });
    };

    const togglePriceLock = async () => {
        if (!hasClearance(4)) return alert("Access Denied: Level 4 Clearance required.");
        const willBeLocked = !(project.isPriceLocked || false);

        if (willBeLocked) {
            const updates = renderedProjectBoq.map(item => updateProjectBoqMutation.mutateAsync({ id: item.id, projectId, data: { lockedRate: item.rate } }));
            await Promise.all(updates);
        } else {
            const updates = renderedProjectBoq.map(item => updateProjectBoqMutation.mutateAsync({ id: item.id, projectId, data: { lockedRate: null } }));
            await Promise.all(updates);
        }
        await updateProject('isPriceLocked', willBeLocked ? 1 : 0);
    };

    const handleExportData = async () => {
        const res = await window.api.db.exportProjectSqlite(project.id, exportOpts);
        if (res.success) { alert("Customized Sync file exported successfully!"); setIsExportOpen(false); }
        else if (!res.canceled) { alert("Export failed: " + res.error); }
    };

    // 🔥 MEMOIZED TAB RENDERING
    const ActiveTabContent = useMemo(() => {
        if (!project) return null;
        return (
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {activeTab === "details" && (<ProjectDetailsTab project={project} updateProject={updateProject} regions={regions} resources={resources} totalAmount={totalAmount} projectBoqItems={renderedProjectBoq} togglePriceLock={togglePriceLock} crmContacts={crmContacts} orgStaff={orgStaff} loadData={loadData} />)}
                {activeTab === "documents" && (<DocumentsTab projectId={projectId} />)}
                {activeTab === "gallery" && (<SiteGalleryTab projectId={projectId} />)}
                {activeTab === "boq" && (<BoqBuilderTab projectId={projectId} openEditDialog={(item) => setEditorItem(item)} setFormulaHelpOpen={setFormulaHelpOpen} />)}
                {activeTab === "mbook" && (<MeasurementBookTab projectId={projectId} setFormulaHelpOpen={setFormulaHelpOpen} />)}
                {activeTab === "schedule" && (<GanttScheduleTab projectId={projectId} />)}
                {activeTab === "subcontractors" && (<SubcontractorBidTab projectId={projectId} />)}
                {activeTab === "daily_log" && (<DailyLogTab projectId={projectId} />)}
                {activeTab === "resources" && (<ResourceTrackerTab project={project} renderedProjectBoq={renderedProjectBoq} projectResourceMap={projectResourceMap} resources={resources} regions={regions} updateProject={updateProject} loadData={loadData} masterBoqs={masterBoqs} />)}
                {activeTab === "procurement" && (<ProcurementTab projectId={projectId} />)}
                {activeTab === "billing" && (<ClientBillingTab projectId={projectId} />)}
                {activeTab === "kanban" && (<KanbanBoardTab projectId={projectId} />)}
                {activeTab === "inventory" && (<InventoryTab projectId={projectId} />)}
                {activeTab === "chat" && (<ChatModule projectId={projectId} orgStaff={orgStaff} loadData={loadData} />)}
                {activeTab === "pdf_estimator" && (<VectorPlanEstimator />)}
            </Box>
        );
    }, [activeTab, project, regions, resources, totalAmount, renderedProjectBoq, projectResourceMap, crmContacts, orgStaff, projectBoqItems, masterBoqs, editorItem, formulaHelpOpen, exportOpts, projectId]);

    if (isProjectLoading) {
        return (
            <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
                {/* Skeleton Sidebar */}
                <Paper elevation={0} sx={{ width: SIDEBAR_OPEN_WIDTH, flexShrink: 0, bgcolor: 'rgba(13, 31, 60, 0.5)', borderRight: '1px solid', borderColor: 'divider', display: { xs: 'none', md: 'flex' }, flexDirection: 'column' }}>
                    <Box sx={{ p: 1, height: 60, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                         <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mr: 1 }} />
                    </Box>
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {[1,2,3,4,5,6].map(i => (
                            <Skeleton key={i} variant="rounded" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5 }} />
                        ))}
                    </Box>
                </Paper>
                
                {/* Skeleton Main Content */}
                <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" pb={2} borderBottom="1px solid" borderColor="divider">
                        <Box>
                            <Skeleton variant="text" width={200} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                            <Skeleton variant="text" width={120} height={20} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }} />
                        </Box>
                    </Box>
                    
                    {/* Top KPI Cards Skeleton */}
                    <Grid container spacing={2}>
                        {[1,2,3,4,5,6].map(i => (
                            <Grid item xs={6} md={4} lg={2} key={i}>
                                <Skeleton variant="rounded" height={90} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                            </Grid>
                        ))}
                    </Grid>
                    
                    {/* Schedule Tracker Skeleton */}
                    <Skeleton variant="rounded" height={150} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                    
                    {/* Details Skeleton */}
                    <Skeleton variant="rounded" height={300} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                </Box>
            </Box>
        );
    }
    if (projectError || project === null) return <Box p={5} textAlign="center"><Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'error.main', mb: 2 }}>Error: Project Not Found</Typography><Button variant="outlined" onClick={onBack}>Return to Dashboard</Button></Box>;

    // 🔥 ZERO-TAB GATEKEEPER: If no modules are allowed, show nothing but a lock screen.
    if (Object.keys(ALLOWED_CATEGORIES).length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" gap={2} sx={{ p: 5, textAlign: 'center' }}>
                <LockIcon sx={{ fontSize: 60, color: 'error.main', opacity: 0.8 }} />
                <Typography variant="h5" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontWeight: 'bold' }}>
                    WORKSPACE_RESTRICTED
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                    All modules within this project have been explicitly revoked for your account. Please contact the Project Lead if you need access.
                </Typography>
                <Button variant="outlined" onClick={onBack} sx={{ mt: 3, fontFamily: "'JetBrains Mono', monospace", borderRadius: 50 }}>
                    RETURN_TO_HOME
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            <Paper elevation={0} sx={{ width: sidebarOpen ? SIDEBAR_OPEN_WIDTH : { xs: 0, md: SIDEBAR_CLOSED_WIDTH }, flexShrink: 0, bgcolor: 'rgba(13, 31, 60, 0.5)', borderRight: '1px solid', borderColor: 'divider', transition: 'width 0.225s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'hidden', display: 'flex', flexDirection: 'column', position: { xs: 'fixed', md: 'relative' }, height: '100%', zIndex: { xs: 1100, md: 1 }, left: 0, top: 0, transform: 'translateZ(0)' }}>
                <Box sx={{ p: 1, display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center', alignItems: 'center', height: 60 }}>
                    <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
                    </IconButton>
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                    <List sx={{ px: 1 }}>
                        {Object.entries(ALLOWED_CATEGORIES).map(([catKey, cat]) => (
                            <React.Fragment key={cat.id}>
                                {sidebarOpen ? (
                                    <Typography variant="caption" sx={{ px: 2, pt: 2, pb: 1, display: 'block', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: cat.color, letterSpacing: '1px', opacity: 0.8 }}>
                                        {cat.label}
                                    </Typography>
                                ) : (
                                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
                                )}

                                {cat.children.map(child => (
                                    <Tooltip key={child.id} title={!sidebarOpen ? child.label : ""} placement="right" disableInteractive>
                                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                                            <ListItemButton
                                                onClick={() => { setActiveTab(child.id); if (window.innerWidth < 900) setSidebarOpen(false); }}
                                                selected={activeTab === child.id}
                                                sx={{
                                                    borderRadius: 1.5, minHeight: 40, justifyContent: sidebarOpen ? 'initial' : 'center', px: 2.5,
                                                    '&.Mui-selected': { bgcolor: `rgba(${parseInt(cat.color.slice(1, 3), 16)}, ${parseInt(cat.color.slice(3, 5), 16)}, ${parseInt(cat.color.slice(5, 7), 16)}, 0.15)` },
                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                                }}
                                            >
                                                <ListItemIcon sx={{ minWidth: 0, mr: sidebarOpen ? 2 : 'auto', justifyContent: 'center', color: activeTab === child.id ? cat.color : 'text.secondary' }}>
                                                    {child.icon}
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={child.label}
                                                    sx={{ opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.2s ease-in-out', m: 0 }}
                                                    primaryTypographyProps={{ sx: { fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: activeTab === child.id ? 'bold' : 'normal', color: activeTab === child.id ? cat.color : 'text.primary', whiteSpace: 'nowrap' } }}
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    </Tooltip>
                                ))}
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
            </Paper>

            {sidebarOpen && <Box onClick={() => setSidebarOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />}

            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, md: 3 }, transform: 'translateZ(0)' }}>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider', gap: { xs: 2, lg: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => setSidebarOpen(true)} sx={{ display: { xs: 'block', md: 'none' }, color: 'text.secondary' }}>
                            <MenuIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '16px', md: '20px' }, display: 'flex', alignItems: 'center', gap: 1 }}>
                                {project?.name?.toUpperCase() || "UNTITLED"}
                                {Boolean(project.isPriceLocked) && (<Chip icon={<LockIcon sx={{ fontSize: 10 }} />} label="LOCKED" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" }} />)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{project?.code || 'NO_CODE'} | {project?.region || 'NO_REGION'}</Typography>
                        </Box>
                    </Box>

                    {activeTab === "resources" && (
                        <Box display="flex" gap={1.5} flexWrap="wrap" justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                            <Button variant="outlined" color="error" startIcon={<PictureAsPdfIcon />} onClick={() => exportProjectPdf(project, renderedProjectBoq, totalAmount)} sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', height: '32px' }}>
                                PROJECT ESTIMATE
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<PictureAsPdfIcon />} onClick={handleExportResourceTracker} sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', height: '32px' }}>
                                RESOURCE TRACKER
                            </Button>
                            <Button variant="contained" color="success" startIcon={<DownloadIcon />} onClick={() => exportProjectExcel(project, renderedProjectBoq, masterBoqs, resources)} disableElevation sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', height: '32px' }}>
                                EXCEL
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* 🔥 MEMOIZED TAB RENDERING */}
                {ActiveTabContent}

            </Box>

            {/* MODALS */}
            <MasterBoqEditor editorItem={editorItem} onClose={() => setEditorItem(null)} onSaveSuccess={() => { setEditorItem(null); loadData(); }} project={project} regions={regions} resources={resources} masterBoqs={masterBoqs} setFormulaHelpOpen={setFormulaHelpOpen} />

            <Dialog open={isExportOpen} onClose={() => setIsExportOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>EXPORT_CONFIG</DialogTitle>
                <DialogContent dividers sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Box display="flex" flexDirection="column" gap={1}>
                        {Object.keys(exportOpts).map(key => (
                            <FormControlLabel key={key} control={<Checkbox checked={exportOpts[key]} onChange={(e) => setExportOpts({ ...exportOpts, [key]: e.target.checked })} size="small" />} label={<Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>{key.toUpperCase()}</Typography>} />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                    <Button onClick={() => setIsExportOpen(false)} color="inherit">CANCEL</Button>
                    <Button variant="contained" color="primary" onClick={handleExportData}>GENERATE SYNC</Button>
                </DialogActions>
            </Dialog>

            <FormulaGuideDialog open={formulaHelpOpen} onClose={() => setFormulaHelpOpen(false)} />
        </Box>
    );
}