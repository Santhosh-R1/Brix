import React from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Typography, Box 
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export default function ConfirmDeleteProjectModal({ open, onClose, onConfirm, projectName, projectCode }) {
    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#1e293b', 
                    backgroundImage: 'none',
                    color: 'white',
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                    minWidth: '400px'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                <WarningAmberRoundedIcon sx={{ color: '#ef4444', fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                    CRITICAL_WARNING
                </Typography>
            </DialogTitle>
            
            <DialogContent>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                    Are you absolutely sure you want to delete this project? 
                    This action is <strong>irreversible</strong> and will permanently destroy all associated data.
                </Typography>
                {projectName && (
                    <Box sx={{ 
                        p: 1.5, 
                        bgcolor: 'rgba(239, 68, 68, 0.1)', 
                        borderRadius: 1,
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        <Typography variant="body2" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                            {projectName}
                        </Typography>
                        {projectCode && (
                            <Typography variant="caption" sx={{ color: '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>
                                {projectCode}
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 0, mt: 1 }}>
                <Button 
                    onClick={onClose} 
                    sx={{ color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}
                >
                    CANCEL
                </Button>
                <Button 
                    onClick={onConfirm} 
                    variant="contained" 
                    disableElevation
                    sx={{ 
                        bgcolor: '#ef4444', 
                        '&:hover': { bgcolor: '#dc2626' },
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 'bold',
                        px: 3
                    }}
                >
                    CONFIRM DELETE
                </Button>
            </DialogActions>
        </Dialog>
    );
}
