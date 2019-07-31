module.exports = {
  'lumi.sensor_cube': {
    name: 'Xiaomi Magic Cube',
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
    },
    events: {
      wakeup: {
        '@type': 'AlarmEvent',
      },
      tap: {
        '@type': 'PressedEvent',
        type: 'integer',
        mqttField: 'side',
      },
      rotate_left: {
        type: 'number',
        mqttField: 'angle',
      },
      rotate_right: {
        type: 'number',
        mqttField: 'angle',
      },
      slide: {
        type: 'integer',
        mqttField: 'side',
      },
      flip90: {
        type: 'string',
        mqttExpr: v => [v.from_side, v.to_side].join('->'),
      },
      flip180: {
        type: 'integer',
        mqttField: 'side',
      },
      shake: {},
      fall: {},
    },
  },
  'lumi.light.aqcn02': {
    name: 'Aqara Bulb',
    '@type': ['Light', 'OnOffSwitch'],
    properties: {
      state: {
        '@type': 'OnOffProperty',
        type: 'boolean',
        fromMqtt: v => v === 'ON',
        toMqtt: v => (v ? 'ON' : 'OFF'),
      },
      brightness: {
        '@type': 'BrightnessProperty',
        type: 'number',
        minimum: 0,
        maximum: 100,
        fromMqtt: v => (v / 255) * 100,
        toMqtt: v => (v / 100) * 255,
      },
      color_temp: {
        type: 'integer',
        minimum: 0,
        maximum: 500,
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
    },
  },
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
  'lumi.sensor_magnet.aq2': {
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
  'lumi.sens': {
    name: 'Xiaomi Temperature & Humidity Sensor',
    '@type': ['TemperatureSensor'],
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
      temperature: {
        type: 'number',
        '@type': 'TemperatureProperty',
        unit: 'degree celsius',
        readOnly: true,
      },
      humidity: {
        type: 'number',
        unit: 'percent',
        readOnly: true,
      },
    },
  },
};
