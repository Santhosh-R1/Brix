import { Box, Typography, IconButton, Paper, Drawer, alpha, useTheme } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function InflationDrawer({ open, onClose, resource, formatCurrency }) {
    const theme = useTheme();

    if (!resource) return null;

    const history = (resource.rateHistory || []).sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = history.length > 0 ? history[history.length - 1].rate : 0;
    const oldest = history.length > 0 ? history[0].rate : 0;
    const trend = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { bgcolor: 'background.default', backgroundImage: 'none' } }}
        >
            <Box sx={{ width: { xs: '100vw', sm: 500 }, p: { xs: 2, sm: 4 }, height: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: { xs: '16px', sm: '20px' } }}>MARKET_ANALYTICS</Typography>
                    <IconButton onClick={onClose} color="inherit"><CloseIcon /></IconButton>
                </Box>
                <Typography variant="h5" fontWeight="bold" color="primary.main" sx={{ fontSize: { xs: '18px', sm: '24px' } }}>{resource.description}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>CODE: {resource.code}</Typography>

                <Box display="flex" gap={2} my={4} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Paper elevation={0} sx={{ p: 2, flex: 1, bgcolor: alpha(theme.palette.background.paper, 0.5), border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">LATEST_PRICE</Typography>
                        <Typography variant="h6" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(latest)}</Typography>
                    </Paper>
                    <Paper elevation={0} sx={{ p: 2, flex: 1, bgcolor: alpha(theme.palette.background.paper, 0.5), border: '1px solid', borderColor: trend >= 0 ? alpha(theme.palette.error.main, 0.5) : alpha(theme.palette.success.main, 0.5) }}>
                        <Typography variant="caption" color="text.secondary">MARKET_TREND</Typography>
                        <Box display="flex" alignItems="center" color={trend >= 0 ? 'error.main' : 'success.main'}>
                            {trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            <Typography variant="h6" ml={1} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{Math.abs(trend).toFixed(1)}%</Typography>
                        </Box>
                    </Paper>
                </Box>

                <Box sx={{ height: 300, mt: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: theme.palette.text.secondary }} stroke="none" />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: theme.palette.text.secondary }} stroke="none" />
                            <RechartsTooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: '8px' }} formatter={(val) => formatCurrency(val)} />
                            <Area type="monotone" dataKey="rate" stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>
            </Box>
        </Drawer>
    );
}
