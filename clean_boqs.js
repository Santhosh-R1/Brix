const SERVER_URL = "https://brix-backend-fw3v.onrender.com";

async function run() {
    console.log("Logging in...");
    const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
        console.error("Login failed:", loginData);
        return;
    }
    
    const token = loginData.data.token;
    console.log("Token acquired.");
    
    const boqRes = await fetch(`${SERVER_URL}/api/master-boqs`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const boqData = await boqRes.json();
    const boqs = boqData.data;
    console.log(`Found ${boqs.length} master boqs. Deleting concurrently...`);
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < boqs.length; i += BATCH_SIZE) {
        const batch = boqs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(boq => 
            fetch(`${SERVER_URL}/api/master-boqs/${boq.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ));
        console.log(`Deleted batch ${i / BATCH_SIZE + 1} / ${Math.ceil(boqs.length / BATCH_SIZE)}`);
    }
    
    console.log("All DATABOOK ASSEMBLIES deleted successfully.");
}

run();
