import React from 'react';
import { Box, Typography, Grid, Divider, Link, Paper, Chip } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import GavelIcon from '@mui/icons-material/Gavel';
import TerminalIcon from '@mui/icons-material/Terminal';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';

export default function About({ isPopup }) {
    return (
        <Box sx={{ p: { xs: 3, md: isPopup ? 2 : 6 }, maxWidth: 1000, mx: 'auto' }}>
            {/* --- RESPONSIVE HEADER SECTION --- */}
            <Box
                display="flex"
                flexDirection={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                gap={{ xs: 2, md: 0 }}
                mb={4}
            >
                <Box>
                    <Typography variant="h3" fontWeight="900" color="primary.main" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-2px' }}>
                        // OPENPRIX
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                        <Chip label="v2.0.0 RC1" size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", borderRadius: 1 }} />
                        <Chip label="CORE_ENGINE: ACTIVE" size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace", borderRadius: 1 }} />
                    </Box>
                </Box>
                <Link
                    href="https://github.com/gokuldc/OpenPrix"
                    target="_blank"
                    rel="noopener"
                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', transform: 'scale(1.1)' }, transition: 'all 0.2s ease-in-out' }}
                >
                    <GitHubIcon sx={{ fontSize: 32 }} />
                </Link>
            </Box>

            <Typography variant="body1" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', maxWidth: 600, mb: 4, lineHeight: 1.6 }}>
                An advanced construction management suite engineered for precision estimation,
                real-time site execution tracking, and automated supply chain reconciliation.
            </Typography>

            <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.05)' }} />

            {/* --- MODULE CAPABILITIES --- */}
            <Grid container spacing={3} mb={6}>
                {[
                    { icon: <EngineeringIcon color="primary" />, title: "PLANNING", items: ["Master BOQ", "CPM Schedule", "Sub-Bids"] },
                    { icon: <TerminalIcon color="primary" />, title: "EXECUTION", items: ["Daily Logs", "Kanban Board", "M-Book"] },
                    { icon: <HubIcon color="primary" />, title: "SUPPLY_CHAIN", items: ["Live Inventory", "Inflation Tracker", "POs"] },
                    { icon: <SecurityIcon color="primary" />, title: "FINANCIALS", items: ["RA Billing", "Tax Logic", "Risk Analysis"] }
                ].map((mod, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                bgcolor: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 2,
                                transition: '0.2s',
                                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.05)' }
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                {mod.icon}
                                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px' }}>{mod.title}</Typography>
                            </Box>
                            {mod.items.map(item => (
                                <Typography key={item} variant="caption" display="block" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.secondary', mb: 0.5 }}>
                                    • {item}
                                </Typography>
                            ))}
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* --- SYSTEM STACK & LICENSE --- */}
            <Grid container spacing={4}>
                <Grid item xs={12} md={7}>
                    <Typography variant="h6" color="secondary.main" gutterBottom sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 'bold' }}>
                        TECH_STACK_MANIFEST
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={4}>
                                <Typography variant="caption" display="block" color="text.disabled">FRONTEND</Typography>
                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>React 18 / MUI 5</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <Typography variant="caption" display="block" color="text.disabled">RUNTIME</Typography>
                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>Electron / Node.js</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <Typography variant="caption" display="block" color="text.disabled">NETWORK</Typography>
                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>Express / Universal RPC</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <Typography variant="caption" display="block" color="text.disabled">DATABASE</Typography>
                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>SQLite 3 (Native)</Typography>
                            </Grid>
                            <Grid item xs={6} sm={4}>
                                <Typography variant="caption" display="block" color="text.disabled">ANALYTICS</Typography>
                                <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>Recharts Engine</Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <GavelIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                        <Typography variant="h6" color="secondary.main" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 'bold' }}>
                            LEGAL_LICENSE
                        </Typography>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: 2, height: 'calc(100% - 32px)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', lineHeight: 1.6 }}>
                            Licensed under the **MIT Open Source License**.
                            Permission is granted for commercial use, modification, and distribution.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* --- FOOTER --- */}
            <Box mt={8} pb={4} textAlign="center" borderTop="1px solid rgba(255,255,255,0.05)" pt={4}>
                <Typography variant="caption" sx={{ fontFamily: "'JetBrains Mono', monospace", color: 'text.disabled', letterSpacing: '2px' }}>
                    DEVELOPED_BY_GOKUL_DC // (c) 2026
                </Typography>
            </Box>
        </Box>
    );
}