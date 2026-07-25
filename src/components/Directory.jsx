import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Button, Paper, Grid, Avatar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';

// Icons
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BadgeIcon from '@mui/icons-material/Badge';
import EngineeringIcon from '@mui/icons-material/Engineering';
import GroupsIcon from '@mui/icons-material/Groups';
import ApartmentIcon from '@mui/icons-material/Apartment';
import MenuIcon from '@mui/icons-material/Menu';

import { useAuth } from '../context/AuthContext';
// 🔥 REACT QUERY HOOKS (From Phase 1)
import { useStaff, useCrmContacts, useSaveStaff, useDeleteStaff, useSaveCrm, useDeleteCrm } from '../hooks/useQueries';

// Sub-components
import DirectorySidebar from './directory/DirectorySidebar';
import StaffTable from './directory/StaffTable';
import CrmTable from './directory/CrmTable';
import DirectoryFormDialog from './directory/DirectoryFormDialog';

const MetricCard = ({ title, value, icon, color }) => (
    <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 42, height: 42 }}>{icon}</Avatar>
        <Box>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>{title}</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{value}</Typography>
        </Box>
    </Paper>
);

export default function Directory() {
    const { hasClearance, currentUser } = useAuth();

    // --- REACT QUERY DATA ---
    const { data: rawOrgStaff = [] } = useStaff();
    const { data: rawCrmContacts = [] } = useCrmContacts();

    const saveStaff = useSaveStaff();
    const deleteStaff = useDeleteStaff();
    const saveCrm = useSaveCrm();
    const deleteCrm = useDeleteCrm();

    // Sort data safely
    const orgStaff = useMemo(() => [...rawOrgStaff].sort((a, b) => b.createdAt - a.createdAt), [rawOrgStaff]);
    const crmContacts = useMemo(() => [...rawCrmContacts].sort((a, b) => b.createdAt - a.createdAt), [rawCrmContacts]);

    // --- STATE ---
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [tab, setTab] = useState(hasClearance(4) ? 'org' : 'crm');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({});

    const [departments, setDepartments] = useState(["Operations", "Design", "Finance", "Management", "Site Logistics"]);

    useEffect(() => {
        window.api.db.getSettings('company_info').then(info => {
            if (info?.departments?.length > 0) setDepartments(info.departments);
        }).catch(() => { });
    }, []);

    const stats = useMemo(() => {
        return {
            ext: crmContacts.length,
            int: orgStaff.length,
            subs: crmContacts.filter(c => c.type === 'Subcontractor' || c.type === 'Supplier').length,
            clients: crmContacts.filter(c => c.type === 'Client' || c.type === 'Lead').length
        };
    }, [crmContacts, orgStaff]);

    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditId(item.id);
            let parsedPerms = [];
            try { parsedPerms = typeof item.globalPermissions === 'string' ? JSON.parse(item.globalPermissions) : (item.globalPermissions || []); } catch (e) { }
            setFormData({ ...item, globalPermissions: parsedPerms });
        } else {
            setEditId(null);
            setFormData(tab === 'crm'
                ? { name: "", company: "", type: "Client", status: "Active", email: "", phone: "" }
                : { name: "", designation: "", department: departments[0] || "Operations", status: "Active", email: "", phone: "", username: "", password: "", accessLevel: 1, role: "Staff", globalPermissions: [] }
            );
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return;
        if (tab === 'org' && !hasClearance(5)) return alert("Access Denied: Level 5 required.");

        const payload = {
            ...formData,
            id: editId || crypto.randomUUID(),
            createdAt: formData.createdAt || Date.now(),
        };

        if (tab === 'crm') {
            delete payload.accessLevel; delete payload.username; delete payload.password;
            delete payload.role; delete payload.department; delete payload.designation; delete payload.globalPermissions;
            await saveCrm.mutateAsync(payload);
        } else {
            payload.accessLevel = parseInt(formData.accessLevel, 10) || 1;
            if (payload.username) payload.username = payload.username.trim().toLowerCase().replace(/\s+/g, '');
            payload.globalPermissions = JSON.stringify(formData.globalPermissions || []);
            await saveStaff.mutateAsync(payload);
        }
        setIsDialogOpen(false);
    };

    const handleDelete = async (id) => {
        if (tab === 'crm' && !hasClearance(4)) return alert("Access Denied: Level 4 required.");
        if (tab === 'org' && !hasClearance(5)) return alert("Access Denied: Level 5 required.");
        if (!window.confirm("CRITICAL: Delete this record permanently?")) return;

        if (tab === 'crm') await deleteCrm.mutateAsync(id);
        else await deleteStaff.mutateAsync(id);
    };

    const updateGlobalPerms = async (staffId, newPerms) => {
        const staff = orgStaff.find(s => s.id === staffId);
        if (!staff) return;
        const payload = { ...staff, globalPermissions: JSON.stringify(newPerms) };
        await saveStaff.mutateAsync(payload);
    };

    const handleTabChange = (newTab) => {
        setTab(newTab);
        if (window.innerWidth < 900) setSidebarOpen(false);
    };

    const canCreateEntry = tab === 'crm' ? hasClearance(3) : hasClearance(5);

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* 1. SIDEBAR */}
            <DirectorySidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} tab={tab} handleTabChange={handleTabChange} hasClearance={hasClearance} />

            {/* Mobile Overlay */}
            {sidebarOpen && <Box onClick={() => setSidebarOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1000 }} />}

            {/* 2. MAIN CONTENT AREA */}
            <Box sx={{ flexGrow: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden', p: { xs: 2, md: 3 }, pb: { xs: 12, md: 3 } }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 3, sm: 0 }, mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => setSidebarOpen(true)} sx={{ display: { xs: 'block', md: 'none' }, color: 'text.secondary' }}><MenuIcon /></IconButton>
                        <Typography variant="h4" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: { xs: '18px', md: '22px' } }}>
                            DIRECTORY: <span style={{ color: '#3b82f6' }}>{tab === 'org' ? 'INTERNAL_DIRECTORY' : 'EXTERNAL_DIRECTORY'}</span>
                        </Typography>
                    </Box>

                    {canCreateEntry && (
                        <Button variant="contained" color="primary" disableElevation startIcon={<AddCircleOutlineIcon />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '1px', height: '36px', px: 4, width: { xs: '100%', sm: 'auto' } }}>
                            NEW_ENTRY
                        </Button>
                    )}
                </Box>

                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="INTERNAL_ORG" value={stats.int} icon={<BadgeIcon />} color="secondary" /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="EXTERNAL_CRM" value={stats.ext} icon={<ApartmentIcon />} color="info" /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="SUPPLY_CHAIN" value={stats.subs} icon={<EngineeringIcon />} color="warning" /></Grid>
                    <Grid item xs={12} sm={6} md={3}><MetricCard title="ACTIVE_CLIENTS" value={stats.clients} icon={<GroupsIcon />} color="success" /></Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)', overflowX: 'auto', mb: { xs: 2, md: 0 } }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                            <TableRow>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}>IDENTITY</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}>{tab === 'crm' ? 'ENTITY_COMPANY' : 'ROLE_DESIGNATION'}</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}>{tab === 'crm' ? 'TYPE' : 'DEPT'}</TableCell>
                                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}>CONTACT</TableCell>
                                {tab === 'org' && <TableCell align="center" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}>SYSTEM_ACCESS</TableCell>}
                                <TableCell align="right" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', fontSize: '11px', whiteSpace: 'nowrap' }}>ACTIONS</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tab === 'org'
                                ? <StaffTable orgStaff={orgStaff} hasClearance={hasClearance} handleOpenDialog={handleOpenDialog} handleDelete={handleDelete} updateGlobalPerms={updateGlobalPerms} />
                                : <CrmTable crmContacts={crmContacts} hasClearance={hasClearance} handleOpenDialog={handleOpenDialog} handleDelete={handleDelete} />
                            }
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* 3. DIALOG */}
                <DirectoryFormDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} formData={formData} setFormData={setFormData} editId={editId} tab={tab} handleSave={handleSave} currentUser={currentUser} departments={departments} />
            </Box>
        </Box>
    );
}