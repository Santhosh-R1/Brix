import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Tooltip, Box, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import GlobalChatButton from './GlobalChatButton'; 
import '../../styles/Navbar.css';

export default function Navbar({ onMenuToggle, onOpenAbout, onToggleTheme, mode, onHomeClick, globalChatOpen, onOpenChat }) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <AppBar position="relative" elevation={0} className="navbar-root" sx={{ zIndex: 1300 }}>
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 60, sm: 70 } }}>
                
                {/* LEFT SECTION: Menu & Logo */}
                <Box display="flex" alignItems="center">
                    <IconButton 
                        edge="start" 
                        color="inherit" 
                        onClick={onMenuToggle} 
                        className="nav-icon-btn"
                        sx={{ mr: { xs: 1, sm: 2 } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    
                    <Typography 
                        variant={isMobile ? "body1" : "h6"} 
                        onClick={onHomeClick} 
                        className="nav-logo"
                    >
                        {'//'} BRIX
                    </Typography>
                </Box>

                {/* RIGHT SECTION: Status & Controls */}
                <Box display="flex" alignItems="center">
                    
                    {/* System Status - Hidden on small screens via CSS */}
                    <Box className="status-indicator">
                        <div className="pulse-dot"></div>
                        <Typography sx={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#00ff95', letterSpacing: '1px' }}>
                            SYSTEM_READY
                        </Typography>
                    </Box>

                    <GlobalChatButton chatOpen={globalChatOpen} onOpen={onOpenChat} />

                    <Tooltip title="System Information">
                        <IconButton onClick={onOpenAbout} className="nav-icon-btn" sx={{ color: 'text.secondary', ml: 0.5 }}>
                            <InfoOutlinedIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Toggle Interface Mode">
                        <IconButton onClick={onToggleTheme} className="nav-icon-btn" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
}