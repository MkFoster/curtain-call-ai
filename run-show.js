const { Board, Servo } = require("johnny-five");
const dmx = require("enttec-open-dmx-usb");
const dmxDevice = dmx.EnttecOpenDMXUSBDevice;
const fs = require("fs").promises;
const { spawn } = require("node:child_process");
const path = require("path");

const boardComPort = "COM6";

// Run the show
(async () => {
    let dmx;
    let board;
    let character1Servo;
    let character2Servo;

    let lightingEnabled = true;
    try {
        dmx = new dmxDevice(await dmxDevice.getFirstAvailableDevice());
    } catch (error) {
        console.log(
            "No DMX interface found.  Proceeding without lighting.  Error: ",
            error
        );
        lightingEnabled = false;
    }

    let boardEnabled = true;
    try {
        board = await getBoard(boardComPort);
        character1Servo = new Servo({
            pin: 10,
            range: [10, 170],
            startAt: 90,
        });

        character2Servo = new Servo({
            pin: 11,
            range: [10, 170],
            startAt: 90,
        });
    } catch (error) {
        console.log(
            "No Board found.  Proceeding without animations.  Error: ",
            error
        );
        boardEnabled = false;
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
                    dmx.setChannels(cueObj.channelValues);
                }
                break;
            case "wait":
                await sleep(cueObj.duration);
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
            case "animate":
                if (boardEnabled) {
                    let servo;
                    if (cueObj.character == "character1") {
                        servo = character1Servo;
                    } else if (cueObj.character == "character2") {
                        servo = character2Servo;
                    } else {
                        console.log("Unknown character animation.");
                    }
                    switch (cueObj.motion) {
                        case "faceForward":
                            servo.center();
                            break;
                        case "faceFullRight":
                            servo.min();
                            break;
                        case "faceFullLeft":
                            servo.max();
                            break;
                        case "facePartRight":
                            servo.to(50);
                            break;
                        case "facePartLeft":
                            servo.to(130);
                            break;
                        default:
                            console.log("Unknown motion.");
                    }
                }
                break;
            default:
                console.error(`Unknown cue type: ${cueObj.type}`);
                break;
        }
    }
    process.exit();
})();

async function sleep(durationMilliseconds) {
    await new Promise((resolve) => setTimeout(resolve, durationMilliseconds));
}

async function getBoard(arduinoComPort) {
    return new Promise((resolve, reject) => {
        const board = new Board({ port: arduinoComPort });
        board.on("ready", function () {
            // Board is ready, resolve the promise with the board object
            resolve(board);
        });
        board.on("error", function (error) {
            // Board error, reject the promise with the error
            reject(error);
        });
    });
}

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
