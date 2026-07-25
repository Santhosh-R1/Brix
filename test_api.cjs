const http = require('http');

const baseUrl = 'http://127.0.0.1:3000/api';

async function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${baseUrl}${path}`);
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log("🚀 Starting OpenPrix API Integration Tests...\n");
    let passed = 0;
    let failed = 0;

    const assert = (name, condition, msg) => {
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name} - ${msg}`);
            failed++;
        }
    };

    try {
        // --- 1. SETTINGS ---
        let res = await request('POST', '/settings/test_key', { value: { test: 123 } });
        assert('Save Settings', res.data?.success === true, JSON.stringify(res.data));

        res = await request('GET', '/settings/test_key');
        assert('Get Settings', res.data?.success === true && res.data?.data?.test === 123, JSON.stringify(res.data));

        // --- 2. STAFF (Auth & CRUD) ---
        res = await request('POST', '/staff', {
            name: "Test Staff", designation: "QA", department: "Testing",
            status: "Active", email: "qa@test.com", phone: "123",
            username: "tester", password: "pwd", role: "Staff", accessLevel: 2
        });
        assert('Create Staff', res.data?.success === true, JSON.stringify(res.data));
        const staffId = res.data.data;

        res = await request('GET', '/staff');
        assert('Get Staff', res.data?.success === true && Array.isArray(res.data.data), JSON.stringify(res.data));

        res = await request('POST', '/auth/login', { username: "tester", password: "pwd" });
        assert('Auth Login', res.data?.success === true && res.data.data?.id === staffId, JSON.stringify(res.data));

        // --- 3. PROJECTS ---
        res = await request('POST', '/projects', {
            name: "Test Project", code: "TEST01", clientName: "Client A",
            status: "Planning", region: "North", type: "Residential", location: "City"
        });
        assert('Create Project', res.data?.success === true, JSON.stringify(res.data));
        const projectId = res.data.data;

        res = await request('GET', '/projects');
        assert('Get Projects', res.data?.success === true && Array.isArray(res.data.data), JSON.stringify(res.data));

        res = await request('GET', `/projects/${projectId}`);
        assert('Get Single Project', res.data?.success === true && res.data.data?.id === projectId, JSON.stringify(res.data));

        res = await request('PUT', `/projects/${projectId}`, { name: "Updated Project" });
        assert('Update Project', res.data?.success === true, JSON.stringify(res.data));

        // --- 4. MASTER BOQ ---
        res = await request('POST', '/master-boqs', {
            isNew: true,
            payload: {
                itemCode: "MB-01", description: "Master Item", unit: "m2",
                overhead: 10.0, profit: 15.0
            }
        });
        assert('Create Master BOQ', res.data?.success === true, JSON.stringify(res.data));
        const masterBoqId = res.data.data;

        res = await request('GET', '/master-boqs');
        assert('Get Master BOQs', res.data?.success === true, JSON.stringify(res.data));

        // --- 5. PROJECT BOQ ---
        res = await request('POST', '/boqs', {
            projectId: projectId, masterBoqId: masterBoqId, slNo: 1, isCustom: 0,
            itemCode: "MB-01", description: "Proj Item", unit: "m2", rate: 100.0, formulaStr: "10*10",
            qty: 100.0, phase: "Foundation"
        });
        assert('Create Project BOQ', res.data?.success === true, JSON.stringify(res.data));
        const projBoqId = res.data.data;

        res = await request('GET', `/projects/${projectId}/boqs`);
        assert('Get Project BOQs', res.data?.success === true, JSON.stringify(res.data));

        res = await request('PUT', `/boqs/${projBoqId}`, { 
            projectId: projectId, slNo: 1, isCustom: 0,
            itemCode: "MB-01", description: "Updated Proj Item", unit: "m2", rate: 100.0, formulaStr: "10*20",
            qty: 200.0, phase: "Foundation" 
        });
        assert('Update Project BOQ', res.data?.success === true, JSON.stringify(res.data));

        // --- 6. RESOURCES ---
        res = await request('POST', '/resources', {
            code: "RES-01", description: "Cement", unit: "bag"
        });
        assert('Create Resource', res.data?.success === true, JSON.stringify(res.data));
        const resId = res.data.data;

        res = await request('GET', '/resources');
        assert('Get Resources', res.data?.success === true, JSON.stringify(res.data));

        res = await request('PUT', `/resources/${resId}`, { field: "rates", value: "{}" });
        assert('Update Resource', res.data?.success === true, JSON.stringify(res.data));

        // --- 7. WORKLOGS ---
        res = await request('POST', '/worklogs', {
            date: "2024-01-01", staffId: staffId, slNo: 1, projectId: projectId,
            details: "Did work", remarks: "Site", status: "Completed"
        });
        assert('Create Worklog', res.data?.success === true, JSON.stringify(res.data));
        const logId = res.data.data;

        res = await request('GET', '/worklogs');
        assert('Get Worklogs', res.data?.success === true, JSON.stringify(res.data));

        res = await request('PUT', `/worklogs/${logId}`, { 
            date: "2024-01-01", staffId: staffId, slNo: 1, projectId: projectId,
            details: "Did work updated", remarks: "Site", status: "Ongoing" 
        });
        assert('Update Worklog', res.data?.success === true, JSON.stringify(res.data));

        // --- 8. CRM ---
        const crmId = "crm_1";
        res = await request('POST', '/crm', {
            id: crmId, name: "John Doe", company: "Company Inc", type: "Client", status: "Active",
            email: "john@inc.com", phone: "123", createdAt: Date.now()
        });
        assert('Create CRM', res.data?.success === true, JSON.stringify(res.data));

        res = await request('GET', '/crm');
        assert('Get CRM', res.data?.success === true, JSON.stringify(res.data));

        // --- 9. MESSAGES ---
        const msgId = "msg_1";
        res = await request('POST', '/messages', {
            id: msgId, projectId: projectId, senderId: staffId, content: "Hello Project", replyToId: "", createdAt: Date.now()
        });
        assert('Create Channel Message', res.data?.success === true, JSON.stringify(res.data));

        res = await request('GET', '/messages');
        assert('Get Channel Messages', res.data?.success === true, JSON.stringify(res.data));

        // --- CLEANUP ---
        await request('DELETE', `/messages/${msgId}`);
        await request('DELETE', `/crm/${crmId}`);
        await request('DELETE', `/worklogs/${logId}`);
        await request('DELETE', `/resources/${resId}`);
        await request('DELETE', `/boqs/${projBoqId}`);
        await request('DELETE', `/master-boqs/${masterBoqId}`);
        await request('DELETE', `/projects/${projectId}`);
        await request('DELETE', `/staff/${staffId}`);

    } catch (err) {
        console.error("Test execution failed:", err);
    }

    console.log(`\n📊 RESULTS: ${passed} Passed | ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
