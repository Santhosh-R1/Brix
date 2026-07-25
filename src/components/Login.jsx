import React, { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, Alert, CircularProgress, Fade } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css'; // Import the external CSS

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(username, password);

        if (!success) {
            setError('ACCESS DENIED: INVALID CREDENTIALS');
            setLoading(false);
        }
    };

    return (
        <Box className="login-page">
            <Fade in={true} timeout={1000}>
                <Paper elevation={0} className="login-card" sx={{ p: 5, width: 420 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
                        <ShieldIcon sx={{ color: '#00f2ff', fontSize: 40, mb: 1, filter: 'drop-shadow(0 0 8px rgba(0,242,255,0.4))' }} />
                        <Typography variant="h5" className="brand-logo" sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#00f2ff', fontWeight: 800 }}>
                            BRIX
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", color: '#64ffda', mt: 1, opacity: 0.7 }}>
                            VERIFYING SYSTEM IDENTITY...
                        </Typography>
                    </Box>

                    {error && (
                        <Alert 
                            severity="error" 
                            variant="outlined"
                            sx={{ 
                                mb: 3, 
                                borderRadius: 0, 
                                color: '#ff5252', 
                                borderColor: '#ff5252',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: '11px'
                            }}
                        >
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleLogin}>
                        <Box display="flex" flexDirection="column" gap={3}>
                            <TextField
                               label="USER IDENTIFIER"
            className="custom-textfield"
            variant="outlined"
            fullWidth
            disabled={loading}
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="one-time-code" 
            inputProps={{ autoComplete: 'one-time-code' }}
            autoFocus
                            />
                            <TextField
                                 label="SECURITY PIN"
            type="password"
            className="custom-textfield"
            variant="outlined"
            fullWidth
            disabled={loading}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            inputProps={{ autoComplete: 'new-password' }}
                            />
                            
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                className="auth-button"
                                fullWidth
                                disabled={loading}
                                disableElevation
                                sx={{ mt: 2, py: 1.8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '2px' }}
                            >
                                {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : "INITIALIZE LOGIN"}
                            </Button>
                        </Box>
                    </form>

                    <Typography className="footer-text">
                        ENCRYPTED END-TO-END SESSION &bull; PORT: 443
                    </Typography>
                </Paper>
            </Fade>
        </Box>
    );
}