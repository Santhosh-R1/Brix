import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, Tooltip, IconButton, Grid } from '@mui/material';
import RouterIcon from '@mui/icons-material/Router';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SpeedIcon from '@mui/icons-material/Speed';

export default function ServerManager() {
    const [serverUrl, setServerUrl] = useState('');
    const [logs, setLogs] = useState([]);
    const logEndRef = useRef(null);

    // 🔥 UPGRADED TELEMETRY STATE: Tracks both Ping and Bandwidth simultaneously
    const [telemetry, setTelemetry] = useState(Array(40).fill({ ping: 20, bandwidth: 0 }));

    useEffect(() => {
        const currentServer = localStorage.getItem('openprix_last_server') || 'UNKNOWN DAEMON';
        setServerUrl(currentServer);

        setLogs([
            { time: new Date().toLocaleTimeString(), type: 'info', msg: 'Initialized Network Manager module.' },
            { time: new Date().toLocaleTimeString(), type: 'success', msg: `Successfully bound to daemon at ${currentServer}` },
            { time: new Date().toLocaleTimeString(), type: 'info', msg: 'Listening for IPC/REST traffic...' }
        ]);
    }, []);

    // 🔥 DUAL-DATA ENGINE: Simulates organic network bursts and latency
    useEffect(() => {
        const interval = setInterval(() => {
            setTelemetry(prev => {
                const next = [...prev];
                next.shift();

                const last = next[next.length - 1];

                // Ping: Slight random walk (15ms - 60ms)
                const nextPing = Math.max(15, Math.min(60, last.ping + (Math.random() - 0.5) * 10));

                // Bandwidth: Target-seeking bursts to simulate actual file chunk downloads
                const isBursting = Math.random() > 0.85;
                const targetBw = isBursting ? (Math.random() * 400 + 100) : (last.bandwidth * 0.8);
                // Move smoothly towards the target to create curves
                let nextBw = last.bandwidth + (targetBw - last.bandwidth) * 0.3 + (Math.random() - 0.5) * 10;
                nextBw = Math.max(0, nextBw); // Never drop below 0 Mbps

                next.push({ ping: nextPing, bandwidth: nextBw });
                return next;
            });
        }, 800);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleDisconnect = () => {
        if (window.confirm("Are you sure you want to sever the connection to this Daemon? You will be returned to the Network Portal.")) {
            localStorage.removeItem('openprix_last_server');
            window.location.reload();
        }
    };

    const clearLogs = () => setLogs([]);

    // --- STEAM-STYLE SVG RENDERER ---
    const latestData = telemetry[telemetry.length - 1];
    const currentPing = Math.round(latestData.ping);
    const currentBw = latestData.bandwidth;

    // Auto-scaling: Graph ceiling dynamically raises during massive traffic spikes
    const absoluteTopBw = Math.max(...telemetry.map(t => t.bandwidth));
    const graphCeiling = Math.max(100, absoluteTopBw * 1.15); // Add 15% headroom above the highest peak

    const graphWidth = 600;
    const graphHeight = 120;
    const dataPoints = telemetry.length;
    const barWidth = (graphWidth / dataPoints) - 3; // Leaves a sleek 3px gap between bars

    // Generates the crisp line connecting the peaks of the bars
    const createLinePath = () => {
        return telemetry.map((t, i) => {
            // Position the line at the horizontal center of each bar
            const x = (i * (graphWidth / dataPoints)) + (barWidth / 2);
            const y = graphHeight - ((t.bandwidth / graphCeiling) * graphHeight);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    };

    return (
        <Box sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <RouterIcon color="info" /> NETWORK_HOST_MANAGER
            </Typography>

            {/* Connection Status Panel */}
            <Paper sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        CURRENT ACTIVE DAEMON
                    </Typography>
                    <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'primary.main', fontWeight: 'bold' }}>
                        {serverUrl}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="error"
                    startIcon={<PowerOffIcon />}
                    onClick={handleDisconnect}
                    sx={{ fontFamily: "'JetBrains Mono', monospace", borderRadius: 2, px: 3 }}
                >
                    SEVER CONNECTION
                </Button>
            </Paper>

            {/* 🔥 THE STEAM-STYLE TELEMETRY DASHBOARD */}
            <Paper sx={{ mb: 3, border: '1px solid', borderColor: 'divider', bgcolor: '#091324', overflow: 'hidden' }}>

                {/* Metric Readouts */}
                <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SpeedIcon fontSize="small" sx={{ color: '#22d3ee' }} /> DATA_STREAM_TELEMETRY
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 4 }}>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>NETWORK PING</Typography>
                            <Typography variant="body1" sx={{ color: currentPing > 80 ? '#ef4444' : '#22c55e', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                                {currentPing} ms
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>TOP BANDWIDTH</Typography>
                            <Typography variant="body1" sx={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                                {absoluteTopBw.toFixed(1)} Mbps
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" sx={{ color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>CURRENT BANDWIDTH</Typography>
                            <Typography variant="body1" sx={{ color: '#22d3ee', fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>
                                {currentBw.toFixed(1)} Mbps
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Dual-Layer SVG Graph */}
                <Box sx={{ width: '100%', height: '140px', p: 2, pt: 3 }}>
                    <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }} preserveAspectRatio="none">

                        {/* Layer 1: The Volume Bar Chart */}
                        {telemetry.map((t, i) => {
                            const barH = (t.bandwidth / graphCeiling) * graphHeight;
                            const x = i * (graphWidth / dataPoints);
                            const y = graphHeight - barH;
                            return (
                                <rect
                                    key={i}
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(barH, 1)} // Ensures at least a 1px sliver is visible even at 0 Mbps
                                    fill="rgba(34, 211, 238, 0.15)"
                                    rx="1" // Slight rounding on the bars
                                />
                            );
                        })}

                        {/* Layer 2: The Velocity Line Graph */}
                        <path
                            d={createLinePath()}
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0px 2px 4px rgba(34,211,238,0.3))' }} // Subtle glow
                        />

                        {/* The ugly ellipse has been explicitly removed! */}
                    </svg>
                </Box>
            </Paper>

            {/* Terminal Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary' }}>
                    LIVE_TRAFFIC_LOGS
                </Typography>
                <Tooltip title="Clear Logs">
                    <IconButton size="small" onClick={clearLogs} sx={{ color: 'text.secondary' }}>
                        <DeleteSweepIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Terminal Window */}
            <Paper sx={{
                flexGrow: 1,
                bgcolor: '#050b14',
                p: 2,
                borderRadius: 2,
                overflowY: 'auto',
                border: '1px solid #1e3a5f',
                fontFamily: "'JetBrains Mono', monospace",
                minHeight: '200px'
            }}>
                {logs.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#475569', fontStyle: 'italic' }}>No traffic logs to display.</Typography>
                ) : (
                    logs.map((log, idx) => (
                        <Box key={idx} sx={{ mb: 1, display: 'flex', gap: 2, fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>[{log.time}]</span>
                            <span style={{
                                color: log.type === 'error' ? '#ef4444' :
                                    log.type === 'success' ? '#22c55e' : '#3b82f6',
                                minWidth: '75px'
                            }}>
                                [{log.type.toUpperCase()}]
                            </span>
                            <span style={{ color: '#e2e8f0' }}>{log.msg}</span>
                        </Box>
                    ))
                )}
                <div ref={logEndRef} />
            </Paper>
        </Box>
    );
}