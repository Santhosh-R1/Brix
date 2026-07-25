import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Grid, Paper, Alert } from "@mui/material";

export default function FormulaGuideDialog({ open, onClose }) {

    const CodeBlock = ({ children }) => (
        <Box component="span" sx={{
            fontFamily: "'JetBrains Mono', monospace",
            bgcolor: 'rgba(0,0,0,0.4)',
            px: 1, py: 0.5,
            borderRadius: 1,
            color: '#a5b4fc',
            fontSize: '12px'
        }}>
            {children}
        </Box>
    );

    const SectionHeader = ({ title, color }) => (
        <Typography variant="subtitle2" sx={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 'bold',
            color: color || 'primary.main',
            mt: 3, mb: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        }}>
            {title}
        </Typography>
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.8)' }}>
                FORMULA_ENGINE_DOCUMENTATION
            </DialogTitle>

            <DialogContent sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)', p: 0 }}>
                <Box sx={{ p: 4 }}>
                    <Alert severity="info" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', mb: 3 }}>
                        <strong>TRIGGER:</strong> The engine is activated by starting any input field with the equals sign (<CodeBlock>=</CodeBlock>).
                        If there is no equals sign, the input is treated as a standard static number.
                    </Alert>

                    <SectionHeader title="1. Basic Arithmetic & Math" color="#60a5fa" />
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', mb: 1, color: 'text.secondary' }}>
                            Standard operators: <CodeBlock>+</CodeBlock> <CodeBlock>-</CodeBlock> <CodeBlock>*</CodeBlock> <CodeBlock>/</CodeBlock> <CodeBlock>( )</CodeBlock>
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', mb: 2, color: 'text.secondary' }}>
                            Supported functions: <CodeBlock>round()</CodeBlock> <CodeBlock>ceil()</CodeBlock> <CodeBlock>floor()</CodeBlock> <CodeBlock>abs()</CodeBlock> <CodeBlock>sqrt()</CodeBlock> <CodeBlock>min()</CodeBlock> <CodeBlock>max()</CodeBlock> <CodeBlock>pi</CodeBlock>
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}><Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>• <CodeBlock>= 10 * 2.5 + 4</CodeBlock> ➔ 29</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>• <CodeBlock>= round(10.5)</CodeBlock> ➔ 11</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>• <CodeBlock>= ceil(10.1)</CodeBlock> ➔ 11</Typography></Grid>
                            <Grid item xs={12} sm={6}><Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>• <CodeBlock>= pi * (2 * 2)</CodeBlock> ➔ 12.566</Typography></Grid>
                        </Grid>
                    </Paper>

                    <SectionHeader title="2. Standard BOQ Referencing" color="#34d399" />
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', mb: 2, color: 'text.secondary' }}>
                            Use <CodeBlock>#</CodeBlock> followed by the <strong>Sl.No</strong> to fetch the total calculated quantity of a component located <em>above</em> the current row.
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1.5}>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <CodeBlock>= #1 * 0.05</CodeBlock> ➔ 5% wastage of Sl.No 1's quantity.
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <CodeBlock>= (#1 + #2) * 1.5</CodeBlock> ➔ Adds Sl.No 1 & 2 together, then multiplies by 1.5.
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <CodeBlock>= ceil(#3 / 50)</CodeBlock> ➔ Divides Sl.No 3 by 50 and rounds up to the nearest whole number (e.g., bags of cement).
                            </Typography>
                        </Box>
                    </Paper>

                    <SectionHeader title="3. Measurement Book (MBook) Advanced Referencing" color="#f472b6" />
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', mb: 2, color: 'text.secondary' }}>
                            When inside the Measurement Book, you can pinpoint exact parameters inside other MBook rows using dot notation: <CodeBlock>#SlNo.RowIndex.Property</CodeBlock>
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1.5}>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <CodeBlock>= #1.1.l</CodeBlock> ➔ Grabs the <strong>Length (L)</strong> from Sl.No 1, Measurement Row 1.
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <CodeBlock>= #2.3.no</CodeBlock> ➔ Grabs the <strong>Number (No)</strong> from Sl.No 2, Measurement Row 3.
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <CodeBlock>= #1.1.qty * 2</CodeBlock> ➔ Grabs the final calculated <strong>Quantity</strong> of Sl.No 1, Row 1, and multiplies by 2.
                            </Typography>
                        </Box>
                    </Paper>

                    <SectionHeader title="4. MBook Shorthand (Current Row Memory)" color="#fbbf24" />
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', mb: 2, color: 'text.secondary' }}>
                            MBook rows evaluate from left to right (No ➔ L ➔ B ➔ D). You can instantly reference a parameter you just typed in the <em>same row</em> by typing its letter.
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={1.5}>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <strong>In the Length (L) box:</strong> <CodeBlock>= no * 2</CodeBlock> ➔ Multiplies the 'No' value you just entered by 2.
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                                • <strong>In the Depth (D) box:</strong> <CodeBlock>= (l + b) / 2</CodeBlock> ➔ Calculates the average of the Length and Breadth values of the current row.
                            </Typography>
                        </Box>
                    </Paper>

                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(13, 31, 60, 0.8)' }}>
                <Button
                    onClick={onClose}
                    variant="contained"
                    color="primary"
                    disableElevation
                    sx={{ borderRadius: 2, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px', px: 4 }}
                >
                    CLOSE GUIDE
                </Button>
            </DialogActions>
        </Dialog>
    );
}