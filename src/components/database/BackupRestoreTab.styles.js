export const getBackupRestoreTabStyles = (theme) => ({
    mainBox: { maxWidth: 800, mx: "auto", mt: 4 },
    alertBox: { mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' },
    
    // Backup Card
    backupPaper: { p: 4, textAlign: 'center', height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' },
    backupIcon: { fontSize: 48, color: 'primary.main', mb: 2 },
    cardTitle: { fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '14px' },
    backupBtn: { mt: 2, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' },
    
    // Restore Card
    restorePaper: { p: 4, textAlign: 'center', height: '100%', borderStyle: 'dashed', borderColor: 'error.main', borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.03)' },
    restoreIcon: { fontSize: 48, color: 'error.main', mb: 2 },
    restoreBtn: { mt: 2, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' },
    
    // Purge Card
    purgePaper: { p: 4, textAlign: 'center', borderStyle: 'solid', borderColor: 'error.main', borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.05)' },
    purgeIcon: { fontSize: 48, color: 'error.main', mb: 2 },
    purgeBtn: { mt: 2, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px', fontWeight: 'bold' },
    
    // Restore Dialog
    dialogPaper: { bgcolor: '#0d1f3c', border: '1px solid', borderColor: 'divider', minWidth: '400px' },
    dialogTitle: { fontFamily: "'JetBrains Mono', monospace", color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '14px' },
    dialogContent: { pt: 3 },
    dialogSubtitle: { fontFamily: "'JetBrains Mono', monospace", mb: 3, color: '#ccc', fontSize: '12px' },
    restoreOptionBtn: { fontFamily: "'JetBrains Mono', monospace", justifyContent: 'flex-start', textTransform: 'none', py: 1.5, fontSize: '12px', textAlign: 'left' },
    dialogActions: { borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 },
    cancelBtn: { fontFamily: "'JetBrains Mono', monospace", color: '#ccc', fontSize: '12px' },
    
    // Status Dialog
    statusDialogPaper: { bgcolor: '#0d1f3c', border: '1px solid', borderColor: 'divider', minWidth: '350px' },
    statusDialogTitle: { fontFamily: "'JetBrains Mono', monospace", color: '#fff', fontSize: '14px' },
    statusDialogText: { fontFamily: "'JetBrains Mono', monospace", color: '#ccc', fontSize: '13px', whiteSpace: 'pre-wrap' },
    okBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }
});
