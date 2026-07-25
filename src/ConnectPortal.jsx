import React, { useState, useEffect } from 'react';

export default function ConnectPortal({ onConnected }) {
    const [url, setUrl] = useState(import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const savedUrl = localStorage.getItem('openprix_last_server');
        if (savedUrl) setUrl(savedUrl);
    }, []);

    const handleConnect = async () => {
        let targetUrl = url.trim();
        if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);

        setIsConnecting(true);
        setError(false);

        try {
            // Ping the Rust Daemon's health route!
            const response = await fetch(`${targetUrl}/api/health`);
            if (response.ok) {
                localStorage.setItem('openprix_last_server', targetUrl);

                // 🚀 Tell the main app we are ready to boot up the ERP!
                onConnected();
            } else {
                throw new Error("Rejected");
            }
        } catch (e) {
            setError(true);
            setIsConnecting(false);
        }
    };

    // The styles perfectly match your old native portal
    return (
        <div style={styles.body}>
            <div style={styles.container}>
                <h1 style={styles.h1}>// BRIX_CLIENT</h1>
                <p style={styles.p}>Enter the IPv4 Address or Hostname of the Server Daemon.</p>

                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={styles.input}
                    placeholder={import.meta.env.VITE_API_URL || "http://127.0.0.1:3000"}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />

                <button
                    onClick={handleConnect}
                    style={styles.button}
                    disabled={isConnecting}
                >
                    {isConnecting ? "CONNECTING..." : "INITIALIZE CONNECTION"}
                </button>

                {error && (
                    <div style={styles.error}>Connection failed. Verify the server is running.</div>
                )}
            </div>
        </div>
    );
}

const styles = {
    body: { backgroundColor: '#060e1a', color: '#e2e8f0', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', margin: 0 },
    container: { background: 'rgba(13, 31, 60, 0.7)', padding: '40px', borderRadius: '8px', border: '1px solid #1e3a5f', width: '400px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)' },
    h1: { fontSize: '24px', marginBottom: '8px', letterSpacing: '-0.5px', color: '#ffffff', marginTop: 0 },
    p: { color: '#94a3b8', fontSize: '14px', marginBottom: '24px' },
    input: { width: '100%', boxSizing: 'border-box', padding: '12px', marginBottom: '20px', background: '#0c1929', border: '1px solid #3b82f6', color: '#fff', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', textAlign: 'center', outline: 'none' },
    button: { width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', letterSpacing: '1px' },
    error: { color: '#ef4444', fontSize: '13px', marginTop: '16px' }
};