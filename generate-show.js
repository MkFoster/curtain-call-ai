/**
 * Entry point for Curtain Call AI
 *
 * Run using "node --env-file=.env generate-show.js"
 * Access the Gemini API Key using process.env.API_KEY
 */

const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require("@google-cloud/text-to-speech");
const fsp = require("fs").promises;
const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const imageGenEndpointUrl = `https://${process.env.GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/publishers/google/models/imagegeneration@006:predict`;

async function getAccessToken() {
    try {
        const { stdout } = await exec("gcloud auth print-access-token");
        return stdout.trim(); // Remove any trailing newline characters
    } catch (error) {
        console.error("Error getting access token:", error);
        throw error; // Re-throw to allow handling in generateImage function
    }
}

async function generateScript(showTheme) {
    // For text-only input, use the gemini-pro model
    const modelName = "gemini-1.5-pro-latest";
    const model = genAI.getGenerativeModel({
        model: modelName,
        generation_config: { response_mime_type: "application/json" },
    });

    // Get the prompt text from a file
    const promptFile = "prompts/generate-show-prompt.txt";
    console.log(`Loading prompt from ${promptFile}`);
    let prompt = await fsp.readFile(promptFile, "utf-8");

    // Add show theme to the prompt if provided
    if (showTheme) {
        prompt += `\nTheme: ${showTheme}`;
    }

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
    const requestData = {
        instances: [
            {
                prompt: prompt,
            },
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
        },
    };
    try {
        // Get access token (replace with your actual method)
        const accessToken = await getAccessToken(); // Replace with your token retrieval method

        const response = await axios.post(imageGenEndpointUrl, requestData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json; charset=utf-8",
            },
        });

        // Parse the response
        const responseData = response.data;
        if (responseData.error || !responseData.predictions) {
            console.error("Error generating image:", responseData.error);
            console.log("Response data:", responseData);
            return;
        }

        const imageDataBase64 = responseData.predictions[0].bytesBase64Encoded;

        // Decode base64 and save image
        const buffer = Buffer.from(imageDataBase64, "base64");
        fs.writeFileSync(bgImageFile, buffer);
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
    // Prompt the user for a show theme
    readline.question("Enter a show theme (optional): ", async (showTheme) => {
        // Generate our script including lighting cues
        const script = await generateScript(showTheme);

        // Generate show assets including audio files, images, etc.
        await generateShowAssets(script);

        readline.close();
    });
})();
