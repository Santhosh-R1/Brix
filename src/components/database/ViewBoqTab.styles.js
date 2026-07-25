export const getResizerStyle = () => ({
    display: 'inline-block',
    width: '10px',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    cursor: 'col-resize',
    zIndex: 1,
    backgroundColor: 'transparent',
    transition: 'background-color 0.2s'
});

export const getViewBoqTabStyles = (theme) => ({
    // Main Container
    mainContainer: { width: '100%', overflow: 'hidden' },
    headerTitle: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '16px' },
    subContainer: { width: '100%', mb: 3 },
    
    // Buttons & Actions
    actionButton: { height: 40, px: 3, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    primaryGradientButton: { 
        height: 40, 
        px: 3, 
        borderRadius: 2, 
        fontFamily: "'JetBrains Mono', monospace", 
        fontSize: '11px', 
        background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)', 
        '&:hover': { background: 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)' } 
    },
    
    // Search Fields
    searchCodeField: { flex: 1, minWidth: 150 },
    searchDescField: { flex: 2, minWidth: 250 },
    searchInputProps: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    
    // Category Select
    categorySelect: { flex: 1.5, minWidth: 200 },
    categoryInputLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    
    // Menu Items
    menuItemDefault: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    menuItemAdd: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#8b5cf6', fontWeight: 'bold' },
    menuItemCustom: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', minWidth: '240px' },
    deleteIconBtn: { p: 0.5, ml: 2 },
    
    actionsWrapper: { ml: 'auto' },

    // Table Container
    tableContainer: { overflowX: 'auto', width: '100%', borderRadius: '8px 8px 0 0', border: '1px solid', borderColor: 'divider', borderBottom: 'none', bgcolor: 'rgba(13, 31, 60, 0.5)' },
    table: (totalWidth) => ({ tableLayout: 'fixed', minWidth: '100%', width: totalWidth }),
    tableHead: { bgcolor: 'rgba(0,0,0,0.3)' },
    
    // Header Cells
    headerCellCode: (width) => ({ width, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }),
    headerCellDesc: (width) => ({ width, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }),
    headerCellUnit: (width) => ({ width, position: 'relative', overflow: 'visible', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }),
    headerCellActions: (width) => ({ width, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }),
    
    // Body Cells
    bodyCellCode: { fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    bodyCellDesc: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    bodyCellUnit: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    
    // Body Actions
    editButton: { borderRadius: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    deleteButton: { borderRadius: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    noItemsCell: { py: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'text.secondary' },
    
    // Pagination
    paginationContainer: {
        p: 2,
        bgcolor: 'rgba(13, 31, 60, 0.3)',
        border: '1px solid',
        borderColor: 'divider',
        borderTop: 'none',
        borderRadius: '0 0 8px 8px',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2
    },
    paginationText: { color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 },
    paginationControl: {
        '& .MuiPaginationItem-root': {
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: 'text.secondary',
            '&.Mui-selected': {
                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                '&:hover': {
                    background: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
                }
            }
        }
    },

    // Backdrop overlay
    backdrop: {
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        background: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(10px)',
    },
    successIcon: { fontSize: 60, color: '#00e676' },
    errorIcon: { fontSize: 60, color: '#ff1744' },
    uploadBox: { maxWidth: 400, width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    uploadTitle: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', mb: 1, letterSpacing: '1px' },
    uploadSubtitle: { fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', mb: 2, whiteSpace: 'pre-line' },
    uploadCloseBtn: { mt: 3, borderRadius: 50, px: 5, fontFamily: "'JetBrains Mono', monospace" }
});
