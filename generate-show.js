/**
 * Entry point for Curtain Call AI
 *
 * Run using "node --env-file=.env generate-show.js"
 * Access the Gemini API Key using process.env.API_KEY
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require("@google-cloud/text-to-speech");
const fsp = require("fs").promises;
const fs = require("fs");
const OpenAI = require("openai");
const { pipeline } = require("node:stream/promises");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function generateScript() {
    // For text-only input, use the gemini-pro model
    const modelName = "gemini-1.5-pro-latest";
    const model = genAI.getGenerativeModel({ model: modelName });

    // Get the prompt text from a file
    const promptFile = "prompts/generate-show-prompt.txt";
    console.log(`Loading prompt from ${promptFile}`);
    const prompt = await fsp.readFile(promptFile, "utf-8");

    console.log("Calling ", modelName);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawJSON = response.text();
    const rawJSONClean1 = rawJSON.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        (m, g) => (g ? "" : m)
    );
    const rawJSONCleaned = rawJSONClean1
        .replace("```json", "")
        .replace("```", "")
        .replace("---", "")
        .replace("```", "");
    // Save the JSON response to a file for future reference
    try {
        const showScriptFile = "shows/script.json";
        console.log(`Writing show script to ${showScriptFile}`);
        await fsp.writeFile(showScriptFile, rawJSONCleaned);
        console.log(`Script saved to ${showScriptFile}`);
    } catch (error) {
        console.error("Error saving script:", error);
    }

    const showObj = JSON.parse(rawJSONCleaned);
    return showObj;
}

async function generateScriptAudio(character, line, audioFile) {
    // Creates a client
    const client = new textToSpeech.TextToSpeechClient();

    voice = {
        languageCode: "en-US",
    };
    // At this point the show only supports two characters
    if (character == "character1") {
        voice["name"] = "en-US-Neural2-H";
        voice["ssmlGender"] = "FEMALE";
    } else {
        voice["name"] = "en-US-Standard-I";
        voice["ssmlGender"] = "MALE";
    }
    // Construct the request
    const request = {
        input: { text: line },
        // Select the language and voice
        voice: voice,
        // Select the type of audio encoding
        audioConfig: { audioEncoding: "MP3" },
    };

    // Performs the Text-to-Speech request
    const [response] = await client.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = fs.writeFile;
    const fileName = `shows/${audioFile}`;
    writeFile(fileName, response.audioContent, "binary", (err) => {
        if (err) {
            console.error("ERROR:", err);
            return;
        }
        console.log(`Audio content written to file: ${fileName}`);
    });
}

async function generateAndDownloadImage(prompt, bgImageFile) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_KEY,
        });

        const image = await openai.images.generate({
            model: "dall-e-3",
            size: "1792x1024",
            prompt: prompt,
        });

        //const revisedPrompt = image.data[0].revised_prompt;
        const imageURL = image.data[0].url;

        // Download the image from the imageURL and save it to a file
        const response = await fetch(imageURL);
        if (!response.ok) {
            throw new Error(
                `Failed to fetch the image: ${response.statusText}`
            );
        }
        await pipeline(response.body, fs.createWriteStream(bgImageFile));
        console.log(`Image generated and written to file: ${bgImageFile}`);
    } catch (error) {
        console.error("Failed to generate or download the image:", error);
    }
}

// Loop over the show cues and generate voice audio, images, etc.
async function generateShowAssets(scriptObj) {
    for (let i = 0; i < scriptObj.cues.length; i++) {
        const cueObj = scriptObj.cues[i];
        switch (cueObj.type) {
            case "script":
                await generateScriptAudio(
                    cueObj.character,
                    cueObj.line,
                    cueObj.audioFile
                );
                break;
            case "background":
                await generateAndDownloadImage(
                    cueObj.imagePrompt,
                    `shows/${cueObj.bgImageFile}`
                );
                break;
        }
    }
}

(async () => {
    // Generate our script including lighting cues
    const script = await generateScript();

    // Generate show assets including audio files, images, etc.
    await generateShowAssets(script);
})();
