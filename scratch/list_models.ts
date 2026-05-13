const API_KEY = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.models) {
            console.log("Available models:", data.models.map(m => m.name));
        } else {
            console.log("Error:", data);
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
