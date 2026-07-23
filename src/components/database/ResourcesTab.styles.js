import { alpha } from "@mui/material";

export const getResourcesTabStyles = (theme) => ({
    // Ghost Input
    ghostInput: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        color: 'text.primary',
        width: '100%',
        padding: '2px 8px',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        border: '1px solid transparent',
        '&:hover': {
            bgcolor: alpha(theme.palette.common.white, 0.05),
            borderColor: alpha(theme.palette.common.white, 0.1)
        },
        '&.Mui-focused': {
            bgcolor: alpha(theme.palette.background.default, 0.8),
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`
        }
    },

    // Resource Row
    resourceRow: (index) => ({
        bgcolor: index % 2 === 0 ? 'transparent' : alpha(theme.palette.common.white, 0.01),
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
        '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)' }
    }),
    indexCell: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    codeCell: { fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'primary.light' },
    descCell: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    unitCell: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    actionsBox: { p: '4px 16px' },
    editIcon: { opacity: 0.6, '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.primary.main, 0.1) } },
    chartIcon: { opacity: 0.6, '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.secondary.main, 0.1) } },
    deleteIcon: { opacity: 0.6, '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.error.main, 0.1) } },

    // Register Material Form
    registerButton: {
        height: 40,
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: 'none',
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        borderRadius: 1.5,
        px: 2,
        whiteSpace: 'nowrap',
        background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
        '&:hover': {
            background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
        }
    },

    // Main ResourcesTab Top Controls
    paperCard: {
        p: { xs: 2.5, sm: 3 },
        bgcolor: 'rgba(13, 21, 39, 0.75)',
        border: '1px solid rgba(0, 229, 255, 0.18)',
        borderRadius: 3,
        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        '&:hover': {
            borderColor: 'rgba(0, 229, 255, 0.35)',
            boxShadow: '0 12px 40px rgba(0, 229, 255, 0.12)'
        }
    },
    monoSubtitle: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' },
    uploadButton: {
        height: 40,
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: '0 4px 14px rgba(0, 229, 255, 0.25)',
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '0.8px',
        borderRadius: 2,
        background: 'linear-gradient(90deg, #00e5ff 0%, #0284c7 100%)',
        color: '#0a101d',
        '&:hover': {
            background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
            color: '#fff',
            boxShadow: '0 6px 20px rgba(0, 229, 255, 0.4)'
        },
        '&.Mui-disabled': {
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)'
        }
    },
    actionButton: {
        height: 40,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '0.5px',
        borderRadius: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        color: 'rgba(255, 255, 255, 0.85)',
        '&:hover': {
            borderColor: '#00e5ff',
            bgcolor: 'rgba(0, 229, 255, 0.08)',
            color: '#00e5ff'
        }
    },
    addRegionButton: {
        height: 40,
        px: 3,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '0.5px',
        borderRadius: 2,
        background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
        color: '#fff',
        whiteSpace: 'nowrap',
        '&:hover': {
            background: 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)',
            boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)'
        },
        '&.Mui-disabled': {
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)'
        }
    },

    searchCard: {
        p: { xs: 2.5, sm: 3 },
        mb: 3,
        bgcolor: 'rgba(13, 21, 39, 0.75)',
        border: '1px solid rgba(0, 229, 255, 0.18)',
        borderTop: `3px solid ${theme.palette.primary.main}`,
        borderRadius: 3,
        boxShadow: '0 10px 32px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(16px)'
    },
    sectionTitle: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', color: '#fff' },
    switchControl: {
        '& .MuiFormControlLabel-label': {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.5px'
        }
    },
    divider: { my: 2.5, borderColor: 'rgba(255,255,255,0.08)' },

    // Main ResourcesTab Table
    tableContainer: { border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.2), borderRadius: '8px 8px 0 0', overflowX: 'auto', height: 'auto' },
    table: { minWidth: 1000 },
    tableHead: { bgcolor: alpha(theme.palette.background.paper, 0.9) },
    headerCell: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerCellNo: { width: 40, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerCellCode: { width: 120, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)' },
    headerCellRate: { color: 'primary.main', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' },
    headerCellRight: { width: 80, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)' },

    // Main ResourcesTab Pagination
    paginationContainer: {
        p: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.15),
        border: '1px solid',
        borderColor: 'divider',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 3
    },
    paginationText: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 },
    paginationItem: {
        '& .MuiPaginationItem-root': {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            '&.Mui-selected': {
                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: 'bold',
                boxShadow: `0 2px 8px ${alpha('#2563eb', 0.4)}`,
                '&:hover': {
                    background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
                }
            }
        }
    },

    // Backdrop
    backdrop: {
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(10px)',
    },
    uploadBox: { maxWidth: 400, width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    uploadTitle: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', mb: 1, letterSpacing: '1px' },
    uploadSubtitle: { fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', mb: 2 },
    uploadProgressContainer: { width: '100%', mt: 2 },
    uploadProgressBar: {
        height: 8,
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.1)',
        '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)'
        }
    },
    uploadProgressText: { fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.4)', mt: 1, display: 'block' },
    uploadCloseBtn: { mt: 3, borderRadius: 50, px: 5, fontFamily: "'JetBrains Mono', monospace" }
});

export const getInflationDrawerStyles = (theme, trend) => ({
    drawerBox: { width: { xs: '100vw', sm: 500 }, p: { xs: 2, sm: 4 }, height: '100%' },
    drawerHeader: { fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '16px', sm: '20px' } },
    drawerTitle: { fontSize: { xs: '18px', sm: '24px' } },
    drawerSubtitle: { opacity: 0.6 },
    paper1: { p: 2, flex: 1, bgcolor: alpha(theme.palette.background.paper, 0.5), border: '1px solid', borderColor: 'divider' },
    priceText: { fontFamily: "'JetBrains Mono', monospace" },
    paper2: { p: 2, flex: 1, bgcolor: alpha(theme.palette.background.paper, 0.5), border: '1px solid', borderColor: trend >= 0 ? alpha(theme.palette.error.main, 0.5) : alpha(theme.palette.success.main, 0.5) },
});
