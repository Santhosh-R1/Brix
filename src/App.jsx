import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box, Drawer,Dialog , DialogContent } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

// Hooks & Theme
import { getTheme } from './theme/OpenPrixTheme';
import { usePermissions } from './hooks/usePermissions';

// Layout & Common Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import LogoutModal from './components/layout/LogoutModal';
import AccessDenied from './components/common/AccessDenied';
import ProfileDialog from './components/profile/ProfileDialog';
import ErrorBoundary from './components/ErrorBoundary';

// Icons & Pages
import HomeIcon from '@mui/icons-material/Home';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import StorageIcon from '@mui/icons-material/Storage';
import RouterIcon from '@mui/icons-material/Router';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuBookIcon from '@mui/icons-material/MenuBook';

// View Components
import Login from './components/Login';
import Home from './components/Home';
import ProjectWorkspace from './components/ProjectWorkspace';
import DatabaseEditor from './components/DatabaseEditor';
import Directory from './components/Directory';
import ProjectArchive from './components/ProjectArchive';
import DailyLogs from './components/DailyLogs';
import ServerManager from './components/ServerManager';
import CompanySettings from './components/CompanySettings';
import ChatModule from './components/workspace/ChatModule';
import About from './components/About';
import ConnectPortal from './ConnectPortal';

const queryClient = new QueryClient();

export default function App() {
    const isTauri = '__TAURI_INTERNALS__' in window;
    const [isConnected, setIsConnected] = useState(!isTauri);
    const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'dark');
    const theme = useMemo(() => getTheme(mode), [mode]);

    if (!isConnected && isTauri) return <ConnectPortal onConnected={() => setIsConnected(true)} />;

    return (
        <QueryClientProvider client={queryClient}>
            <SettingsProvider>
                <AuthProvider>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <AuthGate mode={mode} setMode={setMode} />
                    </ThemeProvider>
                </AuthProvider>
            </SettingsProvider>
        </QueryClientProvider>
    );
}

function AuthGate({ mode, setMode }) {
    const { currentUser } = useAuth();

    if (!currentUser || !currentUser.role) return <Login />;
    return <AppContent mode={mode} setMode={setMode} />;
}

function AppContent({ mode, setMode }) {
    const { logout } = useAuth();
    const { canAccess, currentUser } = usePermissions();
    
    // UI Navigation State
    const [currentView, setCurrentView] = useState('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeProjectId, setActiveProjectId] = useState(null);

    // Modals State
    const [modalState, setModalState] = useState({ logout: false, profile: false, chat: false, about: false });
    const [profileData, setProfileData] = useState(currentUser);
    const [orgStaff, setOrgStaff] = useState([]); // Added for chat

    const toggleModal = (key, val) => setModalState(prev => ({ ...prev, [key]: val }));

    // 🔥 FIXED: Restored Project Creation Logic
    const handleCreateProject = async () => {
        const newProject = {
            name: "New Project",
            code: "",
            clientName: "",
            region: "",
            status: "Draft",
            assignedStaff: JSON.stringify([currentUser?.id]),
            createdAt: Date.now()
        };

        try {
            const createdId = await window.api.db.addProject(newProject);
            if (createdId && createdId.success !== false) {
                // Set the ID and switch to workspace view
                setActiveProjectId(createdId);
                setCurrentView('workspace');
            } else {
                alert("Failed to create project: " + (createdId?.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Database Bridge Error:", err);
        }
    };

    // 🔥 FIXED: Linked handleCreateProject to the navItems
    const navItems = [
        { id: 'home', label: 'Dashboard', icon: <HomeIcon />, action: () => setCurrentView('home') },
        // { id: 'new_project', label: 'Initiate Project', icon: <CreateNewFolderIcon />, action: handleCreateProject },
        { id: 'archive', label: 'Project', icon: <FolderSpecialIcon />, action: () => setCurrentView('archive') },
        // { id: 'directory', label: 'System Directory', icon: <AutoStoriesIcon />, action: () => setCurrentView('directory') },
        { id: 'database', label: 'Core Database', icon: <StorageIcon />, action: () => setCurrentView('database') },
        // { id: 'logs', label: 'System Logs', icon: <MenuBookIcon />, action: () => setCurrentView('logs') },
        // { id: 'servermanager', label: 'Network Host', icon: <RouterIcon />, action: () => setCurrentView('servermanager'), tauriOnly: true },
        { id: 'settings', label: 'Control Panel', icon: <SettingsIcon />, action: () => setCurrentView('settings') }
    ];

    // Fetch staff for chat (Restored from your initial code)
    useEffect(() => {
        if (window.api?.db?.getOrgStaff) {
            window.api.db.getOrgStaff().then(data => {
                if (data && !data.unauthorized) setOrgStaff(data);
            });
        }
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
            <Navbar 
                mode={mode} 
                onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
                onToggleTheme={() => { const m = mode === 'light' ? 'dark' : 'light'; setMode(m); localStorage.setItem('themeMode', m); }}
                onOpenAbout={() => toggleModal('about', true)}
                onHomeClick={() => setCurrentView('home')}
                onOpenChat={() => toggleModal('chat', true)}
            />

            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
                <Sidebar 
                    open={sidebarOpen} setOpen={setSidebarOpen} 
                    navItems={navItems} currentView={currentView}
                    onProfileOpen={() => { setProfileData(currentUser); toggleModal('profile', true); }}
                    onLogout={() => toggleModal('logout', true)} 
                    canAccessView={canAccess}
                />

                <Box component="main" sx={{ flexGrow: 1, p: currentView === 'workspace' ? 0 : 3, overflowY: 'auto' }}>
                    <ErrorBoundary>
                        {currentView === 'home' && (
                            <Home onOpenProject={(id) => { setActiveProjectId(id); setCurrentView('workspace'); }} />
                        )}
                        
                        {currentView === 'workspace' && (
                            <ProjectWorkspace projectId={activeProjectId} onBack={() => setCurrentView('home')} />
                        )}
                        
                        {/* Access Controlled Views */}
                        {currentView === 'archive' && (canAccess('archive') ? (
                            <ProjectArchive onOpenProject={(id) => { setActiveProjectId(id); setCurrentView('workspace'); }} />
                        ) : <AccessDenied />)}

                        {currentView === 'database' && (canAccess('database') ? <DatabaseEditor /> : <AccessDenied />)}
                        {currentView === 'directory' && (canAccess('directory') ? <Directory /> : <AccessDenied />)}
                        {currentView === 'logs' && (canAccess('logs') ? <DailyLogs /> : <AccessDenied />)}
                        {currentView === 'servermanager' && (canAccess('servermanager') ? <ServerManager /> : <AccessDenied />)}
                        {currentView === 'settings' && (canAccess('settings') ? <CompanySettings /> : <AccessDenied />)}
                    </ErrorBoundary>
                </Box>
            </Box>

            {/* Global Modals */}
            <LogoutModal open={modalState.logout} onClose={() => toggleModal('logout', false)} onConfirm={logout} />
            <ProfileDialog open={modalState.profile} onClose={() => toggleModal('profile', false)} data={profileData} onChange={setProfileData} />
            
            <Drawer anchor="right" open={modalState.chat} onClose={() => toggleModal('chat', false)}>
                <Box sx={{ width: { xs: '100vw', sm: 400 }, height: '100%' }}>
                    <ChatModule projectId={null} orgStaff={orgStaff} onClose={() => toggleModal('chat', false)} />
                </Box>
            </Drawer>

            <Dialog open={modalState.about} onClose={() => toggleModal('about', false)} maxWidth="md" fullWidth>
                <DialogContent sx={{ p: 0 }}><About isPopup={true} onClose={() => toggleModal('about', false)} /></DialogContent>
            </Dialog>
        </Box>
    );
}