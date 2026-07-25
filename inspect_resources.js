const SERVER_URL = "https://brix-backend-fw3v.onrender.com";

async function run() {
    const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    
    const res = await fetch(`${SERVER_URL}/api/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const resources = data.data;
    
    console.log(`Total resources: ${resources.length}`);
    const codes = resources.map(r => r.code).slice(0, 100);
    console.log("Sample resource codes:");
    console.log(codes.join(', '));
    
}

run();
