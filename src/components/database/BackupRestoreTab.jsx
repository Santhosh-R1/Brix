import { useState } from "react";
import { Box, Button, Typography, Paper, Grid, Alert, Dialog, DialogTitle, DialogContent, DialogActions, useTheme } from "@mui/material";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import NukeDatabaseModal from "./NukeDatabaseModal";
import { getBackupRestoreTabStyles } from "./BackupRestoreTab.styles";

export default function BackupRestoreTab({ loadData }) {
    const theme = useTheme();
    const styles = getBackupRestoreTabStyles(theme);
    const [isRestoreOpen, setIsRestoreOpen] = useState(false);
    
    // Dialog states for replacing alert/confirm
    const [statusModal, setStatusModal] = useState({ open: false, title: "", message: "", reload: false });
    const [nukeModalOpen, setNukeModalOpen] = useState(false);

    const showMessage = (title, message, reload = false) => {
        setStatusModal({ open: true, title, message, reload });
    };

    const handleBackup = async () => {
        try {
            const res = await window.api.db.backupDatabase();

            if (res && res.success === false) {
                showMessage("Backup Failed", "Backup failed: " + res.error);
                return;
            }

            const dateStr = new Date().toISOString().split('T')[0];
            const link = document.createElement('a');
            link.href = `data:application/octet-stream;base64,${res}`;
            link.download = `OpenPrix_Master_Backup_${dateStr}.backup`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showMessage("Backup Success", "Database backup downloaded successfully!");
        } catch (e) {
            showMessage("Backup Error", "Backup error: " + e.message);
        }
    };

    const handleExportTrainingData = async () => {
        try {
            const pythonApi = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000';
            const res = await fetch(`${pythonApi}/api/ml/export-training-data`);
            
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "market_training_data.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            showMessage("Export Error", "Export error: " + e.message);
        }
    };

    const handleRestore = async (mode) => {
        setIsRestoreOpen(false);

        if (mode !== 'replace') {
            showMessage("Information", "Note: The current Rust engine only supports FULL REPLACE for database restorations.");
        }

        try {
            const fileResult = await window.api.os.pickFile(".backup");
            if (!fileResult) return;

            let base64Data = "";

            if (typeof fileResult === 'object' && fileResult.base64) {
                base64Data = fileResult.base64;
            }
            else if (typeof fileResult === 'string') {
                const b64Str = await window.api.os.getBase64(fileResult);
                if (!b64Str) throw new Error("Could not read the selected file.");
                base64Data = b64Str.split(',')[1];
            }

            if (!base64Data) throw new Error("No valid file data could be extracted.");

            const res = await window.api.db.restoreDatabase(base64Data);

            if (typeof res === 'string') {
                showMessage("DATABASE RESTORED", res + "\n\nThe application will now close. Please restart the OpenPrix Daemon and Client.", true);
            } else if (res && res.success === false) {
                showMessage("Restore Failed", "Restore failed: " + res.error);
            }
        } catch (e) {
            showMessage("Restore Error", "Restore error: " + e.message);
        }
    };

    const handlePurge = async () => {
        const res = await window.api.db.purgeDatabase?.();
        if (res && res.success === false) {
            throw new Error(res.error || "Failed to purge database");
        }
        loadData();
    };

    return (
        <Box sx={styles.mainBox}>
            <Alert severity="info" sx={styles.alertBox}>
                <strong>MASTER_DATABASE_FILE (.backup)</strong> — Regions, Resources, Databook Items, and Projects.
                This handles your entire core database. Store this file securely as a backup!
            </Alert>
            <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} variant="outlined" sx={styles.backupPaper}>
                        <CloudDownloadIcon sx={styles.backupIcon} />
                        <Typography variant="h6" gutterBottom sx={styles.cardTitle}>EXPORT_DB</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>Create a safe .sqlite copy of your active database.</Typography>
                        <Button variant="contained" disableElevation size="large" onClick={handleBackup} sx={styles.backupBtn}>
                            CREATE BACKUP
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} variant="outlined" sx={styles.restorePaper}>
                        <CloudUploadIcon sx={styles.restoreIcon} />
                        <Typography variant="h6" color="error.main" gutterBottom sx={styles.cardTitle}>RESTORE_DB</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>Select a backup .sqlite file to import Master Data.</Typography>
                        <Button variant="outlined" color="error" size="large" onClick={() => setIsRestoreOpen(true)} sx={styles.restoreBtn}>
                            RESTORE MASTER DATA
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} variant="outlined" sx={{...styles.backupPaper, borderColor: 'primary.light', bgcolor: 'rgba(13, 31, 60, 0.3)'}}>
                        <CloudDownloadIcon sx={{...styles.backupIcon, color: 'primary.light'}} />
                        <Typography variant="h6" gutterBottom sx={styles.cardTitle}>EXPORT_ML_DATA</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>Download the raw market training dataset (CSV).</Typography>
                        <Button variant="outlined" color="primary" disableElevation size="large" onClick={handleExportTrainingData} sx={styles.backupBtn}>
                            DOWNLOAD CSV
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={0} variant="outlined" sx={styles.purgePaper}>
                        <DeleteForeverIcon sx={styles.purgeIcon} />
                        <Typography variant="h6" color="error.main" gutterBottom sx={styles.cardTitle}>PURGE_MASTER_DATABASE</Typography>
                        <Typography variant="body2" color="error.light" paragraph>
                            <strong>DANGER:</strong> Erase all Databook items, LMR Rates, and Resources. This cannot be undone.
                        </Typography>
                        <Button variant="contained" color="error" size="large" onClick={() => setNukeModalOpen(true)} sx={styles.purgeBtn}>
                            NUKE DATABASE
                        </Button>
                    </Paper>
                </Grid>
            </Grid>

            {/* RESTORE DIALOG */}
            <Dialog open={isRestoreOpen} onClose={() => setIsRestoreOpen(false)} PaperProps={{ sx: styles.dialogPaper }}>
                <DialogTitle sx={styles.dialogTitle}>
                    MASTER DATA RESTORE RESOLUTION
                </DialogTitle>
                <DialogContent sx={styles.dialogContent}>
                    <Typography sx={styles.dialogSubtitle}>
                        How would you like to process the Master Data from this backup file?
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Button variant="outlined" color="info" onClick={() => handleRestore('append')} sx={styles.restoreOptionBtn}>
                            <strong>[APPEND]</strong>&nbsp;&nbsp;Add newly discovered items only. Existing items are strictly preserved.
                        </Button>
                        <Button variant="outlined" color="warning" onClick={() => handleRestore('merge')} sx={styles.restoreOptionBtn}>
                            <strong>[MERGE]</strong>&nbsp;&nbsp;&nbsp;Update existing items with backup data, and add new ones.
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => handleRestore('replace')} sx={styles.restoreOptionBtn}>
                            <strong>[REPLACE]</strong>&nbsp;Wipe current master data entirely and use backup data.
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={styles.dialogActions}>
                    <Button onClick={() => setIsRestoreOpen(false)} sx={styles.cancelBtn}>CANCEL</Button>
                </DialogActions>
            </Dialog>

            {/* PROFESSIONAL NUKE DATABASE MODAL */}
            <NukeDatabaseModal
                open={nukeModalOpen}
                onClose={() => setNukeModalOpen(false)}
                onConfirm={handlePurge}
            />

            {/* STATUS / INFO / ERROR DIALOG */}
            <Dialog open={statusModal.open} onClose={() => { setStatusModal(prev => ({ ...prev, open: false })); if (statusModal.reload) loadData(); }} PaperProps={{ sx: styles.statusDialogPaper }}>
                <DialogTitle sx={styles.statusDialogTitle}>
                    {statusModal.title}
                </DialogTitle>
                <DialogContent>
                    <Typography sx={styles.statusDialogText}>
                        {statusModal.message}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setStatusModal(prev => ({ ...prev, open: false })); if (statusModal.reload) loadData(); }} sx={styles.okBtn}>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}