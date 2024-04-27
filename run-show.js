const dmx = require("enttec-open-dmx-usb");
const dmxDevice = dmx.EnttecOpenDMXUSBDevice;
const fs = require("fs").promises;
const textToSpeech = require("@google-cloud/text-to-speech");
const { spawn } = require("node:child_process");
const path = require("path");

let device;

async function playMP3(mp3Path) {
    try {
        // Spawn the cmdmp3.exe process
        const child = spawn("cmdmp3.exe", [mp3Path]);

        console.log("Playing :", mp3Path);
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
    } catch (error) {
        console.error("Error playing MP3:", error);
    }
}

async function displayImage(imagePath) {
    try {
        // Spawn the Irfanview process
        const child = spawn(
            "C:\\Program Files\\IrfanView\\i_view64.exe",
            [imagePath, "/fs"],
            {
                detached: true,
                stdio: "ignore",
            }
        );
        child.unref();
        console.log("Displaying :", imagePath);
    } catch (error) {
        console.error("Error displaying image:", error);
    }
}

// Run the show
(async () => {
    let lightingEnabled = true;
    try {
        device = new dmxDevice(await dmxDevice.getFirstAvailableDevice());
    } catch (error) {
        console.log(
            "No DMX interface found.  Proceeding without lighting.  Error: ",
            error
        );
        lightingEnabled = false;
    }

    const showFolder = "shows" + path.sep;
    const soundFolder = "sound-effects" + path.sep;
    const rawJSON = await fs.readFile(showFolder + "script.json", "utf8");
    const show = JSON.parse(rawJSON);

    for (let i = 0; i < show.cues.length; i++) {
        const cueObj = show.cues[i];
        switch (cueObj.type) {
            case "lights":
                if (lightingEnabled) {
                    device.setChannels(cueObj.channelValues);
                }
                break;
            case "wait":
                await new Promise((resolve) =>
                    setTimeout(resolve, cueObj.duration)
                );
                break;
            case "script":
                await playMP3(showFolder + cueObj.audioFile);
                break;
            case "soundEffect":
                await playMP3(soundFolder + cueObj.audioFile);
                break;
            case "background":
                await displayImage(
                    __dirname + path.sep + showFolder + cueObj.bgImageFile
                );
                break;
            default:
                console.error(`Unknown cue type: ${cueObj.type}`);
                break;
        }
    }
    process.exit();
})();
