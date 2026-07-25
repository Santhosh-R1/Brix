import React, { useState, useEffect } from 'react';
import {
    Box, TextField, Button, Typography, Avatar, IconButton,
    MenuItem, Divider, Paper, Grid, Tooltip, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, alpha, useTheme, Autocomplete, Chip,Fade
} from '@mui/material';

// Icons
import BusinessIcon from '@mui/icons-material/Business';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import PublicIcon from '@mui/icons-material/Public';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import { debounce } from 'lodash';
import { useSettings } from '../context/SettingsContext';
import "../styles/CompanySettings.css"
export default function CompanySettings() {
    const theme = useTheme();
    const { refreshSettings } = useSettings();
const [errors, setErrors] = useState({ email: false, phone: false });
    // --- SIDEBAR STATE ---
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const SIDEBAR_CLOSED_WIDTH = 68;
    const SIDEBAR_OPEN_WIDTH = 260;

    const [activeTab, setActiveTab] = useState("profile");

    const [info, setInfo] = useState({
        name: "", address: "", email: "", phone: "", taxId: "", logo: "",
        currencySymbol: "₹", currencyLocale: "en-IN", unitSystem: "Metric",
        scaffoldRoot: "",
        scaffoldPathTemplate: "./{TYPE}/{CODE}_{NAME}",
        templateFolders: ["01_Drawings", "02_Permits", "03_Site_Photos", "04_Invoices", "05_Communications"],
        departments: ["Operations", "Design", "Finance", "Management", "Site Logistics"],

        // 🔥 PHASE 1: NEW FILE MANAGEMENT RULES STATE
        trackedExtensions: [".dwg", ".skp", ".rvt", ".std", ".edb", ".pdf", ".xlsx", ".docx", ".doc"],
        ignoredExtensions: [".bak", ".skb", ".tmp", ".log", ".err", ".ini", ".ds$"],
        mediaExtensions: [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".avi"]
    });

    const [newFolderName, setNewFolderName] = useState("");
    const [selectedParent, setSelectedParent] = useState("");
    const [newDeptName, setNewDeptName] = useState("");

    // --- DEBOUNCED AUTO-SAVE ---
    const debouncedSave = React.useCallback(
        debounce(async (payload) => {
            await window.api.db.saveSettings('company_info', payload);
            await refreshSettings();
        }, 500),
        []
    );

    const updateInfo = (field, value) => {
        setInfo(prev => {
            const updated = { ...prev, [field]: value };
            debouncedSave(updated);
            return updated;
        });
    };
// Handler for Phone: Blocks typing after 10 digits and allows only numbers
const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, ''); // Remove all non-digits
    if (val.length <= 10) {
        updateInfo('phone', val);
        // Set error if user stops before 10 digits
        setErrors(prev => ({ ...prev, phone: val.length !== 10 && val.length > 0 }));
    }
};

// Handler for Email: Validates the @ symbol
const handleEmailChange = (e) => {
    const val = e.target.value;
    updateInfo('email', val);
    const hasAt = val.includes('@');
    setErrors(prev => ({ ...prev, email: !hasAt && val.length > 0 }));
};
    const updateInfoList = (field, updatedList) => {
        setInfo(prev => {
            // Ensure elements are trimmed strings and formatted correctly for extensions
            const cleanList = updatedList.map(item => {
                let str = String(item).trim().toLowerCase();
                if (field.includes('Extensions') && !str.startsWith('.') && str.length > 0) str = `.${str}`;
                return str;
            }).filter(Boolean);

            const updated = { ...prev, [field]: cleanList };
            debouncedSave(updated);
            return updated;
        });
    };

    useEffect(() => {
        window.api.db.getSettings('company_info').then(data => {
            if (data) {
                // Safe parsing for arrays stored as strings
                const safeParseArray = (val, fallback) => {
                    if (!val) return fallback;
                    if (Array.isArray(val)) return val;
                    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
                    return fallback;
                };

                setInfo(prev => ({
                    ...prev,
                    ...data,
                    templateFolders: safeParseArray(data.templateFolders, prev.templateFolders),
                    departments: safeParseArray(data.departments, prev.departments),

                    // 🔥 PHASE 1: LOAD SAVED EXTENSION RULES
                    trackedExtensions: safeParseArray(data.trackedExtensions, prev.trackedExtensions),
                    ignoredExtensions: safeParseArray(data.ignoredExtensions, prev.ignoredExtensions),
                    mediaExtensions: safeParseArray(data.mediaExtensions, prev.mediaExtensions),

                    currencySymbol: data.currencySymbol || "₹",
                    currencyLocale: data.currencyLocale || "en-IN",
                    unitSystem: data.unitSystem || "Metric",
                    scaffoldPathTemplate: data.scaffoldPathTemplate || "./{TYPE}/{CODE}_{NAME}"
                }));
            }
        });
    }, []);

    const handlePickRoot = async () => {
        if (window.api?.os?.pickDirectory) {
            const path = await window.api.os.pickDirectory();
            if (path) updateInfo('scaffoldRoot', path);
        } else {
            alert("This feature requires the Desktop Host application.");
        }
    };

    const handleLogoUpload = async () => {
        const path = await window.api.os.pickFile();
        if (!path) return;
        const base64Data = await window.api.os.getBase64(path);
        if (base64Data) updateInfo('logo', base64Data);
    };

    const handleAddFolder = () => {
        if (!newFolderName.trim()) return;
        const cleanName = newFolderName.trim().replace(/[\/\\]/g, '');
        const fullPath = selectedParent ? `${selectedParent}/${cleanName}` : cleanName;
        if (!info.templateFolders.includes(fullPath)) {
            updateInfoList('templateFolders', [...info.templateFolders, fullPath].sort());
        }
        setNewFolderName("");
    };

    const handleRemoveFolder = (pathToRemove) => {
        const updated = info.templateFolders.filter(f => f !== pathToRemove && !f.startsWith(`${pathToRemove}/`));
        updateInfoList('templateFolders', updated);
        if (selectedParent === pathToRemove || selectedParent.startsWith(`${pathToRemove}/`)) {
            setSelectedParent("");
        }
    };

    const handleAddDept = () => {
        if (!newDeptName.trim()) return;
        const cleanName = newDeptName.trim();
        if (!info.departments.includes(cleanName)) {
            updateInfoList('departments', [...info.departments, cleanName].sort());
        }
        setNewDeptName("");
    };

    const handleRemoveDept = (deptToRemove) => {
        const updated = info.departments.filter(d => d !== deptToRemove);
        updateInfoList('departments', updated);
    };

    const NAV_ITEMS = [
        { id: "profile", label: "COMPANY PROFILE", icon: <BusinessIcon />, color: '#3b82f6' },
        // { id: "organization", label: "DEPARTMENTS", icon: <AccountTreeIcon />, color: '#8b5cf6' },
        // { id: "regional", label: "REGIONAL STANDARDS", icon: <PublicIcon />, color: '#10b981' },
        // { id: "automation", label: "FILE AUTOMATION & RULES", icon: <FolderSpecialIcon />, color: '#f59e0b' }, // 🔥 Updated label
    ];

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>

            <Paper elevation={0} sx={{ width: sidebarOpen ? SIDEBAR_OPEN_WIDTH : { xs: 0, md: SIDEBAR_CLOSED_WIDTH }, flexShrink: 0, bgcolor: 'rgba(13, 31, 60, 0.5)', borderRight: '1px solid', borderColor: 'divider', transition: 'width 0.225s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'hidden', display: 'flex', flexDirection: 'column', position: { xs: 'fixed', md: 'relative' }, height: '100%', zIndex: { xs: 1100, md: 1 }, left: 0, top: 0 }}>
                <Box sx={{ p: 1, display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center', alignItems: 'center', height: 60 }}>
                    <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
                    </IconButton>
                </Box>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                    <List sx={{ px: 1 }}>
                        <Typography variant="caption" sx={{ px: sidebarOpen ? 2 : 0, pt: 1, pb: 1, display: 'block', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: 'text.secondary', textAlign: sidebarOpen ? 'left' : 'center', opacity: sidebarOpen ? 0.6 : 0 }}>
                            {sidebarOpen ? "SYSTEM CONFIG" : ""}
                        </Typography>
                        {NAV_ITEMS.map((item) => (
                            <Tooltip key={item.id} title={!sidebarOpen ? item.label : ""} placement="right" disableInteractive>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton onClick={() => { setActiveTab(item.id); if (window.innerWidth < 900) setSidebarOpen(false); }} selected={activeTab === item.id} sx={{ borderRadius: 1.5, minHeight: 40, justifyContent: sidebarOpen ? 'initial' : 'center', px: 2.5, '&.Mui-selected': { bgcolor: alpha(item.color, 0.15) }, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                        <ListItemIcon sx={{ minWidth: 0, mr: sidebarOpen ? 2 : 'auto', justifyContent: 'center', color: activeTab === item.id ? item.color : 'text.secondary' }}>{item.icon}</ListItemIcon>
                                        <ListItemText primary={item.label} sx={{ opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.2s', m: 0 }} primaryTypographyProps={{ sx: { fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: activeTab === item.id ? 'bold' : 'normal', color: activeTab === item.id ? item.color : 'text.primary', whiteSpace: 'nowrap' } }} />
                                    </ListItemButton>
                                </ListItem>
                            </Tooltip>
                        ))}
                    </List>
                </Box>
            </Paper>

            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => setSidebarOpen(true)} sx={{ display: { xs: 'block', md: 'none' }, color: 'text.secondary' }}><MenuIcon /></IconButton>
                        <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '18px', md: '22px' } }}>
                            SETTINGS: <span style={{ color: theme.palette.primary.main }}>{activeTab.toUpperCase()}</span>
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ width: '100%', flexGrow: 1 }}>
                   {activeTab === "profile" && (
    <Fade in={true}>
        <Box className="profile-grid-container">
            <Grid container spacing={4}>
                
                {/* LEFT: LOGO SECTION */}
                <Grid item xs={12} md={3} lg={2.5}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Box className="profile-logo-frame">
                            {info.logo ? (
                                <img src={info.logo} alt="Company Logo" />
                            ) : (
                                <BusinessIcon sx={{ fontSize: 60, opacity: 0.1, color: '#00f2ff' }} />
                            )}
                        </Box>
                        <Button 
                            variant="text" 
                            startIcon={<CloudUploadIcon />} 
                            onClick={handleLogoUpload}
                            sx={{ 
                                mt: 2, 
                                fontSize: '10px', 
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#00f2ff'
                            }}
                        >
                            {info.logo ? "CHANGE_LOGO" : "UPLOAD_LOGO"}
                        </Button>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center', fontSize: '9px' }}>
                            REQUIRED FOR PDF BRANDING
                        </Typography>
                    </Box>
                </Grid>

                {/* RIGHT: DATA SECTION */}
                <Grid item xs={12} md={9} lg={9.5}>
                    <Grid container spacing={3}>
                        {/* Row 1 */}
                        <Grid item xs={12} md={8}>
                            <TextField 
                                fullWidth 
                                className="profile-field"
                                label="COMPANY_IDENTIFIER / FIRM NAME" 
                                value={info.name} 
                                onChange={e => updateInfo('name', e.target.value)} 
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField 
                                fullWidth 
                                className="profile-field"
                                label="TAX_ID / GSTIN" 
                                value={info.taxId} 
                                onChange={e => updateInfo('taxId', e.target.value)} 
                            />
                        </Grid>

                        {/* Row 2 */}
                        <Grid item xs={12}>
                            <TextField 
                                fullWidth 
                                multiline 
                                rows={2} 
                                className="profile-field"
                                label="PHYSICAL_OFFICE_ADDRESS" 
                                value={info.address} 
                                onChange={e => updateInfo('address', e.target.value)} 
                            />
                        </Grid>

                        {/* Row 3 */}
                        {/* Row 3 */}
<Grid item xs={12} md={6}>
    <TextField 
        fullWidth 
        className="profile-field"
        label="OFFICIAL_SYSTEM_EMAIL" 
        value={info.email} 
        onChange={handleEmailChange}
        error={errors.email}
        helperText={errors.email ? "INVALID_FORMAT: '@' is compulsory" : ""}
        inputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }}
    />
</Grid>

<Grid item xs={12} md={6}>
    <TextField 
        fullWidth 
        className="profile-field"
        label="PRIMARY_CONTACT_NO (10 DIGITS)" 
        value={info.phone} 
        onChange={handlePhoneChange}
        error={errors.phone}
        helperText={errors.phone ? "REQUIRED: Exactly 10 digits" : `${info.phone.length}/10`}
        // This ensures only the numeric keypad shows on mobile
        type="tel" 
        inputProps={{ 
            maxLength: 10,
            sx: { fontFamily: "'JetBrains Mono', monospace" } 
        }}
    />
</Grid>
                    </Grid>
                </Grid>

            </Grid>
        </Box>
    </Fade>
)}

                    {activeTab === "organization" && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 2, display: 'block' }}>DEPARTMENT CONFIGURATION</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={8}><TextField fullWidth size="small" label="New Department Name" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} /></Grid>
                                    <Grid item xs={12} md={4}><Button fullWidth variant="outlined" onClick={handleAddDept} sx={{ fontFamily: "'JetBrains Mono', monospace", height: '40px' }}>ADD_DEPARTMENT</Button></Grid>
                                </Grid>
                            </Grid>
                            <Grid item xs={12}>
                                <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 500, overflowY: 'auto' }}>
                                    {info.departments.map(dept => (
                                        <Box key={dept} display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5, p: 0.8, borderLeft: '2px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
                                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>❖ {dept}</Typography>
                                            <IconButton size="small" color="error" onClick={() => handleRemoveDept(dept)}><DeleteIcon sx={{ fontSize: '16px' }} /></IconButton>
                                        </Box>
                                    ))}
                                    {info.departments.length === 0 && <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ py: 3, fontStyle: 'italic' }}>No custom departments configured.</Typography>}
                                </Paper>
                            </Grid>
                        </Grid>
                    )}

                    {activeTab === "regional" && (
                        <Grid container spacing={3}>
                            <Grid item xs={12}><Typography variant="caption" color="primary.main" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>CURRENCY & MEASUREMENTS</Typography></Grid>
                            <Grid item xs={12} md={4}><TextField select fullWidth label="CURRENCY SYMBOL" value={info.currencySymbol} onChange={e => updateInfo('currencySymbol', e.target.value)} size="small"><MenuItem value="₹">INR (₹)</MenuItem><MenuItem value="$">USD ($)</MenuItem><MenuItem value="€">EUR (€)</MenuItem><MenuItem value="AED">AED</MenuItem></TextField></Grid>
                            <Grid item xs={12} md={4}><TextField select fullWidth label="NUMBER FORMAT" value={info.currencyLocale} onChange={e => updateInfo('currencyLocale', e.target.value)} size="small"><MenuItem value="en-IN">Indian (1,00,000.00)</MenuItem><MenuItem value="en-US">Western (100,000.00)</MenuItem></TextField></Grid>
                            <Grid item xs={12} md={4}><TextField select fullWidth label="UNIT SYSTEM" value={info.unitSystem} onChange={e => updateInfo('unitSystem', e.target.value)} size="small"><MenuItem value="Metric">Metric (m, kg)</MenuItem><MenuItem value="Imperial">Imperial (ft, lb)</MenuItem></TextField></Grid>
                        </Grid>
                    )}

                    {activeTab === "automation" && (
                        <Grid container spacing={3}>

                            {/* HOST & SCAFFOLDING */}
                            <Grid item xs={12}>
                                <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.2), borderRadius: 2 }}>
                                    <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ display: 'block', mb: 1, fontFamily: "'JetBrains Mono', monospace" }}>HOST_SCAFFOLD_ROOT</Typography>
                                    <Box display="flex" gap={1}>
                                        <TextField fullWidth size="small" value={info.scaffoldRoot} disabled InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' } }} />
                                        <Button variant="contained" size="small" onClick={handlePickRoot} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>BROWSE</Button>
                                    </Box>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="SCAFFOLD PATH TEMPLATE" value={info.scaffoldPathTemplate} onChange={e => updateInfo('scaffoldPathTemplate', e.target.value)} helperText="Example: ./{type}/{status}/{code}_{name}/" size="small" />
                            </Grid>

                            <Grid item xs={12}><Divider sx={{ opacity: 0.1 }} /></Grid>

                            {/* 🔥 PHASE 1: FILE EXTENSION RULES */}
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 2, display: 'block' }}>FILE EXTENSION TRACKING RULES</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>Configure which extensions OPENPRIX should actively track as documents, mark as media, or ignore entirely (like .bak files).</Typography>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={4}>
                                        <Autocomplete
                                            multiple freeSolo options={[]}
                                            value={info.trackedExtensions}
                                            onChange={(e, newVal) => updateInfoList('trackedExtensions', newVal)}
                                            renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant="filled" color="success" size="small" label={option} {...getTagProps({ index })} />)}
                                            renderInput={(params) => <TextField {...params} label="TRACKED DOCUMENTS" size="small" helperText="Registers as Document Revisions" />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Autocomplete
                                            multiple freeSolo options={[]}
                                            value={info.mediaExtensions}
                                            onChange={(e, newVal) => updateInfoList('mediaExtensions', newVal)}
                                            renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant="filled" color="info" size="small" label={option} {...getTagProps({ index })} />)}
                                            renderInput={(params) => <TextField {...params} label="MEDIA & GALLERY" size="small" helperText="Registers as Site Photos/Videos" />}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Autocomplete
                                            multiple freeSolo options={[]}
                                            value={info.ignoredExtensions}
                                            onChange={(e, newVal) => updateInfoList('ignoredExtensions', newVal)}
                                            renderTags={(value, getTagProps) => value.map((option, index) => <Chip variant="filled" color="error" size="small" label={option} {...getTagProps({ index })} />)}
                                            renderInput={(params) => <TextField {...params} label="IGNORED / JUNK FILES" size="small" helperText="Hidden from Scanners (.bak, .log)" />}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid item xs={12}><Divider sx={{ opacity: 0.1 }} /></Grid>

                            {/* FOLDER TEMPLATE BUILDER */}
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 2, display: 'block' }}>PROJECT FOLDER TEMPLATE BUILDER</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <TextField select fullWidth size="small" label="Parent Folder" value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)}><MenuItem value="" sx={{ fontStyle: 'italic' }}>-- Root --</MenuItem>{info.templateFolders.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}</TextField>
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField fullWidth size="small" label="New Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <Button fullWidth variant="outlined" onClick={handleAddFolder} sx={{ fontFamily: "'JetBrains Mono', monospace", height: '40px' }}>ADD_FOLDER</Button>
                                    </Grid>
                                </Grid>
                            </Grid>

                            <Grid item xs={12}>
                                <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 500, overflowY: 'auto' }}>
                                    {info.templateFolders.map(path => {
                                        const depth = (path.match(/\//g) || []).length;
                                        const folderName = path.split('/').pop();
                                        return (
                                            <Box key={path} display="flex" alignItems="center" justifyContent="space-between" sx={{ ml: depth * 3, mb: 0.5, p: 0.8, borderLeft: '2px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
                                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: depth === 0 ? 'primary.light' : 'text.primary' }}>
                                                    {depth > 0 ? '↳ ' : '📁 '}{folderName}
                                                </Typography>
                                                <IconButton size="small" color="error" onClick={() => handleRemoveFolder(path)}><DeleteIcon sx={{ fontSize: '16px' }} /></IconButton>
                                            </Box>
                                        )
                                    })}
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            </Box>
        </Box>
    );
}