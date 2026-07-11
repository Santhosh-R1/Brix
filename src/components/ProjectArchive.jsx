import React, { useState, useEffect, useMemo } from "react";
import {
    Box, Typography, Paper, Grid, IconButton, TextField, InputAdornment,
    Chip, Button, Pagination, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Skeleton
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import AddIcon from '@mui/icons-material/Add';
import { getProjectArchiveStyles } from "./ProjectArchive.styles";

import { useAuth } from "../context/AuthContext";
import ConfirmDeleteProjectModal from "./ConfirmDeleteProjectModal";

export default function ProjectArchive({ onOpenProject }) {
    const { currentUser, hasClearance } = useAuth();
    const theme = useTheme();
    const styles = getProjectArchiveStyles(theme);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 6;

    const [importData, setImportData] = useState(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "", code: "" });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const projData = await window.api.db.getProjects();
            setProjects((projData || []).sort((a, b) => b.createdAt - a.createdAt));
        } catch (err) {
            console.error("Failed to load projects:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCreateProject = async () => {
        const newProject = {
            name: "New Project",
            code: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
            clientName: "",
            region: "",
            status: "Draft",
            assignedStaff: JSON.stringify([currentUser?.id]),
            createdAt: Date.now()
        };

        try {
            const res = await window.api.db.addProject(newProject);
            if (res && res.success !== false) {
                loadData();
            } else {
                alert("Failed to create project: " + (res?.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Database Bridge Error:", err);
            alert("Error creating project.");
        }
    };

    const visibleProjects = useMemo(() => {
        if (hasClearance(4)) return projects;
        return projects.filter(p => {
            try {
                const parsed = JSON.parse(p.assignedStaff || '[]');
                // 🔥 Safely handle both Array (legacy) and Object (new) formats
                if (Array.isArray(parsed)) return parsed.includes(currentUser?.id);
                return parsed.hasOwnProperty(currentUser?.id);
            }
            catch (e) { return false; }
        });
    }, [projects, currentUser, hasClearance]);
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return visibleProjects;
        const query = searchQuery.toLowerCase();
        return visibleProjects.filter(p =>
            (p.name?.toLowerCase().includes(query)) || (p.code?.toLowerCase().includes(query))
        );
    }, [visibleProjects, searchQuery]);

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = filteredProjects.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    const triggerDelete = (id, name, code, e) => {
        e.stopPropagation();
        setDeleteModal({ open: true, id, name, code });
    };

    const confirmDelete = async () => {
        if (deleteModal.id) {
            await window.api.db.deleteProject(deleteModal.id);
            loadData();
        }
        setDeleteModal({ open: false, id: null, name: "", code: "" });
    };

    const handleExport = async () => {
        const res = await window.api.db.exportAllProjectsSqlite();
        if (res.success) alert("Archive exported successfully.");
    };

    const handleFileSelect = async () => {
        const res = await window.api.db.selectArchiveFile();
        if (res.success) {
            setImportData({ projects: res.projects, filePath: res.filePath });
            setImportDialogOpen(true);
        }
    };

    const processImport = async (mode) => {
        const res = await window.api.db.importProjectsSqlite(importData.filePath, mode);
        if (res.success) {
            alert(`Import completed (${mode}).`);
            loadData();
            setImportDialogOpen(false);
        }
    };

    return (
        <Box sx={styles.mainBox}>
            {/* 🔥 FIXED: Removed the maxWidth constraint here so it flexes to 100% width */}
            <Box sx={styles.contentBox}>

                {/* HEADER */}
                <Box sx={styles.headerBox}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <FolderSpecialIcon color="primary" sx={{ fontSize: 32 }} />
                        <Typography variant="h4" fontWeight="bold" sx={styles.headerTitle}>PROJECT_ARCHIVE</Typography>
                    </Box>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<AddIcon />}
                        onClick={handleCreateProject}
                        sx={styles.createBtn}
                    >
                        Create Project
                    </Button>
                </Box>

                {/* SEARCH */}
                <TextField
                    fullWidth
                    placeholder="Search by project name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={styles.searchField}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                        sx: styles.searchInputProps
                    }}
                />

                {isLoading ? (
                    <Grid container spacing={3}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Grid item xs={12} sm={6} lg={4} xl={3} key={i}>
                                <Paper sx={styles.projectPaper}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box width="70%">
                                            <Skeleton variant="text" width="90%" height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                            <Skeleton variant="text" width="40%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mt: 0.5 }} />
                                        </Box>
                                        <Skeleton variant="rectangular" width={40} height={18} sx={{ borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)' }} />
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                        <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                                        <Skeleton variant="rectangular" width={140} height={28} sx={{ borderRadius: 50, bgcolor: 'rgba(255,255,255,0.08)' }} />
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Grid container spacing={3}>
                        {paginatedProjects.map(p => (
                            <Grid item xs={12} sm={6} lg={4} xl={3} key={p.id}> {/* 🔥 Added xl={3} to take advantage of wider screens */}
                                <Paper sx={styles.projectPaper}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography variant="h6" sx={styles.projectTitle}>{p.name}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={styles.projectCode}>{p.code || "NO_CODE"}</Typography>
                                        </Box>
                                        <Chip label={p.status || 'Draft'} size="small" variant="outlined" sx={styles.projectChip} />
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                        {hasClearance(4) ? (
                                            <IconButton color="error" onClick={(e) => triggerDelete(p.id, p.name, p.code, e)} size="small"><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                                        ) : <Box />}
                                        <Button variant="contained" disableElevation onClick={() => onOpenProject(p.id)} endIcon={<ArrowForwardIosIcon sx={{ fontSize: 10 }} />} sx={styles.accessBtn}>ACCESS_WORKSPACE</Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {totalPages > 1 && (
                    <Box sx={styles.paginationBox}>
                        <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
                    </Box>
                )}
            </Box>

            <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} PaperProps={{ sx: styles.dialogPaper }}>
                <DialogTitle sx={styles.dialogTitle}>DATABASE IMPORT RESOLUTION</DialogTitle>
                <DialogContent>
                    <Typography sx={styles.dialogSubtitle}>How would you like to process the imported projects?</Typography>
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Button variant="outlined" color="info" onClick={() => processImport('append')}>[APPEND] Add as new</Button>
                        <Button variant="outlined" color="warning" onClick={() => processImport('merge')}>[MERGE] Update existing</Button>
                        <Button variant="outlined" color="error" onClick={() => processImport('replace')}>[REPLACE] Overwrite all</Button>
                    </Box>
                </DialogContent>
                <DialogActions><Button onClick={() => setImportDialogOpen(false)} color="inherit">CANCEL</Button></DialogActions>
            </Dialog>

            <ConfirmDeleteProjectModal 
                open={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: "", code: "" })}
                onConfirm={confirmDelete}
                projectName={deleteModal.name}
                projectCode={deleteModal.code}
            />
        </Box>
    );
}