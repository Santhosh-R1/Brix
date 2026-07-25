import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, MenuItem, Divider, Chip, Button } from '@mui/material';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

export default function DirectoryFormDialog({ isDialogOpen, setIsDialogOpen, formData, setFormData, editId, tab, handleSave, currentUser, departments }) {
    const isEditingOtherUser = !!editId && formData.id !== currentUser?.id;

    return (
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>{editId ? 'UPDATE_RECORD' : 'INITIALIZE_NEW_RECORD'}</DialogTitle>
            <DialogContent dividers sx={{ bgcolor: 'rgba(13, 31, 60, 0.5)', pt: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}><TextField fullWidth label="LEGAL_NAME" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="EMAIL_ADDRESS" value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="PHONE_NUMBER" value={formData.phone || ""} onChange={e => setFormData({ ...formData, phone: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} /></Grid>

                    {tab === 'crm' ? (
                        <>
                            <Grid item xs={12} md={6}><TextField fullWidth label="COMPANY_ENTITY" value={formData.company || ""} onChange={e => setFormData({ ...formData, company: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} /></Grid>
                            <Grid item xs={12} md={6}>
                                <TextField select fullWidth label="CLASSIFICATION" value={formData.type || ""} onChange={e => setFormData({ ...formData, type: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                                    {['Client', 'Lead', 'Consultant', 'Subcontractor', 'Supplier'].map(opt => <MenuItem key={opt} value={opt} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{opt.toUpperCase()}</MenuItem>)}
                                </TextField>
                            </Grid>
                        </>
                    ) : (
                        <>
                            <Grid item xs={12} md={6}><TextField fullWidth label="OFFICIAL_DESIGNATION" value={formData.designation || ""} onChange={e => setFormData({ ...formData, designation: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} /></Grid>
                            <Grid item xs={12} md={6}>
                                <TextField select fullWidth label="DEPT_ASSIGNMENT" value={formData.department || ""} onChange={e => setFormData({ ...formData, department: e.target.value })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                                    {departments.map(opt => <MenuItem key={opt} value={opt} sx={{ fontFamily: "'JetBrains Mono', monospace" }}>{opt.toUpperCase()}</MenuItem>)}
                                </TextField>
                            </Grid>

                            <Grid item xs={12}>
                                <Divider sx={{ my: 1, borderColor: 'divider' }}>
                                    <Chip icon={<VpnKeyIcon />} label="SYSTEM ACCESS CREDENTIALS" size="small" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'text.secondary' }} />
                                </Divider>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <TextField fullWidth label="USERNAME" value={formData.username || ""} onChange={e => setFormData({ ...formData, username: e.target.value })} disabled={!!editId} helperText={!!editId ? "Usernames cannot be changed." : ""} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField fullWidth type="password" label="PIN / PASSWORD" value={formData.password || ""} onChange={e => setFormData({ ...formData, password: e.target.value })} disabled={isEditingOtherUser} helperText={isEditingOtherUser ? "Only owner edit." : ""} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }} />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField select fullWidth label="SYSTEM CLEARANCE" value={formData.accessLevel || 1} onChange={e => setFormData({ ...formData, accessLevel: Number(e.target.value) })} InputLabelProps={{ sx: { fontFamily: "'JetBrains Mono', monospace" } }} InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}>
                                    <MenuItem value={1}>[ L1 ] Restricted View</MenuItem>
                                    <MenuItem value={2}>[ L2 ] Standard Ops</MenuItem>
                                    <MenuItem value={3}>[ L3 ] Dept Lead</MenuItem>
                                    <MenuItem value={4}>[ L4 ] General Mgmt</MenuItem>
                                    <MenuItem value={5} sx={{ color: 'error.main' }}>[ L5 ] System Root</MenuItem>
                                </TextField>
                            </Grid>
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, bgcolor: 'rgba(13, 31, 60, 0.5)' }}>
                <Button onClick={() => setIsDialogOpen(false)} color="inherit" sx={{ fontFamily: "'JetBrains Mono', monospace" }}>CANCEL</Button>
                <Button variant="contained" color="success" onClick={handleSave} sx={{ fontFamily: "'JetBrains Mono', monospace", borderRadius: 50, px: 3 }}>COMMIT_RECORD</Button>
            </DialogActions>
        </Dialog>
    );
}