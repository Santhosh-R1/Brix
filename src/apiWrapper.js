// 🔥 The Global Client URL. The user will change this via the Login Screen.
let SERVER_URL = sessionStorage.getItem('openprix_server_url') || import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export const setServerUrl = (url) => {
    SERVER_URL = url;
    sessionStorage.setItem('openprix_server_url', url);
};

export const getServerUrl = () => SERVER_URL;

// 🚀 THE PURE REST CLIENT (Replaces webRpc)
const restCall = async (method, endpoint, data = null) => {
    try {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (data) options.body = JSON.stringify(data);

        const response = await fetch(`${SERVER_URL}${endpoint}`, options);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result.data;
    } catch (err) {
        console.error(`REST Fail [${method} ${endpoint}]:`, err);
        throw err;
    }
};

const isElectron = window && window.api && window.api.os;

export const api = {
    // 🚀 NEW REST ENDPOINTS
    getProjects: () => restCall('GET', '/api/projects'),
    getOrgStaff: () => restCall('GET', '/api/staff'),
    checkNotifications: () => restCall('GET', '/api/notifications/check'),

    // OS commands routed through Electron or HTTP fallback
    os: {
        pickFile: () => isElectron ? window.api.os.pickFile() : Promise.resolve(null),
        // Pointing to the new secure /api/os/download endpoint
        openFile: (filePath) => isElectron ? window.api.os.openFile(filePath) : window.open(`${SERVER_URL}/api/os/download?path=${encodeURIComponent(filePath)}`, '_blank'),
        // Pointing to the new secure /api/os/upload endpoint
        uploadFileWeb: (name, b64) => restCall('POST', '/api/os/upload', { filename: name, base64: b64 })
    }
};