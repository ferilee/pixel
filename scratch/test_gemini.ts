import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
    const result = await model.generateContent("Hi");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
}

test()
