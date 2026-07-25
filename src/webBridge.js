// 🔥 POLYFILL: Gives HTTP devices the ability to generate secure IDs
if (!window.crypto) window.crypto = {};
if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
}

/**
 * 🔥 TAURI DETECTION & DYNAMIC SERVER DISCOVERY
 */
const isTauri = '__TAURI_INTERNALS__' in window;

const getTargetUrl = () => {
    if (isTauri) {
        return localStorage.getItem('openprix_last_server') || import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
    }
    if (window.location.port !== '5173') {
        return import.meta.env.VITE_API_URL || window.location.origin;
    }
    return localStorage.getItem('openprix_last_server') || import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
};

const SERVER_URL = getTargetUrl();
console.log(`[OpenPrix] Connecting to Nexus Daemon at: ${SERVER_URL} (Tauri Client: ${isTauri})`);

// 🚀 THE PURE REST CLIENT WITH JWT INTERCEPTOR (FIXED: NO RELOAD LOOP)
const restCall = async (method, endpoint, data = null) => {
    try {
        const headers = { 'Content-Type': 'application/json' };

        const token = localStorage.getItem('openprix_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        const res = await fetch(`${SERVER_URL}${endpoint}`, options);

        // 🔥 THE FIX: If server rejects token, just return unauthorized status.
        // We do NOT call reload() here anymore, preventing the infinite loop.
        if (res.status === 401) {
            console.warn("🔒 401 Unauthorized: Access Denied or Session Expired.");
            localStorage.removeItem('openprix_user');
            localStorage.removeItem('openprix_token');
            return { success: false, unauthorized: true, error: "Authentication Required" };
        }

        const json = await res.json();

        if (json.success === false) throw new Error(json.error || "Server Error");
        return json.data !== undefined ? json.data : json;
    } catch (error) {
        console.error(`Network REST Error [${method} ${endpoint}]:`, error);
        return { success: false, error: error.message };
    }
};

// --- NATIVE OS BRIDGE ---

let tauriInvoke = null;
if (isTauri) {
    import('@tauri-apps/api/core').then(module => {
        tauriInvoke = module.invoke;
    }).catch(err => console.error("Failed to load Tauri API", err));
}

const tauriOsCalls = {
    pickFile: () => tauriInvoke ? tauriInvoke('os_pick_file') : null,
    openFile: (filePath) => tauriInvoke ? tauriInvoke('os_open_file', { filePath }) : null,
    getBase64: (filePath) => tauriInvoke ? tauriInvoke('os_get_base64', { filePath }) : null,
    pickDirectory: () => tauriInvoke ? tauriInvoke('os_pick_directory') : null
};

const webPickFile = (accept = "*") => {
    return new Promise((resolve) => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = accept;
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = evt => resolve({ name: file.name, base64: evt.target.result.split(',')[1] });
            reader.readAsDataURL(file);
        };
        input.click();
    });
};

const osNetworkCalls = {
    // Admin only - Locked to localhost on server
    uploadFileWeb: async (fileObject, targetFolder = null) => {
        const formData = new FormData();
        formData.append('targetFolder', targetFolder || "null");
        formData.append('file', fileObject);

        const token = localStorage.getItem('openprix_token');

        try {
            const res = await fetch(`${SERVER_URL}/api/os/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            const rawText = await res.text();
            let json;
            try { json = JSON.parse(rawText); } catch (e) { return { success: false, error: rawText }; }

            return json.success !== false ? (json.data !== undefined ? json.data : json) : json;
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // 🔥 SECURE SANDBOXED UPLOAD FOR REMOTE CLIENTS
    uploadProjectDocument: async (projectId, fileObject) => {
        const formData = new FormData();
        formData.append('file', fileObject);
        const token = localStorage.getItem('openprix_token');

        try {
            const res = await fetch(`${SERVER_URL}/api/projects/${projectId}/upload`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            const rawText = await res.text();
            let json;
            try { json = JSON.parse(rawText); } catch (e) { return { success: false, error: rawText }; }

            return json.success !== false ? (json.data !== undefined ? json.data : json) : json;
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // 🔥 FIX: Properly route native desktop opens vs remote web opens
    openFile: async (filePath) => {
        if (isTauri && tauriInvoke) {
            // If on the host server running Tauri, use the native OS command to launch AutoCAD/Excel
            return tauriInvoke('os_open_file', { filePath });
        } else {
            // If remote web client, stream it to a new browser tab for viewing
            const token = localStorage.getItem('openprix_token');
            const cleanPath = filePath.replace(/\\/g, '/');
            const streamUrl = `${SERVER_URL}/api/os/download?path=${encodeURIComponent(cleanPath)}&token=${encodeURIComponent(token || '')}`;
            window.open(streamUrl, '_blank');
            return { success: true };
        }
    },

    // 🔥 NEW: Dedicated Download Bridge with UX Notifications for Tauri
    downloadFile: async (filePath, fileName) => {
        const token = localStorage.getItem('openprix_token');
        const cleanPath = filePath.replace(/\\/g, '/');
        const encodedPath = encodeURIComponent(cleanPath);

        if (isTauri) {
            // UX: Tell the user the background download has started!
            osNetworkCalls.sendNotification("Download Started", `Fetching ${fileName}...`);

            try {
                const res = await fetch(`${SERVER_URL}/api/os/download?path=${encodedPath}&token=${encodeURIComponent(token || '')}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error(`Server rejected request (${res.status})`);

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = fileName || 'downloaded_file';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                // UX: Tell the user it's ready!
                osNetworkCalls.sendNotification("Download Complete", `${fileName} is ready.`);
            } catch (e) {
                console.error("Tauri Download Error:", e);
                osNetworkCalls.sendNotification("Download Failed", e.message);
            }
        } else {
            // For standard web browsers, we just let Chrome/Edge handle the download progress UI natively
            const streamUrl = `${SERVER_URL}/api/os/download?path=${encodedPath}&token=${encodeURIComponent(token || '')}`;
            window.open(streamUrl, '_blank');
        }
    },

    scanDirectory: (targetFolder, ignoredExtensions = []) => {
        return restCall('POST', '/api/os/scan', { targetFolder, ignoredExtensions });
    },

    sendNotification: async (title, body) => {
        try {
            if (isTauri) {
                const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/plugin-notification');
                let permissionGranted = await isPermissionGranted();
                if (!permissionGranted) {
                    const permission = await requestPermission();
                    permissionGranted = permission === 'granted';
                }
                if (permissionGranted) sendNotification({ title, body });
            } else {
                if (!("Notification" in window)) return;
                if (Notification.permission === "granted") {
                    new Notification(title, { body });
                } else if (Notification.permission !== "denied") {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") new Notification(title, { body });
                }
            }
        } catch (err) { console.error("Failed to send notification:", err); }
    },

    listDirectories: (targetFolder) => {
        return restCall('POST', '/api/os/dirs', { targetFolder });
    },

    scaffoldProject: (payload) => restCall('POST', '/api/os/scaffold', payload),

    renameProjectFolder: (payload) => restCall('POST', '/api/os/rename', payload),

    getServerUrl: () => SERVER_URL
};

const webOsFallbacks = {
    pickFile: () => webPickFile(),
    pickDirectory: async () => prompt("Host Server Path Mapping:\nType absolute path ON THE HOST SERVER (e.g., C:/Projects):") || null,
    openFile: (filePath) => {
        window.open(`${SERVER_URL}/api/os/download?path=${encodeURIComponent(filePath)}`, '_blank');
    },
    getBase64: async (filePath) => {
        try {
            const res = await fetch(`${SERVER_URL}/api/os/download?path=${encodeURIComponent(filePath)}`);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch { return null; }
    }
};

window.api = {
    db: {
        verifyEmployeeLogin: (un, pw) => restCall('POST', '/api/auth/login', { username: un, password: pw }),
        getSettings: (key) => restCall('GET', `/api/settings/${key}`),
        saveSettings: (key, val) => restCall('POST', `/api/settings/${key}`, { value: val }),
        backupDatabase: () => restCall('POST', '/api/os/db/backup'),
        restoreDatabase: (fileData) => restCall('POST', '/api/os/db/restore', { data: fileData }),
        purgeDatabase: () => restCall('POST', '/api/os/db/purge'),
        getRegions: () => restCall('GET', '/api/regions'),
        createRegion: (name) => restCall('POST', '/api/regions', { name }),
        deleteRegion: (id) => restCall('DELETE', `/api/regions/${id}`),
        getResources: () => restCall('GET', '/api/resources'),
        createResource: (data) => restCall('POST', '/api/resources', data),
        bulkSaveResources: (items) => restCall('POST', '/api/resources/bulk', items),
        updateResource: (id, f, v) => restCall('PUT', `/api/resources/${id}`, { field: f, value: typeof v === 'object' ? JSON.stringify(v) : String(v) }),
        deleteResource: (id) => restCall('DELETE', `/api/resources/${id}`),
        getMasterBoqs: () => restCall('GET', '/api/master-boqs'),
        saveMasterBoq: (p, id, n) => restCall('POST', '/api/master-boqs', { payload: p, id, isNew: n }),
        deleteMasterBoq: (id) => restCall('DELETE', `/api/master-boqs/${id}`),
        getProjects: () => restCall('GET', '/api/projects'),
        getProject: (id) => restCall('GET', `/api/projects/${id}`),
        addProject: (data) => restCall('POST', '/api/projects', data),
        updateProject: (id, data) => restCall('PUT', `/api/projects/${id}`, data),
        deleteProject: (id) => restCall('DELETE', `/api/projects/${id}`),
        purgeProjects: () => restCall('POST', '/api/projects/purge'),
        getProjectBoqs: (pid) => restCall('GET', `/api/projects/${pid}/boqs`),
        addProjectBoq: (data) => restCall('POST', '/api/boqs', data),
        updateProjectBoq: (id, data) => restCall('PUT', `/api/boqs/${id}`, data),
        deleteProjectBoq: (id) => restCall('DELETE', `/api/boqs/${id}`),
        bulkPutProjectBoqs: (arr) => restCall('PUT', '/api/boqs/bulk', { items: arr }),
        getProjectDocuments: (pid) => restCall('GET', `/api/projects/${pid}/documents`),
        saveProjectDocument: (data) => restCall('POST', '/api/documents', data),
        deleteProjectDocument: (id) => restCall('DELETE', `/api/documents/${id}`),
        getCrmContacts: () => restCall('GET', '/api/crm'),
        saveCrmContact: (data) => restCall('POST', '/api/crm', data),
        deleteCrmContact: (id) => restCall('DELETE', `/api/crm/${id}`),
        getOrgStaff: () => restCall('GET', '/api/staff'),
        saveOrgStaff: (data) => restCall('POST', '/api/staff', data),
        deleteOrgStaff: (id) => restCall('DELETE', `/api/staff/${id}`),
        getWorkLogs: () => restCall('GET', '/api/worklogs'),
        saveWorkLog: (data) => restCall('POST', '/api/worklogs', data),
        updateWorkLog: (id, data) => restCall('PUT', `/api/worklogs/${id}`, data),
        deleteWorkLog: (id) => restCall('DELETE', `/api/worklogs/${id}`),
        getMessages: (pid) => restCall('GET', pid ? `/api/messages?projectId=${pid}` : '/api/messages'),
        saveMessage: (data) => restCall('POST', '/api/messages', data),
        deleteMessage: (id) => restCall('DELETE', `/api/messages/${id}`),
        getPrivateMessages: (u1, u2) => restCall('GET', `/api/private-messages/${u1}/${u2}`),
        savePrivateMessage: (data) => restCall('POST', '/api/private-messages', data),
        deletePrivateMessage: (id) => restCall('DELETE', `/api/private-messages/${id}`),
        // CHAT UPLOAD BRIDGE
        uploadChatAttachment: async (fileObject) => {
            const formData = new FormData();
            formData.append('file', fileObject);
            const token = localStorage.getItem('openprix_token');

            try {
                const res = await fetch(`${SERVER_URL}/api/messages/upload`, {
                    method: 'POST',
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    body: formData
                });
                const rawText = await res.text();
                let json;
                try { json = JSON.parse(rawText); } catch (e) { return { success: false, error: rawText }; }
                return json.success !== false ? (json.data !== undefined ? json.data : json) : json;
            } catch (e) {
                return { success: false, error: e.message };
            }
        },
        checkNotifications: (id, lc) => restCall('GET', `/api/notifications/check?userId=${id}&lastChecked=${lc}`),
        getKanbanTasks: () => restCall('GET', '/api/kanban'),
    },
    os: { ...(isTauri ? tauriOsCalls : webOsFallbacks), ...osNetworkCalls }
};