const dmx = require("enttec-open-dmx-usb");
const dmxDevice = dmx.EnttecOpenDMXUSBDevice;
let device;

// Initialize DMX devices
(async () => {
    device = new dmxDevice(await dmxDevice.getFirstAvailableDevice());
    device.setChannels({
        [1]: 255,
        [2]: 0,
        [3]: 0,
        [4]: 0,
        [9]: 255,
        [10]: 0,
        [11]: 0,
        [12]: 0,
    });

    device.setChannels({
        [1]: 255,
        [2]: 255,
        [3]: 0,
        [4]: 0,
        [9]: 255,
        [10]: 255,
        [11]: 0,
        [12]: 0,
    });
})();
