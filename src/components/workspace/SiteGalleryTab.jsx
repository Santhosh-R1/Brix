import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Box, Typography, Grid, Paper, Button, IconButton, Dialog, DialogContent,
    Checkbox, Autocomplete, TextField, Tabs, Tab, Chip
} from '@mui/material';

// Icons
import AddAPhotoIcon from '@mui/icons-material/AddAPhoto';
import DeleteIcon from '@mui/icons-material/Delete';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';

import { useProject } from '../../hooks/useQueries';

// 🔥 PHASE 4: UPGRADED SMART MEDIA COMPONENT
const SmartMedia = ({ filePath, alt, style, isThumbnail = false }) => {
    const [src, setSrc] = useState(null);
    const isVideo = /\.(mp4|mov|webm|ogg|avi)$/i.test(filePath || alt);

    useEffect(() => {
        let isMounted = true;
        const resolveMedia = async () => {
            const token = localStorage.getItem('openprix_token');
            const isDesktop = navigator.userAgent.toLowerCase().includes('electron');
            const targetUrl = window.api?.os?.getServerUrl ? window.api.os.getServerUrl() : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000');

            // 1. Desktop optimization: try base64 first
            if (!isVideo && isDesktop && window.api?.os?.getBase64) {
                try {
                    const b64 = await window.api.os.getBase64(filePath);
                    if (b64 && isMounted) {
                        setSrc(b64);
                        return;
                    }
                } catch (e) { }
            }

            // 2. HTTP Streaming: MUST include the token in the URL for Auth
            if (isMounted) {
                // 🔥 CRITICAL: Normalize Windows paths to forward slashes 
                // and append the token for the backend middleware
                const cleanPath = filePath.replace(/\\/g, '/');
                const secureUrl = `${targetUrl}/api/os/download?path=${encodeURIComponent(cleanPath)}&token=${encodeURIComponent(token || '')}`;
                setSrc(secureUrl);
            }
        };

        resolveMedia();
        return () => { isMounted = false; };
    }, [filePath, isVideo]);

    if (!src) return (
        <Box sx={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.5)' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                LOADING_MEDIA...
            </Typography>
        </Box>
    );

    if (isVideo) {
        return (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                    src={src}
                    style={{ ...style, objectFit: 'contain', backgroundColor: '#000' }}
                    controls={!isThumbnail}
                    preload="metadata"
                />
                {isThumbnail && (
                    <PlayCircleOutlineIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 50, color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
                )}
            </Box>
        );
    }

    return <img src={src} alt={alt} style={style} />;
};


export default function SiteGalleryTab({ projectId }) {
    const { data: rawProject } = useProject(projectId);
    const project = rawProject || {};

    const [media, setMedia] = useState([]);
    const [selectedImg, setSelectedImg] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({ uploading: false, current: 0, total: 0 });
    const [selectedIds, setSelectedIds] = useState([]);

    // Server Directories & Albums
    const [templateFolders, setTemplateFolders] = useState([]);
    const [uploadTarget, setUploadTarget] = useState("");
    const [activeAlbum, setActiveAlbum] = useState("All");

    const fileInputRef = useRef(null);

    const loadMedia = async () => {
        const docs = await window.api.db.getProjectDocuments(projectId);
        // Include both images and videos
        const filtered = docs.filter(d => /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|avi)$/i.test(d.name) || /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm|avi)$/i.test(d.filePath));
        setMedia(filtered);
    };

    useEffect(() => {
        loadMedia();

        const fetchFolders = async () => {
            if (project?.isScaffolded && project?.scaffoldPath) {
                try {
                    const res = await window.api.os.listDirectories(project.scaffoldPath);
                    if (Array.isArray(res) && res.length > 0) {
                        setTemplateFolders(res);
                        const photoFolder = res.find(c => c.toLowerCase().includes('photo') || c.toLowerCase().includes('gallery') || c.toLowerCase().includes('site'));
                        if (photoFolder) setUploadTarget(photoFolder);
                        return;
                    }
                } catch (err) { console.error("Failed to read live directories:", err); }
            }

            const res = await window.api.db.getSettings('company_info');
            if (res && res.data && Array.isArray(res.data.templateFolders)) {
                setTemplateFolders(res.data.templateFolders);
                const photoFolder = res.data.templateFolders.find(c => c.toLowerCase().includes('photo') || c.toLowerCase().includes('gallery'));
                if (photoFolder) setUploadTarget(photoFolder);
            }
        };

        fetchFolders();
    }, [projectId, project?.scaffoldPath]);

    // Group media into unique Albums (Categories/Folders)
    const albums = useMemo(() => {
        const uniqueCategories = [...new Set(media.map(m => m.category))].filter(Boolean).sort();
        return ["All", ...uniqueCategories];
    }, [media]);

    // Filter media by the active tab
    const displayedMedia = useMemo(() => {
        if (activeAlbum === "All") return media;
        return media.filter(m => m.category === activeAlbum);
    }, [media, activeAlbum]);

    useEffect(() => {
        if (!selectedImg) return;
        const handleKeyDown = (e) => {
            const currentIndex = displayedMedia.findIndex(p => p.id === selectedImg.id);
            if (e.key === 'ArrowRight') setSelectedImg(currentIndex < displayedMedia.length - 1 ? displayedMedia[currentIndex + 1] : displayedMedia[0]);
            if (e.key === 'ArrowLeft') setSelectedImg(currentIndex > 0 ? displayedMedia[currentIndex - 1] : displayedMedia[displayedMedia.length - 1]);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImg, displayedMedia]);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadProgress({ uploading: true, current: 0, total: files.length });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const extension = file.name.split('.').pop().toLowerCase();

            try {
                // 🔥 USE THE NEW SECURE SANDBOXED UPLOAD
                const res = await window.api.os.uploadProjectDocument(projectId, file);

                if (typeof res === 'string') {
                    await window.api.db.saveProjectDocument({
                        id: crypto.randomUUID(),
                        projectId,
                        name: file.name.replace(/\.[^/.]+$/, ""),
                        category: uploadTarget, // The UI still groups it by Album perfectly!
                        filePath: res,
                        fileType: extension,
                        addedAt: Date.now()
                    });
                }
            } catch (err) {
                console.error("Upload error:", err);
            }

            setUploadProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setUploadProgress({ uploading: false, current: 0, total: 0 });
        loadMedia();
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm("Remove this media from the gallery tracker? (The file remains on the host server)")) {
            await window.api.db.deleteProjectDocument(id);
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            loadMedia();
        }
    };

    const toggleSelect = (id, e) => {
        e.stopPropagation();
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Remove ${selectedIds.length} selected items from the tracker?`)) {
            for (const id of selectedIds) {
                await window.api.db.deleteProjectDocument(id);
            }
            setSelectedIds([]);
            loadMedia();
        }
    };

    const handleNext = () => {
        const currentIndex = displayedMedia.findIndex(p => p.id === selectedImg.id);
        setSelectedImg(currentIndex < displayedMedia.length - 1 ? displayedMedia[currentIndex + 1] : displayedMedia[0]);
    };

    const handlePrev = () => {
        const currentIndex = displayedMedia.findIndex(p => p.id === selectedImg.id);
        setSelectedImg(currentIndex > 0 ? displayedMedia[currentIndex - 1] : displayedMedia[displayedMedia.length - 1]);
    };

    return (
        <Box>
            {/* 🔥 PHASE 4: ACCEPT VIDEOS AND IMAGES */}
            <input type="file" accept="image/*,video/*" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', lg: 'center' }, mb: 3, gap: 2 }}>
                <Box>
                    <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhotoLibraryIcon color="primary" /> PROJECT MEDIA GALLERY
                    </Typography>
                </Box>

                <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                    {selectedIds.length > 0 && (
                        <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleBulkDelete} sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                            DELETE SELECTED ({selectedIds.length})
                        </Button>
                    )}

                    {/* 🔥 UPLOAD TARGET DIRECTORY */}
                    <Autocomplete
                        freeSolo options={templateFolders} value={uploadTarget}
                        onChange={(e, newVal) => setUploadTarget(newVal || "Site Photos")}
                        onInputChange={(e, newVal) => setUploadTarget(newVal || "Site Photos")}
                        sx={{ minWidth: 200 }}
                        renderInput={(params) => <TextField {...params} size="small" label="UPLOAD DESTINATION ALBUM" InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' } }} />}
                    />

                    <Button variant="contained" startIcon={<AddAPhotoIcon />} onClick={() => fileInputRef.current.click()} disabled={uploadProgress.uploading} sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                        {uploadProgress.uploading ? `UPLOADING (${uploadProgress.current}/${uploadProgress.total})...` : "UPLOAD MEDIA"}
                    </Button>
                </Box>
            </Box>

            {/* 🔥 ALBUM NAVIGATION TABS */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeAlbum} onChange={(e, newVal) => setActiveAlbum(newVal)} variant="scrollable" scrollButtons="auto" textColor="primary" indicatorColor="primary">
                    {albums.map(album => (
                        <Tab
                            key={album}
                            value={album}
                            label={<Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold' }}>{album.toUpperCase()}</Typography>}
                        />
                    ))}
                </Tabs>
            </Box>

            <Grid container spacing={2}>
                {displayedMedia.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    const isVid = /\.(mp4|mov|webm|ogg|avi)$/i.test(item.fileType || item.filePath);

                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                            <Paper
                                onClick={(e) => toggleSelect(item.id, e)}
                                sx={{
                                    position: 'relative', overflow: 'hidden', borderRadius: 2,
                                    border: isSelected ? '2px solid #3b82f6' : '1px solid',
                                    borderColor: isSelected ? '#3b82f6' : 'divider',
                                    height: 200, bgcolor: 'rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'all 0.2s',
                                    '&:hover .overlay': { opacity: 1 }, transform: isSelected ? 'scale(0.98)' : 'scale(1)'
                                }}
                            >
                                <Checkbox
                                    icon={<RadioButtonUncheckedIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />} checkedIcon={<CheckCircleIcon sx={{ color: '#3b82f6' }} />}
                                    checked={isSelected} onChange={(e) => toggleSelect(item.id, e)}
                                    sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, bgcolor: isSelected ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.4)', borderRadius: 1, p: 0.5 }}
                                />

                                {/* Show Video icon in top right if it's a video */}
                                {isVid && <VideoFileIcon sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10, color: 'white', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }} />}

                                <SmartMedia filePath={item.filePath} alt={item.name} isThumbnail={true} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                                <Box className="overlay" sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, opacity: isSelected ? 1 : 0, transition: '0.2s' }}>
                                    <IconButton color="primary" sx={{ bgcolor: 'rgba(0,0,0,0.7)', '&:hover': { bgcolor: '#000' } }} onClick={(e) => { e.stopPropagation(); setSelectedImg(item); }}>
                                        <FullscreenIcon />
                                    </IconButton>
                                    <IconButton color="error" sx={{ bgcolor: 'rgba(0,0,0,0.7)', '&:hover': { bgcolor: '#000' } }} onClick={(e) => handleDelete(item.id, e)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>

                                <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', bgcolor: 'rgba(0,0,0,0.7)', p: 0.5, px: 1 }}>
                                    <Typography variant="caption" noWrap sx={{ color: 'white', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', display: 'block' }}>
                                        {item.name}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    );
                })}
                {displayedMedia.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '14px' }}>NO MEDIA IN THIS ALBUM</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* FULLSCREEN MEDIA MODAL */}
            <Dialog open={Boolean(selectedImg)} onClose={() => setSelectedImg(null)} maxWidth="xl" fullWidth PaperProps={{ sx: { bgcolor: 'transparent', boxShadow: 'none', backgroundImage: 'none', m: 0 } }}>
                <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '90vh', position: 'relative', overflow: 'hidden' }}>
                    {selectedImg && (
                        <>
                            <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                                <SmartMedia filePath={selectedImg.filePath} alt={selectedImg.name} isThumbnail={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                            </Box>

                            <Box sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(0,0,0,0.6)', p: 1, borderRadius: 1 }}>
                                <Typography variant="caption" sx={{ color: 'white', fontFamily: "'JetBrains Mono', monospace" }}>{selectedImg.name}</Typography>
                            </Box>

                            <IconButton onClick={() => setSelectedImg(null)} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(0,0,0,0.6)', '&:hover': { bgcolor: 'rgba(255,0,0,0.8)' } }}>
                                <CloseIcon />
                            </IconButton>

                            {displayedMedia.length > 1 && (
                                <IconButton onClick={handlePrev} sx={{ position: 'absolute', left: 16, color: 'white', bgcolor: 'rgba(0,0,0,0.6)', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.8)' } }}>
                                    <ChevronLeftIcon fontSize="large" />
                                </IconButton>
                            )}
                            {displayedMedia.length > 1 && (
                                <IconButton onClick={handleNext} sx={{ position: 'absolute', right: 16, color: 'white', bgcolor: 'rgba(0,0,0,0.6)', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.8)' } }}>
                                    <ChevronRightIcon fontSize="large" />
                                </IconButton>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
}