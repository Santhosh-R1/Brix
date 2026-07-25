import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function DatabaseDialog({ open, onClose, title, message, severity = "info" }) {
    
    const getIcon = () => {
        switch (severity) {
            case "error":
                return <ErrorOutlineIcon sx={{ fontSize: 32, color: '#ef4444' }} />;
            case "success":
                return <CheckCircleOutlineIcon sx={{ fontSize: 32, color: '#10b981' }} />;
            case "warning":
            default:
                return <WarningAmberIcon sx={{ fontSize: 32, color: '#f59e0b' }} />;
        }
    };

    const getHeaderColor = () => {
        switch (severity) {
            case "error":
                return '#ef4444';
            case "success":
                return '#10b981';
            case "warning":
            default:
                return '#f59e0b';
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0a1424',
                    border: `1px solid ${getHeaderColor()}`,
                    borderRadius: 3,
                    minWidth: '380px',
                    boxShadow: `0 0 20px rgba(${severity === "error" ? "239, 68, 68" : severity === "success" ? "16, 185, 129" : "245, 158, 11"}, 0.25)`,
                    p: 1
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: getHeaderColor(), fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', fontSize: '15px' }}>
                {getIcon()}
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography sx={{ fontFamily: "'Inter', sans-serif", color: '#a0aec0', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button 
                    variant="contained" 
                    onClick={onClose}
                    sx={{ 
                        fontFamily: "'JetBrains Mono', monospace", 
                        fontSize: '12px', 
                        bgcolor: getHeaderColor(),
                        color: '#000',
                        fontWeight: 'bold',
                        '&:hover': { 
                            bgcolor: getHeaderColor(), 
                            opacity: 0.9 
                        } 
                    }}
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
