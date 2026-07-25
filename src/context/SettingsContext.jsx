import React, { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    // Default fallback settings
    const [settings, setSettings] = useState({
        currencySymbol: '₹',
        currencyLocale: 'en-IN', // en-IN = 1,00,000 | en-US = 100,000
        unitSystem: 'Metric'
    });

    const refreshSettings = async () => {
        const data = await window.api.db.getSettings('company_info');
        if (data) {
            setSettings(prev => ({
                ...prev,
                ...data,
                // Ensure fallbacks if data is missing
                currencySymbol: data.currencySymbol || '₹',
                currencyLocale: data.currencyLocale || 'en-IN'
            }));
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    // Helper function to format money instantly anywhere in the app
    const formatCurrency = (value, showSymbol = true) => {
        const num = Number(value || 0);
        const formattedStr = num.toLocaleString(settings.currencyLocale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        return showSymbol ? `${settings.currencySymbol} ${formattedStr}` : formattedStr;
    };

    return (
        <SettingsContext.Provider value={{ settings, refreshSettings, formatCurrency }}>
            {children}
        </SettingsContext.Provider>
    );
}

// Custom hook for easy access
export const useSettings = () => useContext(SettingsContext);