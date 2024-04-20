/**
 * Entry point for Curtain Call AI
 * 
 * Run using "node --env-file=.env --env-file=.env index.js"
 * Access the Gemini API Key using process.env.API_KEY
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function run() {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    // Get the prompt text from a file
    const prompt = await fs.readFile('show-prompt.txt', 'utf-8');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
}

run();
