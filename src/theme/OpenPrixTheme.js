import { createTheme } from '@mui/material';

export const getTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: { main: '#00f2ff' },
        background: {
            default: mode === 'dark' ? '#060e1a' : '#f4f7f9',
            paper: mode === 'dark' ? '#0d1f3c' : '#ffffff',
        },
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
        h6: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }
    },
    components: {
        MuiButton: { styleOverrides: { root: { borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" } } }
    }
});