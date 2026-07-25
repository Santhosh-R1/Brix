import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  alpha,
  useTheme,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Checkbox,
  FormControlLabel,
  Collapse,
} from "@mui/material";

// Icons
import SendIcon from "@mui/icons-material/Send";
import ReplyIcon from "@mui/icons-material/Reply";
import ForumIcon from "@mui/icons-material/Forum";
import TagIcon from "@mui/icons-material/Tag";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import AddBoxIcon from "@mui/icons-material/AddBox";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MenuIcon from "@mui/icons-material/Menu";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PersonIcon from "@mui/icons-material/Person";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

export default function ChannelsModule({ currentUser, staff, projects }) {
  const theme = useTheme();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // --- STATE ---
  const [activeChannel, setActiveChannel] = useState("global");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);

  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  // Collapsible Categories State
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  // Custom Channels
  const [customChannels, setCustomChannels] = useState([]);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  // Manage Custom Channel Members State
  const [manageChannelOpen, setManageChannelOpen] = useState(false);
  const [managingChannel, setManagingChannel] = useState(null);

  // Mentions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  // --- INITIALIZATION ---
  useEffect(() => {
    const loadCustomChannels = async () => {
      const stored = await window.api.db.getSettings("custom_channels");
      if (stored) setCustomChannels(stored);
    };
    loadCustomChannels();
  }, []);

  const loadMessages = async () => {
    try {
      const isDM = activeChannel.startsWith("dm_");
      let data = [];

      if (isDM) {
        const targetUserId = activeChannel.replace("dm_", "");
        if (window.api.db.getPrivateMessages) {
          data = await window.api.db.getPrivateMessages(currentUser.id, targetUserId);
        }
      } else {
        const targetId = activeChannel === "global" ? null : activeChannel;
        data = await window.api.db.getMessages(targetId);
      }

      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  useEffect(() => {
    loadMessages();
    setReplyingTo(null);
    setInputText("");
    setAttachedFile(null);
    setShowMentions(false);
  }, [activeChannel]);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // --- 🔥 ACCESS CONTROL FILTERS ---
  const visibleProjects = useMemo(() => {
    return projects.filter((p) => {
      if (currentUser.accessLevel >= 5) return true;
      try {
        const assigned = JSON.parse(p.assignedStaff || "[]");
        if (Array.isArray(assigned)) return assigned.includes(currentUser.id);
        return assigned.hasOwnProperty(currentUser.id);
      } catch {
        return false;
      }
    });
  }, [projects, currentUser]);

  const visibleCustomChannels = useMemo(() => {
    return customChannels.filter((c) => {
      if (currentUser.accessLevel >= 5) return true;
      if (!c.members) return true;
      return c.members.includes(currentUser.id);
    });
  }, [customChannels, currentUser]);

  // Safety fallback
  useEffect(() => {
    if (activeChannel !== "global" && !activeChannel.startsWith("dm_")) {
      const isProj = visibleProjects.find((p) => p.id === activeChannel);
      const isCust = visibleCustomChannels.find((c) => c.id === activeChannel);
      if (!isProj && !isCust) setActiveChannel("global");
    }
  }, [visibleProjects, visibleCustomChannels, activeChannel]);

  // --- CHANNEL SWITCHER LOGIC ---
  const handleSwitchChannel = (channelId) => {
    setActiveChannel(channelId);
    setIsMobileListOpen(false);
  };

  // --- ACTIONS: CUSTOM CHANNELS ---
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    const newChannel = {
      id: `custom_${window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2)}`,
      name: newChannelName.trim(),
      adminId: currentUser.id,
      members: [currentUser.id],
    };
    const updated = [...customChannels, newChannel];
    await window.api.db.saveSettings("custom_channels", updated);
    setCustomChannels(updated);
    setNewChannelName("");
    setIsCreatingChannel(false);
    handleSwitchChannel(newChannel.id);
  };

  const handleDeleteChannel = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this custom channel and all its messages?")) return;
    const updated = customChannels.filter((c) => c.id !== id);
    await window.api.db.saveSettings("custom_channels", updated);
    setCustomChannels(updated);
    if (activeChannel === id) handleSwitchChannel("global");
  };

  const handleOpenManage = (ch, e) => {
    e.stopPropagation();
    setManagingChannel(ch);
    setManageChannelOpen(true);
  };

  const handleToggleMember = (staffId) => {
    setManagingChannel((prev) => {
      const members = prev.members || [];
      const nextMembers = members.includes(staffId) ? members.filter((id) => id !== staffId) : [...members, staffId];
      return { ...prev, members: nextMembers };
    });
  };

  const handleSaveChannelMembers = async () => {
    const updated = customChannels.map((c) => (c.id === managingChannel.id ? managingChannel : c));
    await window.api.db.saveSettings("custom_channels", updated);
    setCustomChannels(updated);
    setManageChannelOpen(false);
  };

  // --- ACTIONS: MESSAGING & FILES ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Just set the file object directly, don't read as DataURL
    setAttachedFile(file);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachedFile) return;

    const isDM = activeChannel.startsWith("dm_");
    const targetUserId = isDM ? activeChannel.replace("dm_", "") : null;

    try {
      // 1. Upload File (if exists)
      let fileData = null;
      if (attachedFile) {
        const res = await window.api.db.uploadChatAttachment(attachedFile);

        // 🔥 FIX: Check if res is a string (success path) or has an error property
        if (typeof res === "string") {
          fileData = { type: "file", path: res, name: attachedFile.name };
        } else if (res && res.error) {
          alert("File upload failed: " + res.error);
          return;
        } else {
          alert("File upload failed: Unexpected response format.");
          console.log("Raw Response:", res);
          return;
        }
      }

      // 2. Prepare payload
      const content = fileData ? `__FILE_DATA__${JSON.stringify(fileData)}` : inputText.trim();

      const messagePayload = {
        id: window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2),
        senderId: currentUser.id,
        content: content,
        replyToId: replyingTo ? replyingTo.id : null,
        createdAt: Date.now() + 1,
      };

      // 3. Send Message
      if (isDM && window.api.db.savePrivateMessage) {
        await window.api.db.savePrivateMessage({ ...messagePayload, receiverId: targetUserId });
      } else {
        await window.api.db.saveMessage({
          ...messagePayload,
          projectId: activeChannel === "global" ? null : activeChannel,
        });
      }

      // 4. Cleanup
      setInputText("");
      setAttachedFile(null);
      setReplyingTo(null);
      setShowMentions(false);
      loadMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("System error: " + err.message);
    }
  };
  const handleDeleteMessage = async (id) => {
    if (window.confirm("Permanently delete this message?")) {
      const isDM = activeChannel.startsWith("dm_");
      if (isDM && window.api.db.deletePrivateMessage) {
        await window.api.db.deletePrivateMessage(id);
      } else {
        await window.api.db.deleteMessage(id);
      }
      loadMessages();
    }
  };

  // --- MENTIONS LOGIC ---
  const filteredStaff = useMemo(() => {
    if (!mentionQuery) return staff;
    return staff.filter(
      (s) =>
        (s.username || "").toLowerCase().includes(mentionQuery) || (s.name || "").toLowerCase().includes(mentionQuery),
    );
  }, [staff, mentionQuery]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@")) {
      setShowMentions(true);
      setMentionQuery(lastWord.substring(1).toLowerCase());
      setMentionStartIndex(cursorPosition - lastWord.length);
      setMentionSelectedIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (selectedUser) => {
    const username = selectedUser.username || selectedUser.name.replace(/\s+/g, "");
    const before = inputText.slice(0, mentionStartIndex);
    const afterMatch = inputText.slice(mentionStartIndex).match(/\s/);
    const endIndex = afterMatch ? mentionStartIndex + afterMatch.index : inputText.length;
    const after = inputText.slice(endIndex);

    setInputText(`${before}@${username} ${after}`);
    setShowMentions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (showMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => Math.min(prev + 1, filteredStaff.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredStaff[mentionSelectedIndex]) insertMention(filteredStaff[mentionSelectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- PARSERS & FORMATTERS ---
  const getStaffName = (id) => staff.find((s) => s.id === id)?.name || "Unknown User";
  const getReplyMessage = (replyId) => messages.find((m) => m.id === replyId);
  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getActiveChannelName = () => {
    if (activeChannel === "global") return "GLOBAL NETWORK";
    if (activeChannel.startsWith("dm_")) {
      const u = staff.find((s) => s.id === activeChannel.replace("dm_", ""));
      if (u) return `@${(u.username || u.name).toUpperCase()}`;
    }
    const proj = projects.find((p) => p.id === activeChannel);
    if (proj) return proj.name.toUpperCase();
    const custom = customChannels.find((c) => c.id === activeChannel);
    if (custom) return custom.name.toUpperCase();
    return "UNKNOWN CHANNEL";
  };

  const parseMessage = (contentStr) => {
    if (!contentStr) return { text: "", file: null };
    if (typeof contentStr === "string" && contentStr.startsWith("__FILE_DATA__")) {
      try {
        return { text: "", file: JSON.parse(contentStr.replace("__FILE_DATA__", "")) };
      } catch (e) {}
    }
    try {
      const parsed = JSON.parse(contentStr);
      if (parsed.file) return parsed;
    } catch (e) {}
    return { text: contentStr, file: null };
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const isMe =
          part.toLowerCase() === `@${(currentUser.username || currentUser.name.replace(/\s+/g, "")).toLowerCase()}`;
        return (
          <Typography
            key={i}
            component="span"
            variant="body2"
            sx={{
              color: isMe ? "secondary.light" : "primary.light",
              fontWeight: "bold",
              bgcolor: isMe ? alpha(theme.palette.secondary.main, 0.2) : alpha(theme.palette.primary.main, 0.1),
              px: 0.5,
              borderRadius: 1,
            }}
          >
            {part}
          </Typography>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Box display="flex" height="calc(100vh - 180px)" gap={3} sx={{ flexDirection: "row" }}>
      {/* --- LEFT: CHANNELS LIST --- */}
      <Paper
        elevation={0}
        sx={{
          width: { xs: "100%", md: 280 },
          flexShrink: 0,
          bgcolor: alpha(theme.palette.background.paper, 0.3),
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          flexDirection: "column",
          overflow: "hidden",
          display: { xs: isMobileListOpen ? "flex" : "none", md: "flex" },
        }}
      >
        <Box
          p={2}
          borderBottom="1px solid"
          borderColor="divider"
          bgcolor={alpha(theme.palette.background.paper, 0.5)}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography
            variant="subtitle2"
            fontWeight="bold"
            sx={{ fontFamily: "'JetBrains Mono', monospace", color: "text.secondary" }}
          >
            // DIRECTORY
          </Typography>
          <IconButton size="small" onClick={() => setIsCreatingChannel(true)} color="primary">
            <AddBoxIcon fontSize="small" />
          </IconButton>
        </Box>
        <List sx={{ flexGrow: 1, overflowY: "auto", p: 1 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={activeChannel === "global"}
              onClick={() => handleSwitchChannel("global")}
              sx={{ borderRadius: 1.5, "&.Mui-selected": { bgcolor: alpha(theme.palette.primary.main, 0.2) } }}
            >
              <ForumIcon
                sx={{ fontSize: 18, mr: 1.5, color: activeChannel === "global" ? "primary.main" : "text.secondary" }}
              />
              <ListItemText
                primary="Global Network"
                primaryTypographyProps={{
                  fontSize: "13px",
                  fontWeight: activeChannel === "global" ? "bold" : "normal",
                }}
              />
            </ListItemButton>
          </ListItem>

          {/* 🔥 TEAMS & GROUPS (Collapsible) */}
          {visibleCustomChannels.length > 0 && (
            <>
              <Divider sx={{ my: 1, opacity: 0.5 }} />
              <ListItemButton onClick={() => setGroupsOpen(!groupsOpen)} sx={{ py: 0.5, borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    flexGrow: 1,
                    color: "text.secondary",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                >
                  TEAMS & GROUPS
                </Typography>
                {groupsOpen ? (
                  <ExpandLess sx={{ fontSize: 16, color: "text.secondary" }} />
                ) : (
                  <ExpandMore sx={{ fontSize: 16, color: "text.secondary" }} />
                )}
              </ListItemButton>
              <Collapse in={groupsOpen} timeout="auto" unmountOnExit>
                {visibleCustomChannels.map((ch) => {
                  const isChannelAdmin = ch.adminId === currentUser.id || currentUser.accessLevel >= 5;
                  return (
                    <ListItem key={ch.id} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        selected={activeChannel === ch.id}
                        onClick={() => handleSwitchChannel(ch.id)}
                        sx={{
                          borderRadius: 1.5,
                          "&.Mui-selected": { bgcolor: alpha(theme.palette.secondary.main, 0.2) },
                        }}
                      >
                        <TagIcon
                          sx={{
                            fontSize: 18,
                            mr: 1.5,
                            color: activeChannel === ch.id ? "secondary.main" : "text.secondary",
                          }}
                        />
                        <ListItemText
                          primary={ch.name}
                          primaryTypographyProps={{
                            fontSize: "13px",
                            fontWeight: activeChannel === ch.id ? "bold" : "normal",
                            noWrap: true,
                          }}
                        />

                        {isChannelAdmin && (
                          <Box display="flex" alignItems="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleOpenManage(ch, e)}
                              sx={{ opacity: 0.2, "&:hover": { opacity: 1, color: "info.main" } }}
                            >
                              <GroupAddIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => handleDeleteChannel(ch.id, e)}
                              sx={{ opacity: 0.2, "&:hover": { opacity: 1, color: "error.main" } }}
                            >
                              <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </Collapse>
            </>
          )}

          {/* 🔥 ASSIGNED PROJECTS (Collapsible) */}
          <Divider sx={{ my: 1, opacity: 0.5 }} />
          <ListItemButton onClick={() => setProjectsOpen(!projectsOpen)} sx={{ py: 0.5, borderRadius: 1 }}>
            <Typography
              variant="caption"
              sx={{
                flexGrow: 1,
                color: "text.secondary",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              ASSIGNED PROJECTS
            </Typography>
            {projectsOpen ? (
              <ExpandLess sx={{ fontSize: 16, color: "text.secondary" }} />
            ) : (
              <ExpandMore sx={{ fontSize: 16, color: "text.secondary" }} />
            )}
          </ListItemButton>
          <Collapse in={projectsOpen} timeout="auto" unmountOnExit>
            {visibleProjects.length === 0 ? (
              <Typography sx={{ px: 2, py: 1, fontSize: "11px", color: "text.secondary", fontStyle: "italic" }}>
                No projects assigned.
              </Typography>
            ) : (
              visibleProjects.map((proj) => (
                <ListItem key={proj.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={activeChannel === proj.id}
                    onClick={() => handleSwitchChannel(proj.id)}
                    sx={{ borderRadius: 1.5, "&.Mui-selected": { bgcolor: alpha(theme.palette.info.main, 0.2) } }}
                  >
                    <TagIcon
                      sx={{ fontSize: 18, mr: 1.5, color: activeChannel === proj.id ? "info.main" : "text.secondary" }}
                    />
                    <ListItemText
                      primary={proj.name}
                      primaryTypographyProps={{
                        fontSize: "13px",
                        fontWeight: activeChannel === proj.id ? "bold" : "normal",
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </Collapse>

          {/* 🔥 DIRECT MESSAGES (Collapsible) */}
          <Divider sx={{ my: 1, opacity: 0.5 }} />
          <ListItemButton onClick={() => setDmsOpen(!dmsOpen)} sx={{ py: 0.5, borderRadius: 1 }}>
            <Typography
              variant="caption"
              sx={{
                flexGrow: 1,
                color: "text.secondary",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                fontWeight: "bold",
              }}
            >
              DIRECT MESSAGES
            </Typography>
            {dmsOpen ? (
              <ExpandLess sx={{ fontSize: 16, color: "text.secondary" }} />
            ) : (
              <ExpandMore sx={{ fontSize: 16, color: "text.secondary" }} />
            )}
          </ListItemButton>
          <Collapse in={dmsOpen} timeout="auto" unmountOnExit>
            {staff
              .filter((s) => s.id !== currentUser.id)
              .map((user) => (
                <ListItem key={user.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    selected={activeChannel === `dm_${user.id}`}
                    onClick={() => handleSwitchChannel(`dm_${user.id}`)}
                    sx={{ borderRadius: 1.5, "&.Mui-selected": { bgcolor: alpha(theme.palette.success.main, 0.2) } }}
                  >
                    <PersonIcon
                      sx={{
                        fontSize: 18,
                        mr: 1.5,
                        color: activeChannel === `dm_${user.id}` ? "success.main" : "text.secondary",
                      }}
                    />
                    <ListItemText
                      primary={user.name}
                      secondary={user.designation}
                      primaryTypographyProps={{
                        fontSize: "13px",
                        fontWeight: activeChannel === `dm_${user.id}` ? "bold" : "normal",
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{ fontSize: "10px", opacity: 0.6, noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
          </Collapse>
        </List>
      </Paper>

      {/* --- RIGHT: ACTIVE CHAT AREA --- */}
      <Paper
        elevation={0}
        sx={{
          flexGrow: 1,
          bgcolor: alpha(theme.palette.background.paper, 0.2),
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          flexDirection: "column",
          overflow: "hidden",
          display: { xs: isMobileListOpen ? "none" : "flex", md: "flex" },
        }}
      >
        <Box
          p={2}
          borderBottom="1px solid"
          borderColor="divider"
          bgcolor={alpha(theme.palette.background.paper, 0.6)}
          display="flex"
          alignItems="center"
          gap={1.5}
        >
          <IconButton
            size="small"
            onClick={() => setIsMobileListOpen(true)}
            sx={{ display: { xs: "flex", md: "none" }, color: "text.secondary" }}
          >
            <MenuIcon />
          </IconButton>

          {activeChannel === "global" ? (
            <ForumIcon color="primary" />
          ) : activeChannel.startsWith("dm_") ? (
            <PersonIcon color="success" />
          ) : (
            <TagIcon color="info" />
          )}
          <Typography variant="h6" fontWeight="bold" sx={{ fontFamily: "'JetBrains Mono', monospace", noWrap: true }}>
            {getActiveChannelName()}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1, p: 3, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {messages.length === 0 ? (
            <Box m="auto" textAlign="center" opacity={0.3}>
              <ForumIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography sx={{ fontFamily: "'JetBrains Mono', monospace" }}>CHANNEL_EMPTY</Typography>
            </Box>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              const replyMsg = msg.replyToId ? getReplyMessage(msg.replyToId) : null;
              const parsedData = parseMessage(msg.content);

              return (
                <Box key={msg.id} alignSelf={isMe ? "flex-end" : "flex-start"} maxWidth="75%">
                  <Box
                    display="flex"
                    alignItems="baseline"
                    justifyContent={isMe ? "flex-end" : "flex-start"}
                    gap={1}
                    mb={0.5}
                  >
                    {!isMe && (
                      <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize: "11px" }}>
                        {getStaffName(msg.senderId)}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", opacity: 0.5 }}
                    >
                      {formatTime(msg.createdAt)}
                    </Typography>
                  </Box>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      px: 2,
                      borderRadius: 2,
                      bgcolor: isMe
                        ? alpha(theme.palette.primary.main, 0.2)
                        : alpha(theme.palette.background.paper, 0.8),
                      border: "1px solid",
                      borderColor: isMe ? alpha(theme.palette.primary.main, 0.4) : "divider",
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: !isMe ? 4 : 16,
                      position: "relative",
                      "&:hover .msg-actions": { opacity: 1 },
                    }}
                  >
                    <Box
                      className="msg-actions"
                      sx={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        [isMe ? "left" : "right"]: isMe ? -76 : -36,
                        opacity: 0,
                        transition: "0.2s",
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
                      {isMe && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMessage(msg.id)}
                          sx={{
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                            "&:hover": { color: "error.main" },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => setReplyingTo(msg)}
                        sx={{ bgcolor: alpha(theme.palette.background.paper, 0.9) }}
                      >
                        <ReplyIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {replyMsg && (
                      <Box
                        sx={{
                          p: 1,
                          mb: 1,
                          borderRadius: 1,
                          bgcolor: "rgba(0,0,0,0.2)",
                          borderLeft: `3px solid ${theme.palette.primary.main}`,
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          color="primary.light"
                          sx={{ fontSize: "10px", display: "block" }}
                        >
                          {getStaffName(replyMsg.senderId)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "12px",
                            opacity: 0.8,
                            display: "-webkit-box",
                            overflow: "hidden",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 2,
                          }}
                        >
                          {parseMessage(replyMsg.content).text || "[Attachment]"}
                        </Typography>
                      </Box>
                    )}

                    {parsedData.file && (
                      <Paper
                        elevation={0}
                        onClick={() => window.api.os.openFile(parsedData.file.path)}
                        sx={{
                          p: 1,
                          mb: parsedData.text ? 1 : 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          bgcolor: "rgba(0,0,0,0.3)",
                          border: "1px solid",
                          borderColor: "divider",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
                        }}
                      >
                        <InsertDriveFileIcon color="info" />
                        <Box flexGrow={1} overflow="hidden">
                          <Typography variant="caption" display="block" noWrap fontWeight="bold">
                            {parsedData.file.name}
                          </Typography>
                        </Box>
                        <DownloadIcon fontSize="small" sx={{ opacity: 0.5 }} />
                      </Paper>
                    )}

                    {parsedData.text && (
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {renderFormattedText(parsedData.text)}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              );
            })
          )}
          <div ref={chatEndRef} />
        </Box>

        <Box
          p={2}
          bgcolor={alpha(theme.palette.background.paper, 0.4)}
          borderTop="1px solid"
          borderColor="divider"
          position="relative"
        >
          {showMentions && filteredStaff.length > 0 && (
            <Paper
              sx={{
                position: "absolute",
                bottom: "100%",
                left: 16,
                mb: 1,
                width: 250,
                maxHeight: 200,
                overflowY: "auto",
                bgcolor: "#0d1f3c",
                border: "1px solid",
                borderColor: "primary.main",
                zIndex: 10,
              }}
            >
              <List dense>
                {filteredStaff.map((s, idx) => (
                  <ListItemButton
                    key={s.id}
                    selected={idx === mentionSelectedIndex}
                    onClick={() => insertMention(s)}
                    sx={{ "&.Mui-selected": { bgcolor: alpha(theme.palette.primary.main, 0.3) } }}
                  >
                    <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: "10px", bgcolor: "primary.dark" }}>
                      {s.name.charAt(0)}
                    </Avatar>
                    <ListItemText
                      primary={`@${s.username || s.name.replace(/\s+/g, "")}`}
                      secondary={s.name}
                      primaryTypographyProps={{ fontSize: "12px", fontWeight: "bold" }}
                      secondaryTypographyProps={{ fontSize: "10px", opacity: 0.7 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}

          {replyingTo && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
              p={1}
              bgcolor="rgba(0,0,0,0.2)"
              borderRadius={1}
              borderLeft={`3px solid ${theme.palette.primary.main}`}
            >
              <Box overflow="hidden">
                <Typography variant="caption" color="primary.light" sx={{ fontSize: "10px", fontWeight: "bold" }}>
                  Replying to {getStaffName(replyingTo.senderId)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "12px", opacity: 0.7, noWrap: true }}>
                  {parseMessage(replyingTo.content).text || "[Attachment]"}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setReplyingTo(null)}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}

          {attachedFile && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
              p={1}
              bgcolor="rgba(0,0,0,0.2)"
              borderRadius={1}
              borderLeft={`3px solid ${theme.palette.info.main}`}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <InsertDriveFileIcon fontSize="small" color="info" />
                {/* Update here to use attachedFile.name directly */}
                <Typography variant="caption" fontWeight="bold">
                  {attachedFile.name}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setAttachedFile(null)}>
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}

          <Box display="flex" gap={1} alignItems="flex-end">
            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileSelect} />
            <IconButton
              color={attachedFile ? "info" : "default"}
              onClick={() => fileInputRef.current.click()}
              sx={{ bgcolor: "rgba(0,0,0,0.2)", borderRadius: 2 }}
            >
              <AttachFileIcon />
            </IconButton>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={4}
              placeholder={`Message ${getActiveChannelName()}...`}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              InputProps={{
                sx: {
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  borderRadius: 2,
                  bgcolor: "rgba(0,0,0,0.2)",
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!inputText.trim() && !attachedFile}
              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), borderRadius: 2 }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* 🔥 DIALOG: Create Custom Channel */}
      <Dialog
        open={isCreatingChannel}
        onClose={() => setIsCreatingChannel(false)}
        PaperProps={{ sx: { bgcolor: "#0d1f3c", border: "1px solid", borderColor: "divider" } }}
      >
        <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px" }}>CREATE_CHANNEL</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Create a dedicated workspace for specialized teams or topics.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="CHANNEL NAME"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCreatingChannel(false)} color="inherit">
            CANCEL
          </Button>
          <Button onClick={handleCreateChannel} variant="contained" disabled={!newChannelName.trim()}>
            CREATE
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔥 DIALOG: Manage Custom Channel Members */}
      <Dialog
        open={manageChannelOpen}
        onClose={() => setManageChannelOpen(false)}
        PaperProps={{ sx: { bgcolor: "#0d1f3c", border: "1px solid", borderColor: "divider", minWidth: 350 } }}
      >
        <DialogTitle sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px" }}>
          MANAGE CHANNEL MEMBERS
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Select staff to add or remove from this channel.
          </Typography>
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {staff.map((s) => (
              <ListItem key={s.id} disablePadding>
                <FormControlLabel
                  sx={{ width: "100%", ml: 0 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={(managingChannel?.members || []).includes(s.id)}
                      onChange={() => handleToggleMember(s.id)}
                    />
                  }
                  label={
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                      {s.name} <span style={{ opacity: 0.5 }}>({s.designation})</span>
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setManageChannelOpen(false)} color="inherit">
            CANCEL
          </Button>
          <Button onClick={handleSaveChannelMembers} variant="contained" color="success">
            SAVE MEMBERS
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
