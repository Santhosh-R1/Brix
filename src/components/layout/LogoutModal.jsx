import React from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    Typography, 
    Box, 
    Fade 
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import '../../styles/LogoutModal.css';

export default function LogoutModal({ open, onClose, onConfirm }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            TransitionComponent={Fade}
            transitionDuration={400}
            PaperProps={{ className: 'logout-dialog-paper' }}
            maxWidth="xs"
            fullWidth
        >
            <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
                <Box display="flex" justifyContent="center" mb={2}>
                    <WarningAmberIcon sx={{ fontSize: 50, color: '#ff5252' }} />
                </Box>
                
                <Typography className="logout-title" variant="h5" gutterBottom>
                    TERMINATE_SESSION?
                </Typography>
                
                <Typography className="logout-message">
                    You are about to disconnect from the secure gateway. All active processes will be suspended.
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
                <Button 
                    variant="outlined" 
                    onClick={onClose} 
                    className="btn-cancel"
                    sx={{ px: 3 }}
                >
                    CANCEL
                </Button>
                <Button 
                    variant="contained" 
                    onClick={onConfirm} 
                    className="btn-confirm"
                    sx={{ px: 3 }}
                >
                    CONFIRM LOGOUT
                </Button>
            </DialogActions>
        </Dialog>
    );
}