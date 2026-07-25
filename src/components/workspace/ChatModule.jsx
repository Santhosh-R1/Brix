import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, TextField, IconButton, Avatar, Paper,
    Tabs, Tab, List, ListItem, ListItemAvatar, ListItemText, ListItemButton,
    Divider, Menu, MenuItem, Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { useAuth } from '../../context/AuthContext';

export default function ChatModule({ projectId = null, orgStaff = [], onClose }) {
    const { currentUser } = useAuth();
    const dmStaffList = (orgStaff || []).filter(s => s.id !== currentUser?.id);

    const isGlobal = !projectId;

    const [viewMode, setViewMode] = useState(projectId ? 'project' : 'global');
    const [selectedDmUser, setSelectedDmUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    // --- State for Mentions, Attachments & Replies ---
    const [mentionSearch, setMentionSearch] = useState(null);
    const [cursorPos, setCursorPos] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [projectDocs, setProjectDocs] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);

    // State to track which message is currently flashing
    const [highlightedMsgId, setHighlightedMsgId] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    const loadMessages = async () => {
        try {
            let data = [];
            if (viewMode === 'project' || viewMode === 'global') {
                data = await window.api.db.getMessages(projectId);
            } else if (viewMode === 'dm_chat' && selectedDmUser) {
                data = await window.api.db.getPrivateMessages(currentUser.id, selectedDmUser.id);
            }
            setMessages(data || []);
        } catch (error) { console.error("Chat load error:", error); }
    };

    const loadProjectDocs = async () => {
        if (!projectId) return;
        const docs = await window.api.db.getProjectDocuments(projectId);
        setProjectDocs(docs || []);
    };

    useEffect(() => {
        loadMessages();
        loadProjectDocs();
        const interval = setInterval(loadMessages, 4000);
        return () => clearInterval(interval);
    }, [projectId, viewMode, selectedDmUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- DATE FORMATTING UTILS ---
    const isSameDay = (d1, d2) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const formatDateLabel = (ts) => {
        const date = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (isSameDay(date, today)) return "Today";
        if (isSameDay(date, yesterday)) return "Yesterday";
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const scrollToMessage = (msgId) => {
        const element = document.getElementById(`msg-${msgId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 1500);
        }
    };

    // --- LOGIC: Mentions ---
    const handleInputChange = (e) => {
        const val = e.target.value;
        const selectionStart = e.target.selectionStart;
        setInput(val);
        setCursorPos(selectionStart);
        const textBeforeCursor = val.slice(0, selectionStart);
        const parts = textBeforeCursor.split(/\s/);
        const lastWord = parts[parts.length - 1];

        if (lastWord.startsWith('@')) setMentionSearch(lastWord.slice(1).toLowerCase());
        else setMentionSearch(null);
    };

    const handleMentionSelect = (username) => {
        const textBeforeCursor = input.slice(0, cursorPos);
        const textAfterCursor = input.slice(cursorPos);
        const parts = textBeforeCursor.split(/\s/);
        parts.pop();
        const prefix = parts.join(' ');
        setInput((prefix ? prefix + ' ' : '') + `@${username} ` + textAfterCursor);
        setMentionSearch(null);
        inputRef.current?.focus();
    };

    /// --- LOGIC: Attachments & Linking ---
    const handleFileAttach = async (e) => {
        const file = e.target?.files?.[0];

        if (file) {
            // 🔥 Use the new sandboxed Chat Upload API
            const res = await window.api.db.uploadChatAttachment(file);

            if (res && typeof res === 'string') {
                sendSystemMessage(`📎 Attached: ${file.name}`, { type: 'file', path: res, name: file.name });
            } else {
                alert("File upload failed: " + (res?.error || "Unknown error"));
            }
        }

        setAnchorEl(null);
        if (e.target) e.target.value = null;
    };

    const handleLinkExistingDoc = (doc) => {
        sendSystemMessage(`🔗 Linked Drawing: ${doc.name}`, { type: 'doc_link', path: doc.path, name: doc.name });
        setAnchorEl(null);
    };

    // --- LOGIC: Sending & Deleting ---
    const sendSystemMessage = async (text, metadata = null) => {
        const payload = {
            id: crypto.randomUUID(),
            content: metadata ? `__FILE_DATA__${JSON.stringify(metadata)}` : text,
            projectId: projectId,
            senderId: currentUser.id,
            replyToId: replyingTo?.id || null,
            createdAt: Date.now()
        };

        if (viewMode === 'dm_chat') {
            await window.api.db.savePrivateMessage({ ...payload, receiverId: selectedDmUser.id });
        } else {
            await window.api.db.saveMessage(payload);
        }
        setReplyingTo(null);
        loadMessages();
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        await sendSystemMessage(input.trim());
        setInput("");
        setMentionSearch(null);
    };

    const handleDelete = async (msgId) => {
        if (window.confirm("Delete this message permanently?")) {
            try {
                if (viewMode === 'dm_chat') {
                    await window.api.db.deletePrivateMessage(msgId);
                } else {
                    await window.api.db.deleteMessage(msgId);
                }
                setMessages(prev => prev.filter(m => m.id !== msgId));
            } catch (err) {
                console.error("Delete failed", err);
            }
        }
    };

    // --- RENDERING: Context & Content ---
    const renderReplyContext = (replyToId) => {
        if (!replyToId) return null;
        const originalMsg = messages.find(m => m.id === replyToId);

        if (!originalMsg) {
            return (
                <Box sx={{ p: 0.5, px: 1, mb: 0.5, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1, borderLeft: '2px solid rgba(255,255,255,0.2)' }}>
                    <Typography variant="caption" sx={{ fontSize: '9px', fontStyle: 'italic', color: 'text.secondary' }}>Original message deleted</Typography>
                </Box>
            );
        }

        const origSender = orgStaff.find(s => s.id === originalMsg.senderId);
        const isFile = originalMsg.content.startsWith('__FILE_DATA__');

        return (
            <Box
                onClick={() => scrollToMessage(replyToId)}
                sx={{
                    p: 0.5, px: 1, mb: 0.5,
                    bgcolor: 'rgba(0,0,0,0.15)',
                    borderRadius: 1,
                    borderLeft: '2px solid',
                    borderColor: 'primary.main',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.25)' }
                }}
            >
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', color: 'primary.light', fontSize: '9px' }}>{origSender?.name}</Typography>
                <Typography variant="body2" noWrap sx={{ fontSize: '10px', opacity: 0.8, fontFamily: "'JetBrains Mono', monospace" }}>
                    {isFile ? '📎 Attachment' : originalMsg.content}
                </Typography>
            </Box>
        );
    };

    const renderMessageContent = (msg) => {
        if (msg.content.startsWith('__FILE_DATA__')) {
            const file = JSON.parse(msg.content.replace('__FILE_DATA__', ''));
            return (
                <Paper
                    variant="outlined"
                    onClick={() => window.api?.os?.openFile(file.path)}
                    sx={{
                        mt: 0.5, p: 1, display: 'flex', alignItems: 'center', gap: 2,
                        bgcolor: 'rgba(0,0,0,0.3)', cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.1)', borderColor: 'primary.main' }
                    }}
                >
                    <Avatar sx={{ bgcolor: file.type === 'file' ? 'warning.dark' : 'info.dark', width: 28, height: 28 }}>
                        {file.type === 'file' ? <AttachFileIcon sx={{ fontSize: 16 }} /> : <DescriptionIcon sx={{ fontSize: 16 }} />}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', color: 'primary.light', textTransform: 'uppercase', fontSize: '9px' }}>
                            {file.type === 'file' ? 'FILE' : 'PROJECT LINK'}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>{file.name}</Typography>
                    </Box>
                </Paper>
            );
        }

        const parts = msg.content.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const taggedUser = part.slice(1).toLowerCase();
                const isMe = currentUser?.username?.toLowerCase() === taggedUser;
                return (
                    <Box component="span" key={i} sx={{ color: isMe ? 'warning.main' : 'info.light', fontWeight: 'bold', bgcolor: isMe ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', px: 0.5, borderRadius: 0.5 }}>
                        {part}
                    </Box>
                );
            }
            return part;
        });
    };

    let lastDate = null;

    return (
        <Paper sx={{
            display: 'flex',
            flexDirection: 'column',
            // 🔥 FIX: Height is now exactly 100% of the drawer, ensuring the bottom input isn't cut off
            height: isGlobal ? '100%' : { xs: 'calc(100vh - 200px)', md: 'calc(100vh - 280px)' },
            border: isGlobal ? 'none' : '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(13, 31, 60, 0.5)',
            borderRadius: isGlobal ? 0 : 2,
            overflow: 'hidden'
        }}>

            {/* 1. HEADER */}
            <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
                {projectId ? (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold', color: 'primary.main' }}>
                            // PROJECT_COMMLINK
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip label="ENCRYPTED" size="small" sx={{ fontSize: '9px', height: 16, opacity: 0.6 }} />
                            {onClose && (
                                <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    </Box>
                ) : (
                    // 🔥 FIX: Restricted Tabs to calc(100% - 40px) to guarantee the close button never gets pushed off screen
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" sx={{ pr: 1 }}>
                        <Tabs value={viewMode === 'dm_chat' ? 'dm_list' : viewMode} onChange={(e, v) => setViewMode(v)} variant="scrollable" scrollButtons={false} sx={{ flexGrow: 1, minHeight: 48, maxWidth: 'calc(100% - 40px)' }}>
                            <Tab value="global" label="GLOBAL" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', minWidth: 0, px: { xs: 1, sm: 2 } }} />
                            <Tab value="dm_list" label="DIRECT MESSAGES" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', minWidth: 0, px: { xs: 1, sm: 2 } }} />
                        </Tabs>

                        {onClose && (
                            <IconButton onClick={onClose} sx={{ color: 'text.secondary', flexShrink: 0 }}>
                                <CloseIcon />
                            </IconButton>
                        )}
                    </Box>
                )}
            </Box>

            {/* 2. CHAT AREA */}
            {viewMode === 'dm_list' ? (
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                    <List>{dmStaffList.map(user => (
                        <ListItem key={user.id} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton onClick={() => setViewMode('dm_chat') || setSelectedDmUser(user)} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                                <ListItemAvatar><Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>{user.name.charAt(0)}</Avatar></ListItemAvatar>
                                <ListItemText primary={user.name} secondary={user.designation} primaryTypographyProps={{ sx: { fontSize: '13px', fontWeight: 'bold' } }} />
                            </ListItemButton>
                        </ListItem>
                    ))}</List>
                </Box>
            ) : (
                <>
                    {viewMode === 'dm_chat' && (
                        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', bgcolor: 'rgba(59, 130, 246, 0.1)', flexShrink: 0 }}>
                            <IconButton onClick={() => setViewMode('dm_list')}><ArrowBackIcon fontSize="small" /></IconButton>
                            <Typography sx={{ ml: 1, fontSize: '12px', fontWeight: 'bold' }}>DM: {selectedDmUser?.name}</Typography>
                        </Box>
                    )}

                    {/* CHAT MESSAGES CONTAINER */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {messages.map((msg) => {
                            const isMe = msg.senderId === currentUser?.id;
                            const sender = orgStaff.find(s => s.id === msg.senderId);

                            const msgDate = new Date(msg.createdAt);
                            const showDateDivider = !lastDate || !isSameDay(lastDate, msgDate);
                            lastDate = msgDate;

                            const isFlashing = highlightedMsgId === msg.id;

                            return (
                                <React.Fragment key={msg.id}>
                                    {showDateDivider && (
                                        <Divider sx={{ my: 1 }}>
                                            <Chip label={formatDateLabel(msg.createdAt)} size="small" sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', bgcolor: 'rgba(0,0,0,0.4)', color: 'text.secondary' }} />
                                        </Divider>
                                    )}

                                    <Box
                                        id={`msg-${msg.id}`}
                                        sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 1.5, alignItems: 'flex-end' }}
                                    >
                                        {!isMe && <Avatar sx={{ width: 28, height: 28 }}>{sender?.name?.charAt(0)}</Avatar>}

                                        <Box sx={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

                                            {!isMe && viewMode !== 'dm_chat' && (
                                                <Typography variant="caption" sx={{ px: 0.5, pb: 0.5, fontSize: '10px', fontWeight: 'bold', color: 'text.secondary' }}>
                                                    {sender?.name || 'Unknown'}
                                                </Typography>
                                            )}

                                            <Box sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: isFlashing ? 'rgba(59, 130, 246, 0.4)' : (isMe ? 'primary.main' : 'rgba(255,255,255,0.05)'),
                                                color: '#fff',
                                                transition: 'background-color 0.5s ease'
                                            }}>
                                                {renderReplyContext(msg.replyToId)}

                                                <Box sx={{ typography: 'body2', fontFamily: "'Inter', sans-serif" }}>
                                                    {renderMessageContent(msg)}
                                                </Box>
                                            </Box>

                                            {/* ACTION BAR */}
                                            <Box display="flex" gap={0.5} alignItems="center" mt={0.5} sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}>
                                                <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.secondary', px: 1 }}>{formatTime(msg.createdAt)}</Typography>
                                                <IconButton size="small" sx={{ p: 0.2 }} onClick={() => setReplyingTo(msg)}>
                                                    <ReplyIcon sx={{ fontSize: '14px' }} />
                                                </IconButton>
                                                {isMe && (
                                                    <IconButton size="small" sx={{ p: 0.2 }} color="error" onClick={() => handleDelete(msg.id)}>
                                                        <DeleteOutlineIcon sx={{ fontSize: '14px' }} />
                                                    </IconButton>
                                                )}
                                            </Box>

                                        </Box>
                                    </Box>
                                </React.Fragment>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </Box>
                </>
            )}

            {/* 3. INPUT AREA */}
            {viewMode !== 'dm_list' && (
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.3)', position: 'relative', flexShrink: 0 }}>

                    {mentionSearch !== null && (
                        <Paper sx={{ position: 'absolute', bottom: '100%', left: 16, width: 250, maxHeight: 200, overflowY: 'auto', zIndex: 10, border: '1px solid', borderColor: 'primary.main' }}>
                            <List dense>{orgStaff.filter(s => s.username?.toLowerCase().includes(mentionSearch)).map(u => (
                                <ListItemButton key={u.id} onClick={() => handleMentionSelect(u.username)}>
                                    <ListItemText primary={u.name} secondary={`@${u.username}`} />
                                </ListItemButton>
                            ))}</List>
                        </Paper>
                    )}

                    {replyingTo && (
                        <Box sx={{ p: 1, px: 2, mb: 1, bgcolor: 'rgba(0,0,0,0.2)', borderLeft: '3px solid', borderColor: 'primary.main', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', fontSize: '10px' }}>
                                    Replying to {orgStaff.find(s => s.id === replyingTo.senderId)?.name}
                                </Typography>
                                <Typography variant="body2" noWrap sx={{ maxWidth: '90%', fontSize: '11px', color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {replyingTo.content.startsWith('__FILE_DATA__') ? 'Attachment' : replyingTo.content}
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => setReplyingTo(null)}><CloseIcon fontSize="small" /></IconButton>
                        </Box>
                    )}

                    <Box display="flex" gap={1} alignItems="flex-end">
                        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="primary" sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 0.5 }}>
                            <AttachFileIcon fontSize="small" />
                        </IconButton>

                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileAttach} />

                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                            <MenuItem onClick={() => fileInputRef.current.click()} sx={{ gap: 2 }}>
                                <FolderOpenIcon fontSize="small" color="primary" /> Upload New File
                            </MenuItem>
                            {projectId && <Divider />}
                            {projectId && <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', opacity: 0.5 }}>LINK PROJECT DOCS</Typography>}
                            {projectId && projectDocs.slice(0, 5).map(doc => (
                                <MenuItem key={doc.id} onClick={() => handleLinkExistingDoc(doc)} sx={{ gap: 2 }}>
                                    <InsertDriveFileIcon fontSize="small" color="info" /> {doc.name}
                                </MenuItem>
                            ))}
                        </Menu>

                        <TextField
                            fullWidth size="small" inputRef={inputRef}
                            multiline maxRows={4}
                            placeholder="Type message... (@ for staff)"
                            value={input} onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            InputProps={{ sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' } }}
                        />
                        <IconButton color="primary" onClick={handleSend} sx={{ mb: 0.5 }}><SendIcon fontSize="small" /></IconButton>
                    </Box>
                </Box>
            )}
        </Paper>
    );
}