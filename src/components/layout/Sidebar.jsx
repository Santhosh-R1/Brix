import React from 'react';
import { Box, Paper, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Tooltip } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';

const SIDEBAR_CLOSED_WIDTH = 68;
const SIDEBAR_OPEN_WIDTH = 260;

export default function Sidebar({ 
    open, 
    setOpen, 
    navItems, 
    currentView, 
    onNavigate, 
    onProfileOpen, 
    onLogout, 
    canAccessView 
}) {
    const userItems = [
        { label: 'My Profile', icon: <AccountCircleIcon />, action: onProfileOpen, color: 'text.primary' },
        { label: 'Secure Logout', icon: <LogoutIcon />, action: onLogout, color: 'error.main' }
    ];

    return (
        <Paper elevation={0} sx={{
            width: open ? SIDEBAR_OPEN_WIDTH : { xs: 0, sm: SIDEBAR_CLOSED_WIDTH },
            flexShrink: 0, 
            bgcolor: 'background.paper', 
            borderRight: '1px solid', 
            borderColor: 'divider',
            transition: 'width 0.225s cubic-bezier(0.4, 0, 0.2, 1)', 
            overflowX: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            position: { xs: 'absolute', sm: 'relative' }, 
            height: '100%', 
            zIndex: 1200, 
            left: 0, 
            top: 0
        }}>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', pt: 2 }}>
                <List sx={{ px: 1 }}>
                    {navItems.map((item, idx) => {
                        if (!canAccessView(item.id)) return null;
                        
                        const isActive = currentView === item.id;

                        return (
                            <Tooltip key={idx} title={!open ? item.label : ""} placement="right" disableInteractive>
                                <ListItem disablePadding sx={{ mb: 1 }}>
                                    <ListItemButton 
                                        onClick={() => { item.action(); if (window.innerWidth < 900) setOpen(false); }} 
                                        sx={{ 
                                            borderRadius: 2, 
                                            minHeight: 48, 
                                            justifyContent: open ? 'initial' : 'center', 
                                            px: 2.5,
                                            bgcolor: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                            '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)' } 
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: item.color }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText 
                                            primary={item.label} 
                                            sx={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s' }} 
                                            primaryTypographyProps={{ 
                                                sx: { 
                                                    fontFamily: "'JetBrains Mono', monospace", 
                                                    fontSize: '13px', 
                                                    fontWeight: isActive ? 'bold' : 'normal', 
                                                    color: item.color, 
                                                    whiteSpace: 'nowrap' 
                                                } 
                                            }} 
                                        />
                                    </ListItemButton>
                                </ListItem>
                            </Tooltip>
                        );
                    })}
                </List>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

            <Box sx={{ py: 2 }}>
                <List sx={{ px: 1 }}>
                    {userItems.map((item, idx) => (
                        <Tooltip key={idx} title={!open ? item.label : ""} placement="right" disableInteractive>
                            <ListItem disablePadding sx={{ mb: 1 }}>
                                <ListItemButton onClick={item.action} sx={{ borderRadius: 2, minHeight: 48, justifyContent: open ? 'initial' : 'center', px: 2.5, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                                    <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: item.color }}>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.label} sx={{ opacity: open ? 1 : 0 }} primaryTypographyProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 'bold', color: item.color } }} />
                                </ListItemButton>
                            </ListItem>
                        </Tooltip>
                    ))}
                </List>
            </Box>
        </Paper>
    );
}