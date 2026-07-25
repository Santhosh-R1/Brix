import { useRef } from "react";
import { Box, Paper, Typography, Button, Grid, Alert } from "@mui/material";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

export default function BackupTab({
    exportDatabase,
    importDatabase,
    handleFileSelect,
    handlePurgeDatabase,
    fileInputRef
}) {
    return (
        <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
            <Alert severity="info" sx={{ mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                <strong>MASTER_TEMPLATE_DATA</strong> — Regions, Resources, and Databook Items.
                Client projects are exported/imported from the Home screen.
            </Alert>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: 'center', height: '100%', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                        <CloudDownloadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" gutterBottom sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '14px' }}>EXPORT_DB</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>Download master database as template.</Typography>
                        <Button
                            variant="contained"
                            disableElevation
                            size="large"
                            onClick={exportDatabase}
                            sx={{ mt: 2, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}
                        >
                            DOWNLOAD
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: 'center', height: '100%', borderStyle: 'dashed', borderColor: 'error.main', borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.03)' }}>
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                        <Typography variant="h6" color="error.main" gutterBottom sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '14px' }}>RESTORE_DB</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>Upload Master DB file and process records.</Typography>
                        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                        <Button
                            variant="outlined"
                            color="error"
                            size="large"
                            onClick={() => fileInputRef.current.click()}
                            sx={{ mt: 2, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}
                        >
                            UPLOAD
                        </Button>
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'solid', borderColor: 'error.main', borderRadius: 2, bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                        <DeleteForeverIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
                        <Typography variant="h6" color="error.main" gutterBottom sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '14px' }}>PURGE_MASTER_DATABASE</Typography>
                        <Typography variant="body2" color="error.light" paragraph>
                            <strong>DANGER:</strong> Erase all Databook items, LMR Rates, and Resources. This cannot be undone.
                        </Typography>
                        <Button
                            variant="contained"
                            color="error"
                            size="large"
                            onClick={handlePurgeDatabase}
                            sx={{ mt: 2, borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', fontSize: '12px' }}
                        >
                            PURGE_ALL_DATA
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}