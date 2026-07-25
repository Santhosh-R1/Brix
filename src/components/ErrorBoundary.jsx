import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 3,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 5,
              maxWidth: 500,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'error.main',
              bgcolor: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 2 }}
            >
              Something went wrong
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontFamily: "'JetBrains Mono', monospace", mb: 3 }}
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            <Box display="flex" gap={2} justifyContent="center">
              <Button
                variant="contained"
                onClick={this.handleReset}
                sx={{
                  borderRadius: 2,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '1px',
                }}
              >
                Return to Home
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
                sx={{
                  borderRadius: 2,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '1px',
                }}
              >
                Reload App
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;