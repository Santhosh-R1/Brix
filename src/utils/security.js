export const verifyProjectAccess = (currentUser, project) => {
    // 1. Super Admins bypass all locks
    if (currentUser.accessLevel >= 5) return true;

    // 2. Parse Granular Permissions from the database
    // Assuming your granular UI saves data into the `assignedStaff` column
    let assignedStaff = [];
    try {
        assignedStaff = JSON.parse(project.assignedStaff || "[]");
    } catch (e) {
        assignedStaff = [];
    }

    // 3. Find this specific user's granular rule
    const userGranularRule = assignedStaff.find(
        staff => staff === currentUser.id || staff.id === currentUser.id
    );

    // --- ENFORCE HYBRID ACCESS CONTROL ---

    // SCENARIO A: The user has an explicit rule set in the granular UI
    if (userGranularRule) {
        // If your UI saves complex objects like { id: 'uuid', access: 'blocked' }
        if (userGranularRule.access === 'blocked') {
            return false; // 🔥 Explicit Deny overrides Level 4 clearance
        }

        // If they are explicitly allowed or just present in a simple array
        return true;
    }

    // SCENARIO B: No specific granular rule exists for this user.
    // Fallback to your standard level-based system.
    // E.g., Level 4 (Managers) can see un-restricted projects by default.
    return currentUser.accessLevel >= 4;
};