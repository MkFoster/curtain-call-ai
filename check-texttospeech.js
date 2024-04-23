const textToSpeech = require("@google-cloud/text-to-speech");
const { spawn } = require("node:child_process");

async function synthesizeText(text) {
    // Creates a client
    const client = new textToSpeech.TextToSpeechClient();
    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and voice
        voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
        // Select the type of audio encoding
        audioConfig: { audioEncoding: "MP3" },
    };

    // Performs the Text-to-Speech request
    const [response] = await client.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = require("fs").writeFile;
    const fileName = "output.mp3";
    writeFile(fileName, response.audioContent, "binary", (err) => {
        if (err) {
            console.error("ERROR:", err);
            return;
        }
        console.log(`Audio content written to file: ${fileName}`);
        await(playMP3(fileName));
    });
}

async function playMP3(mp3Path) {
    try {
        // Spawn the cmdmp3.exe process
        const child = spawn("cmdmp3.exe", [mp3Path]);

        // Wait for the process to exit
        await new Promise((resolve, reject) => {
            child.on("error", reject);
            child.on("exit", (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`cmdmp3.exe exited with code ${code}`));
                }
            });
        });

        console.log("MP3 playback finished!");
    } catch (error) {
        console.error("Error playing MP3:", error);
    }
}

// Example usage:
synthesizeText("This is an example of text-to-speech with Google Cloud API.");
