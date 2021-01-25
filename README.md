Zigbee2Mqtt Adapter
-------------------

This adapter for [WebThings Gateway by Mozilla](https://iot.mozilla.org/gateway/) allows to use awesome [zigbee2mqtt](http://zigbee2mqtt.io/) project to support lots of zigbee devices on a cheap `cc2531` usb stick zigbee dongle.

Currently supported devices:
- Aqara ZigBee Light Bulb
- Xiaomi Magnet Sensor
- Xiaomi Magic Cube

You can add new ones to `devices.js` like this:

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


#Installation

Download the addon
`git clone https://github.com/kabbi/zigbee2mqtt-adapter ~\.webthings\addons\zigbee2mqtt-adapter`

Update NPM, the package manager for NodeJS
`npm install -g npm`

Go to the addon folder
`cd ~\.webthings\addons\zigbee2mqtt-adapter`

Get the addon to download the software it depends on
`npm install`

Combine the now complete software into a package
`npm pack`

Then, reboot the WebThings gateway.
