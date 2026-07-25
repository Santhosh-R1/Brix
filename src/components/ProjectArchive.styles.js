export const getProjectArchiveStyles = (theme) => ({
    mainBox: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflowY: 'auto', p: { xs: 2, md: 4 } },
    contentBox: { width: '100%' },
    
    // Header
    headerBox: { mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
    headerTitle: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' },
    createBtn: { fontFamily: "'JetBrains Mono', monospace", borderRadius: 2 },
    
    // Search
    searchField: { mb: 4 },
    searchInputProps: { bgcolor: 'rgba(0,0,0,0.2)', fontFamily: "'JetBrains Mono', monospace" },
    
    // Project Card
    projectPaper: { 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2, 
        border: '1px solid', 
        borderColor: 'divider', 
        bgcolor: 'rgba(13, 31, 60, 0.5)', 
        transition: '0.2s', 
        '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.05)' } 
    },
    projectTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: '15px', fontWeight: 'bold' },
    projectCode: { fontFamily: "'JetBrains Mono', monospace" },
    projectChip: { fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', height: 18 },
    accessBtn: { borderRadius: 50, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' },
    
    // Pagination
    paginationBox: { display: 'flex', justifyContent: 'center', mt: 6 },
    
    // Dialog
    dialogPaper: { bgcolor: '#0d1f3c', border: '1px solid', borderColor: 'divider' },
    dialogTitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' },
    dialogSubtitle: { mb: 3, color: '#ccc', fontSize: '12px' }
});
