import React, { useState, useEffect } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { useAuth } from '../../context/AuthContext'; // Adjust path if necessary

export default function GlobalChatButton({ chatOpen, onOpen }) {
    const { currentUser } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [prevCount, setPrevCount] = useState(0);

    useEffect(() => {
        if (!currentUser) return;

        const checkUnreadMessages = async () => {
            if (chatOpen) {
                localStorage.setItem(`last_chat_check_${currentUser.id}`, Date.now().toString());
                setUnreadCount(0);
                setPrevCount(0);
                return;
            }
            try {
                const lastChecked = parseInt(localStorage.getItem(`last_chat_check_${currentUser.id}`) || '0');
                const res = await window.api.db.checkNotifications(currentUser.id, lastChecked);

                if (res?.unauthorized) return;

                let count = 0;
                if (typeof res === 'number') count = res;
                else if (typeof res === 'string' && !isNaN(res)) count = parseInt(res);
                else if (Array.isArray(res)) count = res.length;
                else if (res && typeof res === 'object' && res.count !== undefined) count = res.count;

                if (count > prevCount && count > 0) {
                    const newMsgs = count - prevCount;
                    window.api.os.sendNotification(
                        "OPENPRIX COMMLINK",
                        `You have ${newMsgs} new unread message${newMsgs > 1 ? 's' : ''}.`
                    );
                }

                setPrevCount(count);
                setUnreadCount(count);
            } catch (err) {
                console.error("[Notification Engine] Failed:", err);
            }
        };

        checkUnreadMessages();
        const interval = setInterval(checkUnreadMessages, 15000);
        return () => clearInterval(interval);
    }, [currentUser, chatOpen, prevCount]);

    return (
        <Tooltip title="Global CommLink">
            <IconButton onClick={onOpen} sx={{ color: 'text.secondary', mr: 1, '&:hover': { color: 'info.main' } }}>
                <Badge badgeContent={unreadCount} color="error" overlap="circular">
                    <ChatIcon />
                </Badge>
            </IconButton>
        </Tooltip>
    );
}