Zigbee2Mqtt Adapter
-------------------

This adapter for [WebThings Gateway](https://webthings.io/gateway/) allows to use awesome [zigbee2mqtt](http://zigbee2mqtt.io/) project to support lots of zigbee devices, even on a cheap `cc2531` usb stick zigbee dongle.

This addon uses the "exposes" feature of Zigbee2MQTT, so in theory it supports all the devices that Zigbee2MQTT supports. You can find the list of supported devices here:

https://www.zigbee2mqtt.io/information/supported_devices.html

![WebhThings gateway Zigbee2Mqtt screenshot](https://github.com/kabbi/zigbee2mqtt-adapter/blob/master/zigbee2mqtt_screenshot.png?raw=true)


This addon is able to 'generically' handle Zigbee devices, so there is no need to manually add support for new devices anymore. However, while this is done automatically, in some rare cases it may be worthwhile to have this addon support a device more specifically. For those cases the `devices.js` file may be used. You can add specific devices to it like this:

```js
{
  'lumi.sensor_magnet': {
    name: 'Xiaomi Magnet Contact Sensor',
    '@type': ['BinarySensor'],
    properties: {
      battery: {
        type: 'integer',
        unit: 'percent',
        minimum: 0,
        maximum: 100,
        readOnly: true,
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
      contact: {
        type: 'boolean',
        '@type': 'BooleanProperty',
        readOnly: true,
      },
    },
  },
}
```


## Installation

You can install this addon by simply selecting it in the WebThings Gateway. After adding it, it will need 30 minutes to fully install itself. Please give it some time.


Alternatively, you can install it manually:

Download the addon
`git clone https://github.com/kabbi/zigbee2mqtt-adapter ~/.webthings/addons/zigbee2mqtt-adapter`

Update NPM, the package manager for NodeJS
`npm install -g npm`

Go to the addon folder
`cd ~/.webthings/addons/zigbee2mqtt-adapter`

Get the addon to download the software it depends on
`npm install`

Combine the now complete software into a package
`npm pack`

Then, reboot the WebThings gateway.

## Troubleshooting

"Resource temporarily unavailable Cannot lock port" means that something else is using your USB stick. Make sure you disable the other Zigbee addon.

"Cannot find module". We're not sure what causes this yet, but make sure you give the addon at least 30 minutes to install itself.

If you want to fully uninstall the addon:
- remove the addon in the interface
- run this command using the Seashell addon: `rm -rf ~/.webthings/data/zigbee2mqtt-adapter`
- reboot
