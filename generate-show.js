/**
 * Entry point for Curtain Call AI
 *
 * Run using "node --env-file=.env index.js"
 * Access the Gemini API Key using process.env.API_KEY
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require("@google-cloud/text-to-speech");
const fs = require("fs").promises;

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function generateScript() {
    // For text-only input, use the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

    // Get the prompt text from a file
    const promptFile = "prompts/generate-show-prompt.txt";
    console.log(`Loading prompt from ${promptFile}`);
    const prompt = await fs.readFile(promptFile, "utf-8");

    console.log("Calling Gemini");
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
        await fs.writeFile(showScriptFile, rawJSONCleaned);
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
    const writeFile = require("fs").writeFile;
    const fileName = `shows/${audioFile}`;
    writeFile(fileName, response.audioContent, "binary", (err) => {
        if (err) {
            console.error("ERROR:", err);
            return;
        }
        console.log(`Audio content written to file: ${fileName}`);
    });
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
        }
    }
}

(async () => {
    // Generate our script including lighting cues
    const script = await generateScript();

    // Generate show assets including audio files, images, etc.
    await generateShowAssets(script);
})();
