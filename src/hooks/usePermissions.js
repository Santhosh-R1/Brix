import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
    const { currentUser } = useAuth();

    const canAccess = (viewId) => {
        if (!currentUser) return false;
        
        // Root Admin Bypass
        const level = Number(currentUser.access_level || currentUser.accessLevel);
        if (level >= 5) return true;

        // Default public views
        if (viewId === 'home') return true;

        try {
            const raw = currentUser.global_permissions || currentUser.globalPermissions;
            if (!raw) return false;
            const perms = typeof raw === 'string' ? JSON.parse(raw) : raw;

            if (Array.isArray(perms)) return perms.includes(viewId);
            return perms[viewId] === 'allowed' || perms[viewId] === true;
        } catch (e) {
            return false;
        }
    };

    return { canAccess, currentUser };
};