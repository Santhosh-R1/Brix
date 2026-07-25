import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Paper, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Tooltip, alpha, useTheme
} from '@mui/material';

import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ChecklistRtlOutlinedIcon from '@mui/icons-material/ChecklistRtlOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

import { useAuth } from '../context/AuthContext';
import WorkLogModule from './operations/WorkLogModule';
import TasksModule from './operations/TasksModule';
import ChannelsModule from './operations/ChannelsModule';

// 🔥 REACT QUERY HOOKS
import { useQueryClient } from '@tanstack/react-query';
import { useWorkLogs, useStaff, useProjects } from '../hooks/useQueries';

export default function DailyLogs() {
    const theme = useTheme();
    const { currentUser, hasClearance } = useAuth();
    const queryClient = useQueryClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // 🔥 AUTOMATIC DATA FETCHING
    const { data: logs = [] } = useWorkLogs();
    const { data: staff = [] } = useStaff();
    const { data: projects = [] } = useProjects();

    const userPerms = useMemo(() => {
        try {
            return typeof currentUser?.globalPermissions === 'string'
                ? JSON.parse(currentUser.globalPermissions)
                : (currentUser?.globalPermissions || []);
        } catch (e) { return []; }
    }, [currentUser]);

    // 🔥 TRANSITIONAL LOADDATA
    const loadData = () => {
        queryClient.invalidateQueries({ queryKey: ['worklogs'] });
        queryClient.invalidateQueries({ queryKey: ['staff'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const PERMITTED_NAV_ITEMS = useMemo(() => {
        const items = [
            { id: "logs", label: "DAILY WORK LOGS", icon: <AssignmentOutlinedIcon />, color: '#f59e0b', minClearance: 4 },
            { id: "tasks", label: "TEAM TASKS", icon: <ChecklistRtlOutlinedIcon />, color: '#3b82f6', minClearance: 1 },
            { id: "channels", label: "CHANNELS", icon: <ForumOutlinedIcon />, color: '#10b981', minClearance: 1 },
        ];
        return items.filter(item => hasClearance(item.minClearance) || userPerms.includes(item.id));
    }, [hasClearance, userPerms]);

    const [activeModule, setActiveModule] = useState(PERMITTED_NAV_ITEMS[0]?.id || "tasks");

    const SIDEBAR_WIDTH = sidebarOpen ? 260 : { xs: 0, md: 68 };

    const getModuleTitle = () => {
        switch (activeModule) {
            case 'logs': return 'OPERATIONS_LOGS';
            case 'tasks': return 'TEAM_TASKS';
            case 'channels': return 'SYSTEM_CHANNELS';
            default: return 'LOCKED_MODULE';
        }
    };

    if (PERMITTED_NAV_ITEMS.length === 0) {
        return <Box p={5} textAlign="center"><Typography sx={{ color: 'error.main', fontFamily: "'JetBrains Mono', monospace" }}>ACCESS_DENIED: No modules permitted.</Typography></Box>;
    }

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
            {sidebarOpen && (
                <Box onClick={() => setSidebarOpen(false)} sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1200 }} />
            )}

            <Paper elevation={0} sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, bgcolor: 'rgba(13, 31, 60, 0.95)', borderRight: '1px solid', borderColor: 'divider', transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: { xs: 'fixed', md: 'relative' }, height: '100%', zIndex: 1300, left: 0, top: 0, visibility: { xs: sidebarOpen ? 'visible' : 'hidden', md: 'visible' } }}>
                <Box sx={{ p: 1, display: 'flex', justifyContent: sidebarOpen ? 'flex-end' : 'center', alignItems: 'center', height: 60 }}>
                    <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} size="small">
                        {sidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
                    </IconButton>
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    <List sx={{ px: 1 }}>
                        {PERMITTED_NAV_ITEMS.map((item) => (
                            <Tooltip key={item.id} title={!sidebarOpen ? item.label : ""} placement="right" arrow>
                                <ListItem disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        onClick={() => { setActiveModule(item.id); if (window.innerWidth < 900) setSidebarOpen(false); }}
                                        selected={activeModule === item.id}
                                        sx={{ minHeight: 44, height: 44, borderRadius: 1.5, justifyContent: sidebarOpen ? 'initial' : 'center', px: 2, '&.Mui-selected': { bgcolor: alpha(item.color, 0.12) } }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 0, mr: sidebarOpen ? 2 : 'auto', color: activeModule === item.id ? item.color : 'text.secondary' }}>{item.icon}</ListItemIcon>
                                        {sidebarOpen && <ListItemText primary={item.label} primaryTypographyProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' } }} />}
                                    </ListItemButton>
                                </ListItem>
                            </Tooltip>
                        ))}
                    </List>
                </Box>
            </Paper>

            <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', p: { xs: 2, md: 4 } }}>
                <Box display="flex" alignItems="center" gap={2} mb={4} pb={2} borderBottom="1px solid" borderColor="divider">
                    <IconButton onClick={() => setSidebarOpen(true)} sx={{ display: { xs: 'flex', md: 'none' }, color: 'text.secondary' }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>
                        {getModuleTitle()}
                    </Typography>
                </Box>

                {activeModule === 'logs' ? (
                    <WorkLogModule logs={logs} staff={staff} projects={projects} currentUser={currentUser} hasClearance={hasClearance} loadData={loadData} />
                ) : activeModule === 'channels' ? (
                    <ChannelsModule currentUser={currentUser} staff={staff} projects={projects} />
                ) : activeModule === 'tasks' ? (
                    <TasksModule currentUser={currentUser} staff={staff} projects={projects} loadData={loadData} />
                ) : (
                    <Typography sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>[LOCKED_MODULE]</Typography>
                )}
            </Box>
        </Box>
    );
}