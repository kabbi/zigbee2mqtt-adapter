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
  'lumi.weather': {
    name: 'Xiaomi Aquara Temperature & Humidity & Pressure Sensor',
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
	multipleOf: 0.1,
        readOnly: true,
      },
      humidity: {
        type: 'number',
        unit: 'percent',
	multipleOf: 0.5,
        readOnly: true,
      },
      pressure: {
        type: 'number',
        unit: 'hPa',
	multipleOf: 0.5,
        readOnly: true,
      },
    },
  },
'WSDCGQ11LM': {
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
      pressure: {
        type: 'integer',
        unit: 'hPa',
        readOnly: true,
      }
    },
  },
  "SJCGQ11LM": {
    name: 'Xiaomi Aqara Water Leak Sensor',
    '@type': ['BinarySensor'],
    properties: {
      battery: {
        type: 'integer',
        unit: 'percent',
        minimum: 0,
        maximum: 100,
        readOnly: true,
      },
      voltage: {
        type: 'integer',
        '@type': 'VoltageProperty',
        unit: 'volt',
        readOnly: true,
      },
      "water_leak": {
        type: 'boolean',
        '@type': 'BooleanProperty',
        readOnly: true,
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
    },
  },
  "MCCGQ01LM": {
    name: 'Aqara door & window contact sensor',
    '@type': ['BinarySensor'],
    properties: {
      battery: {
        type: 'integer',
        unit: 'percent',
        minimum: 0,
        maximum: 100,
        readOnly: true,
      },
      voltage: {
        type: 'integer',
        '@type': 'VoltageProperty',
        unit: 'volt',
        readOnly: true,
      },
      "contact": {
        type: 'boolean',
        '@type': 'BooleanProperty',
        readOnly: true,
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
    },
  },
  'LED1537R6': {
    name: 'Ikea Tradfri spot',
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
        maximum: 255
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
  'TRADFRI bulb E14 WS 470lm': {
    name: 'IKEA TRADFRI bulb E14 WS 470 lumen, dimmable, white spectrum, opal white (LED1903C5/LED1835C6)',
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
        maximum: 255
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
  'TRADFRI bulb E27 WW 806lm': {
    name: 'IKEA TRADFRI LED bulb E26/E27 806 lumen, dimmable, warm white (LED1836G9)',
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
        maximum: 255
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
    },
  },
  'TRADFRI Driver 10W': {
    name: 'IKEA TRADFRI driver for wireless control (10 watt) (ICPSHC24-10EU-IL-1)',
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
        maximum: 255
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
    },
  },
  'TRADFRI Driver 30W': {
    name: 'IKEA TRADFRI driver for wireless control (30 watt) (ICPSHC24-30EU-IL-1)',
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
        maximum: 255
      },
      linkquality: {
        type: 'integer',
        readOnly: true,
      },
    },
  }
};
