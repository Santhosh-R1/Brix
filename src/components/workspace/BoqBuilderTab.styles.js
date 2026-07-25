export const getBoqBuilderTabStyles = (theme) => ({
    // BoqAddForm
    addModeBtnsBox: { display: "flex", flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 },
    modeBtn: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    formPaper: { p: { xs: 2, sm: 3 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 },
    searchCodeInput: { flex: 1 },
    searchDescInput: { flex: 1.5 },
    searchInputProps: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    searchLabelProps: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    selectCategory: { flex: 1.2 },
    selectMenuItem: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    selectMasterBoqItem: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', whiteSpace: 'normal' },
    addBtn: { height: 40, flexShrink: 0, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', width: { xs: '100%', sm: 'auto' } },
    customCodeInput: { flex: 1 },
    customDescInput: { flex: 3 },

    // BoqTableRow
    rowDraggable: (snapshot, item) => ({
        bgcolor: snapshot.isDragging ? '#1a2e4c' : (item.isCustom ? 'rgba(34, 211, 238, 0.03)' : 'inherit'),
        boxShadow: snapshot.isDragging ? '0 15px 30px rgba(0,0,0,0.8)' : 'none',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
    }),
    dragHandleCell: { width: 40, p: 0, textAlign: 'center' },
    slNoCell: { width: 60, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    codeCell: (item) => ({ width: 100, fontWeight: 'bold', color: item.isCustom ? 'secondary.main' : 'inherit', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }),
    descCell: { minWidth: 250, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    qtyCellBox: { width: 160 },
    unitCell: { width: 80, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    rateCell: { width: 120, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    amountCell: { width: 140, fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    actionCell: { width: 100 },

    // BoqBuilderTab
    mainPaper: { p: { xs: 2, sm: 3 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' },
    alertBox: { mb: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    tableContainer: { border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' },
    table: { minWidth: 1000, tableLayout: 'fixed' },
    tableHead: { bgcolor: 'rgba(0,0,0,0.3)' },
    thCell: (width) => ({ width, fontFamily: "'JetBrains Mono', monospace" }),
    thCellAuto: { fontFamily: "'JetBrains Mono', monospace" },
    phaseRow: { bgcolor: 'rgba(59, 130, 246, 0.1)' },
    phaseCell: { py: 1.5, borderBottom: '1px solid rgba(59, 130, 246, 0.3)' },
    phaseTitle: { fontFamily: "'JetBrains Mono', monospace" },
    totalRow: { bgcolor: 'rgba(0,0,0,0.2)' },
    totalLabel: { fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" },
    totalAmount: { fontWeight: 'bold', color: 'success.main', fontFamily: "'JetBrains Mono', monospace" }
});

export const getNativeStyles = (item, tableInputStyle) => ({
    qtyInputNative: { 
        ...tableInputStyle, 
        width: '100%', 
        background: item.hasMBook ? "var(--mui-palette-action-disabledBackground)" : tableInputStyle.background 
    }
});
