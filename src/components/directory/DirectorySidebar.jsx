import React, { useMemo } from 'react';
import { Box, Paper, IconButton, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import BadgeIcon from '@mui/icons-material/Badge';
import ApartmentIcon from '@mui/icons-material/Apartment';

const SIDEBAR_CLOSED_WIDTH = 68;
const SIDEBAR_OPEN_WIDTH = 260;

export default function DirectorySidebar({ sidebarOpen, setSidebarOpen, tab, handleTabChange, hasClearance }) {
    const NAV_ITEMS = useMemo(() => {
        const items = [];
        if (hasClearance(4)) items.push({ id: 'org', label: 'INTERNAL ORG', icon: <BadgeIcon />, color: '#3b82f6' });
        items.push({ id: 'crm', label: 'EXTERNAL CRM', icon: <ApartmentIcon />, color: '#10b981' });
        return items;
    }, [hasClearance]);

    return (
        <Paper elevation={0} sx={{ width: sidebarOpen ? SIDEBAR_OPEN_WIDTH : { xs: 0, md: SIDEBAR_CLOSED_WIDTH }, flexShrink: 0, bgcolor: 'rgba(13, 31, 60, 0.5)', borderRight: '1px solid', borderColor: 'divider', transition: 'width 0.225s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'hidden', display: 'flex', flexDirection: 'column', position: { xs: 'fixed', md: 'relative' }, height: '100%', zIndex: { xs: 1100, md: 1 }, left: 0, top: 0 }}>
            <Box sx={{ p: 1, display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center', alignItems: 'center', height: 60 }}>
                <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                    {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
                </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <List sx={{ px: 1 }}>
                    <Typography variant="caption" sx={{ px: sidebarOpen ? 2 : 0, pt: 1, pb: 1, display: 'block', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: 'text.secondary', letterSpacing: '1px', textAlign: sidebarOpen ? 'left' : 'center', opacity: sidebarOpen ? 0.6 : 0, transition: 'opacity 0.2s' }}>
                        {sidebarOpen ? "DIRECTORIES" : ""}
                    </Typography>
                    {NAV_ITEMS.map((item) => {
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
    );
}