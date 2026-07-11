import React, { useState, useMemo } from "react";
import {
    Box, Typography, Paper, IconButton, Tooltip,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, Skeleton, Grid
} from "@mui/material";

import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import LocalAtmOutlinedIcon from '@mui/icons-material/LocalAtmOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import SettingsBackupRestoreOutlinedIcon from '@mui/icons-material/SettingsBackupRestoreOutlined';

import ResourcesTab from "./database/ResourcesTab";
import CreateBoqTab from "./database/CreateBoqTab";
import ViewBoqTab from "./database/ViewBoqTab";
import BackupRestoreTab from "./database/BackupRestoreTab";
import ConfirmDeleteModal from "./database/ConfirmDeleteModal"; // Ensure this path is correct

import { useAuth } from "../context/AuthContext";
import { useQueryClient } from '@tanstack/react-query';
import { useRegions, useResources, useMasterBoqs, useDeleteMasterBoq } from '../hooks/useQueries';

export default function DatabaseEditor() {
    const { hasClearance, currentUser } = useAuth();
    const queryClient = useQueryClient();

    // UI States
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editingBoq, setEditingBoq] = useState(null);
    
    // 🔥 DELETE MODAL STATE
    const [deleteModal, setDeleteModal] = useState({ 
        open: false, 
        id: null, 
        label: "" 
    });

    const SIDEBAR_CLOSED_WIDTH = 68;
    const SIDEBAR_OPEN_WIDTH = 260;

    // 🔥 AUTOMATIC DATA FETCHING
    const { data: regions = [], isLoading: loadingRegions } = useRegions();
    const { data: rawResources = [], isLoading: loadingResources } = useResources();
    const { data: rawMasterBoqs = [], isLoading: loadingBoqs } = useMasterBoqs();
    
    const isLoading = loadingRegions || loadingResources || loadingBoqs;
    const deleteMasterBoqMutation = useDeleteMasterBoq();

    // 🔥 SAFE PARSING VIA USEMEMO
    const resources = useMemo(() => {
        const parseSafe = (str, fallback = []) => {
            if (!str) return fallback;
            if (typeof str !== 'string') return str;
            try { return JSON.parse(str); } catch { return fallback; }
        };
        return rawResources.map(r => ({ ...r, rates: parseSafe(r.rates, {}), rateHistory: parseSafe(r.rateHistory, []) }));
    }, [rawResources]);

    const masterBoqs = useMemo(() => {
        const parseSafe = (str, fallback = []) => {
            if (!str) return fallback;
            if (typeof str !== 'string') return str;
            try { return JSON.parse(str); } catch { return fallback; }
        };
        return rawMasterBoqs.map(b => ({ ...b, components: parseSafe(b.components, []) }));
    }, [rawMasterBoqs]);

    // 🔥 REFRESH CACHE
    const loadData = () => {
        queryClient.invalidateQueries({ queryKey: ['regions'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        queryClient.invalidateQueries({ queryKey: ['masterBoqs'] });
    };

    const userPerms = useMemo(() => {
        try {
            return typeof currentUser?.globalPermissions === 'string'
                ? JSON.parse(currentUser.globalPermissions)
                : (currentUser?.globalPermissions || []);
        } catch (e) { return []; }
    }, [currentUser]);

    const canAccess = (minClearance, id) => hasClearance(minClearance) || userPerms.includes(id);

    // 🔥 MODAL HANDLERS
    const openDeleteConfirmation = (id, label) => {
        if (!canAccess(3, 'viewBoq')) return alert("Access Denied: Clearance required.");
        setDeleteModal({ open: true, id, label });
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteMasterBoqMutation.mutateAsync(deleteModal.id);
        } catch (error) {
            console.error("Delete failed:", error);
        } finally {
            setDeleteModal({ open: false, id: null, label: "" });
        }
    };

    const handleEditBoq = (boq) => {
        if (!canAccess(3, 'createBoq')) return alert("Access Denied: Clearance required.");
        setEditingBoq(boq);
        setTab("createBoq");
    };

    const clearEdit = () => {
        setEditingBoq(null);
        setTab("viewBoq");
    };

    const PERMITTED_NAV_ITEMS = useMemo(() => {
        const items = [
            { id: "resources", label: "LOCAL MARKET RATES", minClearance: 2, icon: <LocalAtmOutlinedIcon />, color: '#10b981' },
            { id: "viewBoq", label: "MASTER DATABOOK", minClearance: 2, icon: <MenuBookOutlinedIcon />, color: '#3b82f6' },
            { id: "createBoq", label: editingBoq ? "EDIT DATABOOK ITEM" : "DATABOOK BUILDER", minClearance: 3, icon: <BuildOutlinedIcon />, color: '#f59e0b' },
            { id: "backup", label: "BACKUP & RESTORE", minClearance: 5, icon: <SettingsBackupRestoreOutlinedIcon />, color: '#ef4444' }
        ];
        return items.filter(item => canAccess(item.minClearance, item.id));
    }, [editingBoq, currentUser, userPerms]);

    const [tab, setTab] = useState(PERMITTED_NAV_ITEMS[0]?.id || "resources");

    const handleTabChange = (newTab) => {
        if (newTab !== 'createBoq' && editingBoq) setEditingBoq(null);
        setTab(newTab);
        if (window.innerWidth < 900) setSidebarOpen(false);
    };

    if (PERMITTED_NAV_ITEMS.length === 0) {
        return <Box p={5} textAlign="center"><Typography sx={{ color: 'error.main', fontFamily: "'JetBrains Mono', monospace" }}>ACCESS_DENIED: No modules permitted.</Typography></Box>;
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* SIDEBAR */}
            <Paper elevation={0} sx={{ width: sidebarOpen ? SIDEBAR_OPEN_WIDTH : { xs: 0, md: SIDEBAR_CLOSED_WIDTH }, flexShrink: 0, bgcolor: 'rgba(13, 31, 60, 0.5)', borderRight: '1px solid', borderColor: 'divider', transition: 'width 0.225s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'hidden', display: 'flex', flexDirection: 'column', position: { xs: 'fixed', md: 'relative' }, height: '100%', zIndex: { xs: 1100, md: 1 }, left: 0, top: 0 }}>
                <Box sx={{ p: 1, display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center', alignItems: 'center', height: 60 }}>
                    <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
                    </IconButton>
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                    <List sx={{ px: 1 }}>
                        <Typography variant="caption" sx={{ px: sidebarOpen ? 2 : 0, pt: 1, pb: 1, display: 'block', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: 'text.secondary', letterSpacing: '1px', textAlign: sidebarOpen ? 'left' : 'center', opacity: sidebarOpen ? 0.6 : 0, transition: 'opacity 0.2s' }}>
                            {sidebarOpen ? "DATABASE CONFIG" : ""}
                        </Typography>

                        {PERMITTED_NAV_ITEMS.map((item) => {
                            const isSelected = tab === item.id;
                            return (
                                <Tooltip key={item.id} title={!sidebarOpen ? item.label : ""} placement="right" disableInteractive>
                                    <ListItem disablePadding sx={{ mb: 0.5 }}>
                                        <ListItemButton onClick={() => handleTabChange(item.id)} selected={isSelected} sx={{ borderRadius: 1.5, minHeight: 40, justifyContent: sidebarOpen ? 'initial' : 'center', px: 2.5, '&.Mui-selected': { bgcolor: `rgba(${parseInt(item.color.slice(1, 3), 16)}, ${parseInt(item.color.slice(3, 5), 16)}, ${parseInt(item.color.slice(5, 7), 16)}, 0.15)` }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                            <ListItemIcon sx={{ minWidth: 0, mr: sidebarOpen ? 2 : 'auto', justifyContent: 'center', color: isSelected ? item.color : 'text.secondary' }}>{item.icon}</ListItemIcon>
                                            <ListItemText primary={item.label} sx={{ opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.2s ease-in-out', m: 0 }} primaryTypographyProps={{ sx: { fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? item.color : 'text.primary', whiteSpace: 'nowrap' } }} />
                                        </ListItemButton>
                                    </ListItem>
                                </Tooltip>
                            );
                        })}
                    </List>
                </Box>
            </Paper>

            {/* MOBILE OVERLAY */}
            {sidebarOpen && <Box onClick={() => setSidebarOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />}

            {/* MAIN CONTENT AREA */}
            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, md: 3 } }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider', gap: { xs: 2, lg: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => setSidebarOpen(true)} sx={{ display: { xs: 'block', md: 'none' }, color: 'text.secondary' }}>
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '18px', md: '22px' } }}>
                            DATABASE_MANAGER
                        </Typography>
                    </Box>
                </Box>

                {isLoading ? (
                    <Box sx={{ flexGrow: 1 }}>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                <Skeleton variant="rounded" height={120} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Skeleton variant="rounded" height={120} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                            </Grid>
                        </Grid>
                        <Skeleton variant="rounded" height={160} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, mb: 3 }} />
                        <Skeleton variant="rounded" height={400} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                    </Box>
                ) : (
                    <Box sx={{ flexGrow: 1 }}>
                        {tab === "resources" && canAccess(2, 'resources') && <ResourcesTab regions={regions} resources={resources} masterBoqs={masterBoqs} loadData={loadData} />}
                        
                        {tab === "viewBoq" && canAccess(2, 'viewBoq') && (
                            <ViewBoqTab 
                                masterBoqs={masterBoqs} 
                                regions={regions} 
                                resources={resources} 
                                onEditBoq={handleEditBoq} 
                                deleteMasterBoq={openDeleteConfirmation} // Trigger Modal instead of Alert
                                loadData={loadData} 
                            />
                        )}

                        {tab === "createBoq" && canAccess(3, 'createBoq') && <CreateBoqTab regions={regions} resources={resources} masterBoqs={masterBoqs} loadData={loadData} editingBoq={editingBoq} clearEdit={clearEdit} />}
                        
                        {tab === "backup" && canAccess(5, 'backup') && <BackupRestoreTab loadData={loadData} />}
                    </Box>
                )}
            </Box>

            {/* 🔥 REUSABLE DELETE MODAL */}
            <ConfirmDeleteModal 
                open={deleteModal.open}
                itemName={deleteModal.label}
                onClose={() => setDeleteModal({ open: false, id: null, label: "" })}
                onConfirm={handleConfirmDelete}
            />
        </Box>
    );
}