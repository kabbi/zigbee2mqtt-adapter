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
				mqttExpr: (v) => [v.from_side, v.to_side].join('->'),
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
				fromMqtt: (v) => v === 'ON',
				toMqtt: (v) => (v ? 'ON' : 'OFF'),
			},
			brightness: {
				'@type': 'BrightnessProperty',
				type: 'number',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				toMqtt: (v) => (v / 100) * 255,
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
	WSDCGQ11LM: {
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
			},
		},
	},
	SJCGQ11LM: {
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
			water_leak: {
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
	MCCGQ01LM: {
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
			contact: {
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
	'lumi.sensor_wleak.aq1': {
		name: 'Xiaomi Aqara Water Leak Sensor',
		'@type': ['LeakSensor'],
		properties: {
			battery: {
				type: 'integer',
				unit: 'percent',
				label: 'Battery',
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
			water_leak: {
				type: 'boolean',
				'@type': 'LeakProperty',
				readOnly: true,
			},
			tamper: {
				type: 'boolean',
				label: 'Tamper',
				'@type': 'BinaryProperty',
				readOnly: true,
			},
			battery_low: {
				type: 'boolean',
				label: 'Battery low',
				'@type': 'BinaryProperty',
				readOnly: true,
			},
			linkquality: {
				label: 'Link Quality',
				type: 'integer',
				readOnly: true,
			},
		},
	},
	DS01: {
		name: 'Sonoff Window/Door proximity Sensor',
		'@type': ['DoorSensor'],
		properties: {
			battery: {
				type: 'integer',
				unit: 'percent',
				label: 'Battery',
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
			contact: {
				type: 'boolean',
				'@type': 'OpenProperty',
				fromMqtt: (v) => !v,
				readOnly: true,
			},
			tamper: {
				type: 'boolean',
				label: 'Tamper',
				'@type': 'BinaryProperty',
				readOnly: true,
			},
			battery_low: {
				type: 'boolean',
				label: 'Battery low',
				'@type': 'BinaryProperty',
				readOnly: true,
			},
			linkquality: {
				label: 'Link Quality',
				type: 'integer',
				readOnly: true,
			},
		},
	},
	'RC 110': {
		name: 'Innr RC 110 Remote',
		'@type': ['PushButton'],
		properties: {
			state_main: {
				'@type': 'OnOffProperty',
				type: 'boolean',
				label: 'Main',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_main: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Scene',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			state_l1: {
				'@type': 'OnOffProperty',
				type: 'boolean',
				label: 'State 1',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_l1: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Level 1',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			state_l2: {
				'@type': 'OnOffProperty',
				type: 'boolean',
				label: 'State 2',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_l2: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Level 2',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			state_l3: {
				'@type': 'OnOffProperty',
				type: 'boolean',
				label: 'State 3',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_l3: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Level 3',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			state_l4: {
				'@type': 'OnOffProperty',
				type: 'boolean',
				label: 'State 4',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_l4: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Level 4',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			state_l5: {
				'@type': 'OnOffProperty',
				type: 'boolean',
				label: 'State 5',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_l5: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Level 5',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			state_l6: {
				'@type': 'OnOffProperty',
				label: 'State 6',
				type: 'boolean',
				fromMqtt: (v) => v === 'ON',
				readOnly: true,
			},
			brightness_l6: {
				'@type': 'LevelProperty',
				type: 'number',
				label: 'Level 6',
				minimum: 0,
				maximum: 100,
				fromMqtt: (v) => (v / 255) * 100,
				readOnly: true,
			},
			linkquality: {
				type: 'integer',
				readOnly: true,
			},
		},
		events: {
			scene_1: {
				'@type': 'PressedEvent',
			},
			scene_2: {
				'@type': 'PressedEvent',
			},
			scene_3: {
				'@type': 'PressedEvent',
			},
			scene_4: {
				'@type': 'PressedEvent',
			},
			scene_5: {
				'@type': 'PressedEvent',
			},
			scene_6: {
				'@type': 'PressedEvent',
			},
			on_l1: {
				'@type': 'PressedEvent',
			},
			on_l2: {
				'@type': 'PressedEvent',
			},
			on_l3: {
				'@type': 'PressedEvent',
			},
			on_l4: {
				'@type': 'PressedEvent',
			},
			on_l5: {
				'@type': 'PressedEvent',
			},
			on_l6: {
				'@type': 'PressedEvent',
			},
			off_l1: {
				'@type': 'PressedEvent',
			},
			off_l2: {
				'@type': 'PressedEvent',
			},
			off_l3: {
				'@type': 'PressedEvent',
			},
			off_l4: {
				'@type': 'PressedEvent',
			},
			off_l5: {
				'@type': 'PressedEvent',
			},
			off_l6: {
				'@type': 'PressedEvent',
			},
		},
	},
};
