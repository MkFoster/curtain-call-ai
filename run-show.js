const dmx = require("enttec-open-dmx-usb");
const dmxDevice = dmx.EnttecOpenDMXUSBDevice;
const fs = require("fs").promises;

let device;

// Initialize DMX devices
(async () => {
    device = new dmxDevice(await dmxDevice.getFirstAvailableDevice());

    const rawJSON = await fs.readFile("showsscript1.json", "utf8");
    const show = JSON.parse(rawJSON);

    for (let i = 0; i < show.cues.length; i++) {
        const cueObj = show.cues[i];
        switch (cueObj.type) {
            case "lights":
                device.setChannels(cueObj.channelValues);
                break;
            case "wait":
                await new Promise((resolve) =>
                    setTimeout(resolve, cueObj.duration)
                );
                break;
            default:
                console.error(`Unknown cue type: ${cueObj.type}`);
                break;
        }
    }
})();
