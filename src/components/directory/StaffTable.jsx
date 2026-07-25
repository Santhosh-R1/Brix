import React, { useState } from 'react';
import { Box, Typography, Avatar, TableRow, TableCell, Chip, Link, IconButton, Collapse, List, ListItem, ListItemButton, ListItemText, Switch } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const PERMISSION_TREE = [
    { id: "home", label: "Home Dashboard", subItems: [] },
    { id: "new_project", label: "Create New Project", subItems: [] },
    { id: "archive", label: "Project Archive", subItems: [] },
    {
        id: "workspace", label: "Project Workspace",
        subItems: [
            { id: "details", label: "Project Details" }, { id: "documents", label: "Docs & Drawings" },
            { id: "boq", label: "Master BOQ" }, { id: "schedule", label: "Gantt Schedule" },
            { id: "subcontractors", label: "Subcontractors" }, { id: "kanban", label: "Task Board" },
            { id: "gallery", label: "Site Photo Gallery" }, { id: "daily_log", label: "Site Daily Log" },
            { id: "mbook", label: "Measurement Book" }, { id: "resources", label: "Resource Deficits" },
            { id: "procurement", label: "Procurement (POs)" }, { id: "inventory", label: "Stock Inventory" },
            { id: "billing", label: "Client RA Billing" }, { id: "chat", label: "Project CommLink" }
        ]
    },
    { id: "directory", label: "Directory", subItems: [{ id: "org", label: "Internal Org" }, { id: "crm", label: "External CRM" }] },
    { id: "database", label: "Master Database Editor", subItems: [{ id: "db_view", label: "View Raw Records" }, { id: "db_edit", label: "Modify/Delete Records" }, { id: "db_backup", label: "Backup & Restore DB" }] },
    { id: "logs", label: "Organization Logs", subItems: [{ id: "office_logs", label: "Office & Admin Logs" }, { id: "system_logs", label: "System Activity Tracker" }] },
    { id: "servermanager", label: "Network & Server Host", subItems: [] },
    { id: "settings", label: "System & Company Settings", subItems: [] }
];

const StaffRow = ({ item, hasClearance, handleOpenDialog, handleDelete, updateGlobalPerms }) => {
    const [open, setOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState(null);
    const isL5 = item.accessLevel >= 5;
    const canEdit = hasClearance(5) && !isL5;

    let perms = [];
    try { perms = typeof item.globalPermissions === 'string' ? JSON.parse(item.globalPermissions) : (item.globalPermissions || []); } catch (e) { perms = []; }

    const handleToggle = (id, checked) => {
        const next = checked ? [...perms, id] : perms.filter(p => p !== id);
        updateGlobalPerms(item.id, next);
    };

    return (
        <React.Fragment>
            <TableRow hover onClick={() => canEdit && setOpen(!open)} sx={{ cursor: canEdit ? 'pointer' : 'default', '& > *': { borderBottom: 'unset' }, bgcolor: open ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '11px', bgcolor: 'primary.dark', fontFamily: "'JetBrains Mono', monospace" }}>{item.name?.charAt(0)}</Avatar>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 'bold' }}>{item.name}</Typography>
                            {canEdit && (open ? <ExpandLess fontSize="small" sx={{ opacity: 0.5, color: 'primary.main' }} /> : <ExpandMore fontSize="small" sx={{ opacity: 0.5 }} />)}
                        </Box>
                    </Box>
                </TableCell>
                <TableCell sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'text.secondary', whiteSpace: 'nowrap' }}>{item.designation}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><Chip label={item.department} size="small" variant="outlined" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', borderRadius: 1 }} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {item.phone || item.email ? (
                        <Box display="flex" flexDirection="column" gap={0.5}>
                            {item.phone && <Link href={`tel:${item.phone}`} underline="hover" color="info.main" onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><PhoneIcon sx={{ fontSize: 12 }} /> {item.phone}</Link>}
                            {item.email && <Link href={`mailto:${item.email}`} underline="hover" color="success.main" onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}><EmailIcon sx={{ fontSize: 12 }} /> {item.email}</Link>}
                        </Box>
                    ) : <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>-</Typography>}
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {item.username ? <Chip icon={<VpnKeyIcon style={{ fontSize: 12 }} />} label={isL5 ? 'ROOT L5' : `LEVEL ${item.accessLevel || 1}`} size="small" color={isL5 || item.accessLevel >= 4 ? 'error' : item.accessLevel >= 3 ? 'warning' : 'info'} sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', borderRadius: 1, fontWeight: 'bold' }} /> : <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px' }}>NO_ACCESS</Typography>}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {hasClearance(5) && (
                        <>
                            <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); handleOpenDialog(item); }}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                            <IconButton size="small" color="error" disabled={isL5} onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                        </>
                    )}
                </TableCell>
            </TableRow>
            {canEdit && (
                <TableRow>
                    <TableCell colSpan={6} sx={{ p: 0, pt: 0, pb: open ? 2 : 0, borderBottom: open ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ mx: 2, p: 2, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.light', fontWeight: 'bold', mb: 2, display: 'block' }}>L5 GLOBAL MODULE & TAB OVERRIDES:</Typography>
                                <List sx={{ width: '100%', bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1, p: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {PERMISSION_TREE.map((mainItem) => (
                                        <React.Fragment key={mainItem.id}>
                                            <ListItem sx={{ py: 0, px: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <ListItemButton onClick={() => mainItem.subItems.length > 0 && setOpenGroup(openGroup === mainItem.id ? null : mainItem.id)} sx={{ py: 1, borderRadius: 1 }}>
                                                    <ListItemText primary={mainItem.label} primaryTypographyProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 'bold', color: 'text.primary' } }} />
                                                    {mainItem.subItems.length > 0 && (openGroup === mainItem.id ? <ExpandLess sx={{ mr: 2 }} /> : <ExpandMore sx={{ mr: 2 }} />)}
                                                </ListItemButton>
                                                <Switch size="small" color="success" checked={perms.includes(mainItem.id)} onChange={(e) => handleToggle(mainItem.id, e.target.checked)} />
                                            </ListItem>
                                            {mainItem.subItems.length > 0 && (
                                                <Collapse in={openGroup === mainItem.id} timeout="auto" unmountOnExit>
                                                    <List component="div" disablePadding sx={{ bgcolor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {mainItem.subItems.map((subItem) => (
                                                            <ListItem key={subItem.id} sx={{ pl: 6, py: 0.5, height: 36 }}>
                                                                <ListItemText primary={subItem.label} primaryTypographyProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', opacity: 0.8 } }} />
                                                                <Switch edge="end" size="small" color="warning" checked={perms.includes(subItem.id)} onChange={(e) => handleToggle(subItem.id, e.target.checked)} />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                </Collapse>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </React.Fragment>
    );
};

export default function StaffTable({ orgStaff, hasClearance, handleOpenDialog, handleDelete, updateGlobalPerms }) {
    return (
        <>
            {orgStaff.map((item) => (
                <StaffRow key={item.id} item={item} hasClearance={hasClearance} handleOpenDialog={handleOpenDialog} handleDelete={handleDelete} updateGlobalPerms={updateGlobalPerms} />
            ))}
        </>
    );
}