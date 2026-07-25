import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Typography, Paper, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, TextField, MenuItem, Chip,
    Accordion, AccordionSummary, AccordionDetails, Dialog, DialogTitle, DialogContent,
    DialogActions, Autocomplete, Grid, RadioGroup, FormControlLabel, Radio
} from '@mui/material';

// Icons
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LaunchIcon from '@mui/icons-material/Launch';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import SyncIcon from '@mui/icons-material/Sync';
import FindInPageIcon from '@mui/icons-material/FindInPage';

import { useProject } from '../../hooks/useQueries';

export default function DocumentsTab({ projectId }) {
    const { data: rawProject } = useProject(projectId);
    const project = rawProject || {};

    const [docs, setDocs] = useState([]);
    const [name, setName] = useState("");

    // Settings & Rules State
    const [templateFolders, setTemplateFolders] = useState(["01_Drawings", "02_Contracts", "03_Site_Photos"]);
    const [ignoredExtensions, setIgnoredExtensions] = useState([".bak", ".skb", ".tmp", ".log"]);
    const [category, setCategory] = useState("01_Drawings");

    // Version History Modal State
    const [historyOpen, setHistoryOpen] = useState(false);
    const [selectedDocGroup, setSelectedDocGroup] = useState([]);

    // Unified Upload State
    const fileInputRef = useRef(null);
    const [uploadContext, setUploadContext] = useState({ name: null, category: null });

    // 🔥 PHASE 3: RECONCILIATION STATE
    const [syncModalOpen, setSyncModalOpen] = useState(false);
    const [untrackedFiles, setUntrackedFiles] = useState([]);
    const [syncSelections, setSyncSelections] = useState({});
    const [isScanning, setIsScanning] = useState(false);

    const loadDocs = async () => {
        const data = await window.api.db.getProjectDocuments(projectId);
        setDocs(data || []);
    };

    useEffect(() => {
        loadDocs();

        const fetchFolders = async () => {
            // 1. Try to get the ACTUAL directories from the host server
            if (project?.isScaffolded && project?.scaffoldPath) {
                try {
                    const res = await window.api.os.listDirectories(project.scaffoldPath);
                    // Remember: webBridge unwraps the data, so res IS the array
                    if (Array.isArray(res) && res.length > 0) {
                        setTemplateFolders(res);
                        setCategory(res[0]); // Default to first folder found

                        // We also need the ignored extensions for the scanner
                        const settingsRes = await window.api.db.getSettings('company_info');
                        if (settingsRes && Array.isArray(settingsRes.ignoredExtensions)) {
                            setIgnoredExtensions(settingsRes.ignoredExtensions);
                        }
                        return; // Exit early!
                    }
                } catch (err) { console.error("Failed to read live directories:", err); }
            }

            // 2. FALLBACK: If not scaffolded, load the Company Settings template
            const res = await window.api.db.getSettings('company_info');
            if (res && res.data) {
                if (Array.isArray(res.data.templateFolders)) {
                    setTemplateFolders(res.data.templateFolders);
                    setCategory(res.data.templateFolders[0]);
                }
                if (Array.isArray(res.data.ignoredExtensions)) {
                    setIgnoredExtensions(res.data.ignoredExtensions);
                }
            }
        };

        fetchFolders();
    }, [projectId, project?.scaffoldPath]);
    const categorizedDocs = useMemo(() => {
        const groups = {};
        docs.forEach(doc => {
            if (!groups[doc.category]) groups[doc.category] = {};
            const nameKey = (doc.name || "Untitled").trim().toLowerCase();
            if (!groups[doc.category][nameKey]) groups[doc.category][nameKey] = [];
            groups[doc.category][nameKey].push(doc);
        });

        Object.keys(groups).forEach(cat => {
            Object.keys(groups[cat]).forEach(nameKey => {
                groups[cat][nameKey].sort((a, b) => b.addedAt - a.addedAt);
            });
        });
        return groups;
    }, [docs]);

    // Unique document names for the Revision Dropdown
    const uniqueDocNames = useMemo(() => {
        return [...new Set(docs.map(d => d.name))].sort();
    }, [docs]);

    const triggerFileSelect = (explicitName = null, explicitCategory = null) => {
        setUploadContext({ name: explicitName, category: explicitCategory });
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const extension = file.name.split('.').pop().toLowerCase();
        const finalCategory = uploadContext.category || category || "Uncategorized";

        // 🔥 USE THE NEW SECURE SANDBOXED UPLOAD
        // We no longer need to calculate target folders; Rust handles isolation safely.
        const res = await window.api.os.uploadProjectDocument(projectId, file);

        if (typeof res === 'string') {
            const finalName = uploadContext.name || name || file.name.replace(/\.[^/.]+$/, "");

            await window.api.db.saveProjectDocument({
                id: crypto.randomUUID(),
                projectId,
                name: finalName,
                category: finalCategory,
                filePath: res, // This is the safe path returned by Rust
                fileType: extension,
                addedAt: Date.now()
            });
            setName("");
            loadDocs();
        } else {
            alert("File upload failed: " + (res?.error || "Unknown error"));
        }
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleOpenFile = async (path) => {
        const result = await window.api.os.openFile(path);
        if (typeof result === 'object' && result.success === false) {
            alert("Could not open file. It may have been moved or deleted from the host system.");
        }
    };
    const handleDownloadFile = (path, fileName) => {
        const token = localStorage.getItem('openprix_token'); // Get the token
        const baseUrl = window.api.os.getServerUrl ? window.api.os.getServerUrl() : '';

        // Append token to the URL
        const downloadUrl = `${baseUrl}/api/os/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token || '')}`;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    const handleDeleteDoc = async (id, isGroupDelete = false) => {
        const msg = isGroupDelete
            ? "CRITICAL: Delete THIS ENTIRE DOCUMENT GROUP and all its versions from the tracker? (The file remains on the host server)"
            : "Remove this specific version? (The file remains on the host server)";

        if (window.confirm(msg)) {
            await window.api.db.deleteProjectDocument(id);
            loadDocs();
            if (historyOpen) setHistoryOpen(false);
        }
    };

    // THE SMART RECONCILIATION ENGINE
    const handleSyncServer = async () => {
        if (!project?.isScaffolded || !project?.scaffoldPath) {
            return alert("This project is not linked to a host server directory. Scaffold it in Project Details first.");
        }

        setIsScanning(true);
        try {
            const res = await window.api.os.scanDirectory(project.scaffoldPath, ignoredExtensions);

            if (Array.isArray(res)) {
                const serverFiles = res;
                const dbFileMap = {};

                // 🔥 BULLETPROOF PATH NORMALIZER
                // Converts backslashes to forward slashes, removes double slashes, and forces lowercase
                const normalizePath = (p) => p ? p.replace(/\\/g, '/').replace(/\/+/g, '/').toLowerCase() : "";

                // Map out what the DB currently tracks
                docs.forEach(d => {
                    const normPath = normalizePath(d.filePath);
                    // Keep the absolute latest version record for timestamp comparison
                    if (!dbFileMap[normPath] || d.addedAt > dbFileMap[normPath].addedAt) {
                        dbFileMap[normPath] = d;
                    }
                });

                const untracked = [];
                const initialSelections = {};

                serverFiles.forEach(f => {
                    const normPath = normalizePath(f.path);
                    const dbRecord = dbFileMap[normPath];

                    if (!dbRecord) {
                        // 1. BRAND NEW FILE
                        untracked.push({ ...f, syncReason: 'New File Found' });
                        initialSelections[f.path] = {
                            action: 'new',
                            category: templateFolders[0] || "Uncategorized",
                            parentName: uniqueDocNames.length > 0 ? uniqueDocNames[0] : ''
                        };
                    } else {
                        // 2. EDITED FILE (Server file is > 60 seconds newer than DB record)
                        // This catches files you directly overwrite in AutoCAD/SketchUp!
                        if (f.modified > dbRecord.addedAt + 60000) {
                            untracked.push({ ...f, syncReason: 'Modified on Disk (Revision)' });
                            initialSelections[f.path] = {
                                action: 'revision',
                                category: dbRecord.category,
                                parentName: dbRecord.name
                            };
                        }
                    }
                });

                if (untracked.length === 0) {
                    alert("System is perfectly synced! No new or modified files found on the host server.");
                } else {
                    setSyncSelections(initialSelections);
                    setUntrackedFiles(untracked);
                    setSyncModalOpen(true);
                }
            } else {
                alert("Scan failed: " + (res?.error || "Host directory could not be read."));
            }
        } catch (err) { alert("Scan error: " + err.message); }
        setIsScanning(false);
    };

    const handleUpdateSyncSelection = (filePath, field, value) => {
        setSyncSelections(prev => ({ ...prev, [filePath]: { ...prev[filePath], [field]: value } }));
    };

    const commitSync = async () => {
        const imports = [];

        for (const file of untrackedFiles) {
            const sel = syncSelections[file.path];
            if (sel.action === 'skip') continue;

            let docName = file.name.replace(/\.[^/.]+$/, "");
            let docCategory = sel.category;

            // Log as a Revision (Includes files someone directly overwrote via AutoCAD)
            if (sel.action === 'revision' && sel.parentName) {
                docName = sel.parentName;
                const parentDoc = docs.find(d => d.name === sel.parentName);
                if (parentDoc) docCategory = parentDoc.category;
            }

            imports.push(window.api.db.saveProjectDocument({
                id: crypto.randomUUID(),
                projectId,
                name: docName,
                category: docCategory,
                filePath: file.path.replace(/\\/g, '/'), // Standardize slashes in DB
                fileType: file.extension.replace('.', ''),
                addedAt: file.modified || Date.now() // Uses the exact OS modification time!
            }));
        }

        await Promise.all(imports);
        setSyncModalOpen(false);
        loadDocs();
    };

    const getIcon = (type) => {
        if (['pdf'].includes(type)) return <PictureAsPdfIcon color="error" />;
        if (['jpg', 'png', 'jpeg', 'webp'].includes(type)) return <ImageIcon color="info" />;
        if (['dwg', 'dxf'].includes(type)) return <ArchitectureIcon color="warning" />;
        return <DescriptionIcon />;
    };

    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            {/* TOP ACTION BAR */}
            <Box display="flex" justifyContent="flex-end">
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={isScanning ? <FindInPageIcon sx={{ animation: 'spin 2s linear infinite' }} /> : <SyncIcon />}
                    onClick={handleSyncServer}
                    disabled={isScanning || !project?.isScaffolded}
                    sx={{ fontFamily: "'JetBrains Mono', monospace", borderRadius: 50, px: 3, '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }}
                >
                    {isScanning ? "SCANNING HOST SERVER..." : "SYNC FOLDERS WITH SERVER"}
                </Button>
            </Box>

            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={2} sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.main' }}>
                    // INITIALIZE_NEW_DOCUMENT_GROUP
                </Typography>
                <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
                    <TextField fullWidth size="small" label="DOCUMENT MASTER NAME" value={name} onChange={e => setName(e.target.value)} helperText="Leave blank to use the file's original name." />

                    <Autocomplete
                        freeSolo options={templateFolders} value={category}
                        onChange={(e, newVal) => setCategory(newVal || "Uncategorized")}
                        onInputChange={(e, newVal) => setCategory(newVal || "Uncategorized")}
                        sx={{ minWidth: { md: 220 }, maxWidth: { md: 300 } }}
                        renderInput={(params) => <TextField {...params} size="small" label={project?.isScaffolded ? "TARGET DIRECTORY" : "CATEGORY"} helperText={project?.isScaffolded ? "Will save to this host folder." : "Standard tagging."} />}
                    />

                    <Button variant="contained" startIcon={<FolderOpenIcon />} onClick={() => triggerFileSelect()} sx={{ borderRadius: 2, fontWeight: 'bold', height: 40, minWidth: { md: 220 }, whiteSpace: 'nowrap', mt: { xs: 1, md: 0 } }}>
                        SELECT & INITIALIZE
                    </Button>
                </Box>
            </Paper>

            <Box>
                {Object.keys(categorizedDocs).length === 0 ? (
                    <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: { xs: '12px', sm: '14px' } }}>NO DOCUMENTS ARCHIVED IN THIS WORKSPACE</Typography>
                    </Paper>
                ) : (
                    Object.entries(categorizedDocs).sort().map(([catName, docGroups]) => (
                        <Accordion key={catName} defaultExpanded disableGutters sx={{ mb: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.4)', '&:before': { display: 'none' } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    {catName.toUpperCase()}
                                    <Chip label={`${Object.keys(docGroups).length} Docs`} size="small" color="primary" sx={{ height: 20, fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }} />
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <TableContainer sx={{ overflowX: 'auto' }}>
                                    <Table size="small" sx={{ minWidth: 600 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: 50 }}>TYPE</TableCell>
                                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>DOCUMENT_NAME</TableCell>
                                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: 100 }}>VERSION</TableCell>
                                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: 150 }}>LAST_UPDATED</TableCell>
                                                <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: 220 }}>ACTIONS</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.entries(docGroups).map(([nameKey, versions]) => {
                                                const latestDoc = versions[0];
                                                const versionCount = versions.length;

                                                return (
                                                    <TableRow key={nameKey} hover sx={{ '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.05)' } }}>
                                                        <TableCell>{getIcon(latestDoc.fileType)}</TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="bold">{latestDoc.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: { xs: 200, sm: 350 }, display: 'block', fontSize: '10px' }}>{latestDoc.filePath}</Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip label={`v${versionCount}.0`} size="small" color={versionCount > 1 ? "success" : "default"} variant={versionCount > 1 ? "filled" : "outlined"} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 'bold' }} />
                                                        </TableCell>
                                                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary', whiteSpace: 'nowrap' }}>{new Date(latestDoc.addedAt).toLocaleDateString()}</TableCell>
                                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                            <IconButton size="small" color="primary" onClick={() => handleOpenFile(latestDoc.filePath)} title="Open Native Viewer"><LaunchIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" color="success" onClick={() => handleDownloadFile(latestDoc.filePath, `${latestDoc.name}.${latestDoc.fileType}`)} title="Save As / Download"><DownloadIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" color="info" onClick={() => triggerFileSelect(latestDoc.name, latestDoc.category)} title="Upload New Revision"><UploadFileIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" color="secondary" disabled={versionCount <= 1} onClick={() => { setSelectedDocGroup(versions); setHistoryOpen(true); }} title="View Version History"><HistoryIcon fontSize="small" /></IconButton>
                                                            <IconButton size="small" color="error" onClick={() => handleDeleteDoc(latestDoc.id, true)} title="Delete Document Group"><DeleteIcon fontSize="small" /></IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </AccordionDetails>
                        </Accordion>
                    ))
                )}
            </Box>

            {/* VERSION HISTORY MODAL */}
            <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0d1f3c', border: '1px solid', borderColor: 'divider' } }}>
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", borderBottom: '1px solid rgba(255,255,255,0.1)' }}>VERSION_HISTORY: <span style={{ color: '#3b82f6' }}>{selectedDocGroup[0]?.name}</span></DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary' }}>VER</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary' }}>PATH / FILE</TableCell>
                                    <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary' }}>DATE</TableCell>
                                    <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'text.secondary' }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedDocGroup.map((doc, index) => {
                                    const vNum = selectedDocGroup.length - index;
                                    const isLatest = index === 0;
                                    return (
                                        <TableRow key={doc.id} sx={{ bgcolor: isLatest ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                                            <TableCell><Chip label={`v${vNum}.0`} size="small" color={isLatest ? "success" : "default"} variant={isLatest ? "filled" : "outlined"} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }} /></TableCell>
                                            <TableCell>
                                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{doc.filePath}</Typography>
                                                {isLatest && <Typography variant="caption" color="success.main" sx={{ ml: 2, fontWeight: 'bold' }}>(CURRENT)</Typography>}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(doc.addedAt).toLocaleString()}</TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                <IconButton size="small" color="primary" onClick={() => handleOpenFile(doc.filePath)}><LaunchIcon fontSize="small" /></IconButton>
                                                <IconButton size="small" color="success" onClick={() => handleDownloadFile(doc.filePath, `${doc.name}_v${vNum}.${doc.fileType}`)}><DownloadIcon fontSize="small" /></IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteDoc(doc.id, false)}><DeleteIcon fontSize="small" /></IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
            </Dialog>

            {/* 🔥 PHASE 3: SERVER RECONCILIATION MODAL */}
            <Dialog open={syncModalOpen} onClose={() => setSyncModalOpen(false)} maxWidth="lg" fullWidth disableEscapeKeyDown PaperProps={{ sx: { bgcolor: '#0b172d', border: '1px solid', borderColor: '#3b82f6' } }}>
                <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SyncIcon color="primary" /> HOST SERVER RECONCILIATION
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            Found <strong>{untrackedFiles.length}</strong> untracked file(s) on the server. Identify them below to sync the database.
                        </Typography>
                    </Box>
                    <TableContainer sx={{ maxHeight: 500, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#0b172d', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: '35%' }}>UNTRACKED FILE PATH</TableCell>
                                    <TableCell sx={{ bgcolor: '#0b172d', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: '25%' }}>ACTION</TableCell>
                                    <TableCell sx={{ bgcolor: '#0b172d', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', width: '40%' }}>CATEGORY / REVISION TARGET</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {untrackedFiles.map((file) => {
                                    const sel = syncSelections[file.path] || {};
                                    return (
                                        <TableRow key={file.path} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" sx={{ color: 'text.primary', wordBreak: 'break-all' }}>{file.name}</Typography>
                                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', wordBreak: 'break-all' }}>{file.path}</Typography>
                                                <Chip
                                                    label={file.syncReason}
                                                    size="small"
                                                    color={file.syncReason.includes('Modified') ? 'warning' : 'success'}
                                                    sx={{ mt: 1, fontSize: '9px', fontFamily: "'JetBrains Mono', monospace" }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <RadioGroup row value={sel.action} onChange={(e) => handleUpdateSyncSelection(file.path, 'action', e.target.value)}>
                                                    <FormControlLabel value="new" control={<Radio size="small" color="success" />} label={<Typography sx={{ fontSize: '12px' }}>New Doc</Typography>} />
                                                    <FormControlLabel value="revision" control={<Radio size="small" color="info" />} label={<Typography sx={{ fontSize: '12px' }}>Revision</Typography>} />
                                                    <FormControlLabel value="skip" control={<Radio size="small" color="error" />} label={<Typography sx={{ fontSize: '12px' }}>Skip</Typography>} />
                                                </RadioGroup>
                                            </TableCell>
                                            <TableCell>
                                                {sel.action === 'new' && (
                                                    <TextField select fullWidth size="small" value={sel.category} onChange={(e) => handleUpdateSyncSelection(file.path, 'category', e.target.value)}>
                                                        {templateFolders.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                                    </TextField>
                                                )}
                                                {sel.action === 'revision' && (
                                                    <Autocomplete
                                                        options={uniqueDocNames}
                                                        value={sel.parentName}
                                                        onChange={(e, newVal) => handleUpdateSyncSelection(file.path, 'parentName', newVal || "")}
                                                        renderInput={(params) => <TextField {...params} fullWidth size="small" label="Select Parent Document" placeholder="Search..." />}
                                                    />
                                                )}
                                                {sel.action === 'skip' && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Will be ignored for now. Stays on hard drive.</Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <Button onClick={() => setSyncModalOpen(false)} color="inherit" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>CANCEL</Button>
                    <Button variant="contained" color="primary" onClick={commitSync} sx={{ fontFamily: "'JetBrains Mono', monospace", px: 3, borderRadius: 50 }}>COMMIT SYNC</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}