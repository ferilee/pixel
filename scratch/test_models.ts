import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

async function test() {
  try {
    // There is no easy ListModels in the client library without raw fetch usually, 
    // but we can try common names.
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hi");
            console.log(`Success with ${m}`);
            return;
        } catch (e: any) {
            console.log(`Failed with ${m}: ${e.message}`);
        }
    }
  } catch (e: any) {
    console.error("General Failure:", e.message);
  }
}

test()
