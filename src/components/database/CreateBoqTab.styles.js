import { tableInputActiveStyle } from "../../styles";

export const getCreateBoqTabStyles = (theme) => ({
    mainPaper: { p: { xs: 2, md: 4 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' },
    headerTitle: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '16px' },
    cancelEditButton: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    
    // Form Fields
    codeField: { flex: 1, minWidth: 150 },
    descField: { flex: 3, minWidth: 300 },
    unitField: { width: { xs: '100%', sm: 100 } },
    regionField: { width: { xs: '100%', sm: 200 } },
    fieldLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
    fieldInput: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    
    // Alert & Info
    alertBox: { mb: 3 },
    alertText: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' },
    formulaGuideBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' },
    
    // Table
    tableContainer: { border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3, overflowX: 'auto', width: '100%' },
    table: { minWidth: 900 },
    tableHead: { bgcolor: 'rgba(0,0,0,0.3)' },
    headerCell: (width) => ({ width, fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', whiteSpace: 'nowrap' }),
    bodyCellText: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    bodyCellTextBold: { fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    
    // Actions
    addComponentBtn: { mb: 4, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px', width: { xs: '100%', sm: 'auto' } },
    
    // Summary
    summaryPaper: { width: { xs: '100%', sm: 400 }, p: { xs: 2, sm: 3 }, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid', borderColor: 'divider' },
    summaryText: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    summaryTextBold: { fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    summaryTotalLabel: { fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' },
    
    // Buttons
    saveAsNewBtn: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' },
    saveBtn: { borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '13px' }
});

export const getNativeStyles = () => ({
    selectActive: { ...tableInputActiveStyle, width: '100%', backgroundColor: '#0d1f3c', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', outline: 'none' },
    optionActive: { backgroundColor: '#0d1f3c', color: '#fff' },
    inputActive: { ...tableInputActiveStyle, width: '100%' },
    ohProfitInput: { ...tableInputActiveStyle, width: 60 }
});
