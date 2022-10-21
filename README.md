Zigbee2Mqtt Adapter
-------------------

This adapter for both the [Candle Controller](https://www.candlesmarthome.com) and [WebThings Gateway](https://webthings.io/gateway/) allows to use awesome [zigbee2mqtt](http://zigbee2mqtt.io/) project to support lots of zigbee devices, even on a cheap `cc2531` usb stick zigbee dongle.

This addon uses the "exposes" feature of Zigbee2MQTT, so in theory it supports all the devices that Zigbee2MQTT supports. You can find the list of supported devices here:

https://www.zigbee2mqtt.io/information/supported_devices.html

Note that the latest available version on the Webthings Gateway is very old (0.6.5), while the version of the addon available on the Candle Controller is much newer, with more advanced features.

![WebThings gateway Zigbee2Mqtt screenshot](https://github.com/kabbi/zigbee2mqtt-adapter/blob/master/zigbee2mqtt_screenshot.png?raw=true)



## Installation

You can install this addon from the Candle App Store, although it comes pre-installed on the Candle disk image for the Raspberry Pi. Whenever it is freshly installed it will need 30 minutes to finalise the installation (by in turn downloading and installing the latest version of Zigbbee2MQTT). Please give it some time.


Alternatively, you can install it manually:

Download the addon
`git clone https://github.com/kabbi/zigbee2mqtt-adapter ~/.webthings/addons/zigbee2mqtt-adapter`

Go to the addon folder
`cd ~/.webthings/addons/zigbee2mqtt-adapter`

Get the addon to download the software it depends on
`npm install`

Optional: combine the now complete software into a package
`npm pack`

Then, reboot the WebThings gateway.

## Troubleshooting

"Resource temporarily unavailable Cannot lock port" means that something else is using your USB stick. Make sure you disable the other Zigbee addon.

"Cannot find module". We're not sure what causes this yet, but make sure you give the addon at least 30 minutes to install itself.

Before a manual installation you may want to update NPM, the package manager for NodeJS
`npm install -g npm`


