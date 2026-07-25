import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// 📦 FETCHING HOOKS (Queries)
// These replace your manual useEffect loadData() calls. They automatically
// cache data and prevent redundant network requests.
// ============================================================================

export const useProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: () => window.api.db.getProjects()
    });
};

export const useStaff = () => {
    return useQuery({
        queryKey: ['staff'],
        queryFn: () => window.api.db.getOrgStaff()
    });
};

export const useCrmContacts = () => {
    return useQuery({
        queryKey: ['crmContacts'],
        queryFn: () => window.api.db.getCrmContacts()
    });
};

export const useMasterBoqs = () => {
    return useQuery({
        queryKey: ['masterBoqs'],
        queryFn: () => window.api.db.getMasterBoqs()
    });
};

export const useResources = () => {
    return useQuery({
        queryKey: ['resources'],
        queryFn: () => window.api.db.getResources()
    });
};

export const useRegions = () => {
    return useQuery({
        queryKey: ['regions'],
        queryFn: () => window.api.db.getRegions()
    });
};

export const useWorkLogs = () => {
    return useQuery({
        queryKey: ['worklogs'],
        queryFn: () => window.api.db.getWorkLogs()
    });
};

// ============================================================================
// ⚡ MUTATION HOOKS (Saves, Updates, Deletes)
// These replace your manual save/delete functions. When they succeed, they
// automatically tell React Query to refetch the associated data, instantly
// updating your UI without needing to call loadData()!
// ============================================================================

export const useSaveStaff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (staffData) => window.api.db.saveOrgStaff(staffData),
        onSuccess: () => {
            // Instantly refresh the staff table when a save is successful
            queryClient.invalidateQueries({ queryKey: ['staff'] });
        }
    });
};

export const useDeleteStaff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => window.api.db.deleteOrgStaff(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] })
    });
};

export const useSaveCrm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (crmData) => window.api.db.saveCrmContact(crmData),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crmContacts'] })
    });
};

export const useDeleteCrm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => window.api.db.deleteCrmContact(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crmContacts'] })
    });
};
export const useDeleteMasterBoq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => window.api.db.deleteMasterBoq(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masterBoqs'] })
    });
};

// ============================================================================
// 🏗️ PROJECT SPECIFIC HOOKS
// ============================================================================

export const useProject = (id) => {
    return useQuery({
        queryKey: ['project', id],
        queryFn: () => window.api.db.getProject(id),
        enabled: !!id // Only fetch if an ID is provided
    });
};

export const useProjectBoqs = (id) => {
    return useQuery({
        queryKey: ['projectBoqs', id],
        queryFn: () => window.api.db.getProjectBoqs(id),
        enabled: !!id
    });
};

export const useProjectDocs = (id) => {
    return useQuery({
        queryKey: ['projectDocs', id],
        queryFn: () => window.api.db.getProjectDocuments(id),
        enabled: !!id
    });
};

// --- PROJECT MUTATIONS ---

export const useUpdateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => window.api.db.updateProject(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['projects'] }); // Also refresh the main list
        }
    });
};

export const useSaveProjectBoq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => window.api.db.addProjectBoq(data),
        onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ['projectBoqs', variables.projectId] })
    });
};

export const useUpdateProjectBoq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, projectId, data }) => window.api.db.updateProjectBoq(id, data),
        onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ['projectBoqs', variables.projectId] })
    });
};

export const useDeleteProjectBoq = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, projectId }) => window.api.db.deleteProjectBoq(id),
        onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ['projectBoqs', variables.projectId] })
    });
};