/**
 *
 * VirtualThingsAdapter - an adapter for trying out virtual things
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

let Action, Adapter, Device, Event, Property;
try {
  Adapter = require('../adapter');
  Device = require('../device');
  Property = require('../property');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }

  const gwa = require('gateway-addon');
  Action = gwa.Action;
  Adapter = gwa.Adapter;
  Device = gwa.Device;
  Event = gwa.Event;
  Property = gwa.Property;
}

function bool() {
  return {
    name: 'on',
    value: false,
    metadata: {
      label: 'On/Off',
      type: 'boolean',
      '@type': 'BooleanProperty',
    },
  };
}

function on() {
  return {
    name: 'on',
    value: false,
    metadata: {
      label: 'On/Off',
      type: 'boolean',
      '@type': 'OnOffProperty',
    },
  };
}

function color() {
  return {
    name: 'color',
    value: '#ffffff',
    metadata: {
      label: 'Color',
      type: 'string',
      '@type': 'ColorProperty',
    },
  };
}

function colorTemperature() {
  return {
    name: 'colorTemperature',
    value: 2500,
    metadata: {
      label: 'Color Temperature',
      type: 'number',
      '@type': 'ColorTemperatureProperty',
      unit: 'kelvin',
      min: 2500,
      max: 9000,
    },
  };
}

function brightness() {
  return {
    name: 'level',
    value: 0,
    metadata: {
      label: 'Brightness',
      type: 'number',
      '@type': 'BrightnessProperty',
      unit: 'percent',
    },
  };
}

function level() {
  return {
    name: 'level',
    value: 0,
    metadata: {
      label: 'Level',
      type: 'number',
      '@type': 'LevelProperty',
      unit: 'percent',
    },
  };
}

const onOffColorLight = {
  type: 'onOffColorLight',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'Light', 'ColorControl'],
  name: 'Virtual On/Off Color Light',
  properties: [
    on(),
    color(),
  ],
  actions: [],
  events: [],
};

const onOffColorTemperatureLight = {
  type: 'onOffColorLight',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'Light', 'ColorControl'],
  name: 'Virtual On/Off Color Temperature Light',
  properties: [
    on(),
    colorTemperature(),
  ],
  actions: [],
  events: [],
};

const dimmableColorLight = {
  type: 'dimmableColorLight',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'Light', 'ColorControl'],
  name: 'Virtual Dimmable Color Light',
  properties: [
    color(),
    brightness(),
    on(),
  ],
  actions: [],
  events: [],
};

const multiLevelSwitch = {
  type: 'multiLevelSwitch',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'MultiLevelSwitch'],
  name: 'Virtual Multi-level Switch',
  properties: [
    level(),
    on(),
  ],
  actions: [],
  events: [],
};

const onOffSwitch = {
  type: 'onOffSwitch',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch'],
  name: 'Virtual On/Off Switch',
  properties: [
    on(),
  ],
  actions: [],
  events: [],
};

const binarySensor = {
  type: 'binarySensor',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['BinarySensor'],
  name: 'Virtual Binary Sensor',
  properties: [
    bool(),
  ],
  actions: [],
  events: [],
};

const multiLevelSensor = {
  type: 'multiLevelSensor',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['MultiLevelSensor'],
  name: 'Virtual Multi-level Sensor',
  properties: [
    bool(),
    level(),
  ],
  actions: [],
  events: [],
};

const smartPlug = {
  type: 'smartPlug',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'EnergyMonitor', 'SmartPlug', 'MultiLevelSwitch'],
  name: 'Virtual Smart Plug',
  properties: [
    on(),
    level(),
    {
      name: 'instantaneousPower',
      value: 0,
      metadata: {
        '@type': 'InstantaneousPowerProperty',
        label: 'Power',
        type: 'number',
        unit: 'watt',
      },
    },
    {
      name: 'voltage',
      value: 0,
      metadata: {
        '@type': 'VoltageProperty',
        label: 'Voltage',
        type: 'number',
        unit: 'volt',
      },
    },
    {
      name: 'current',
      value: 0,
      metadata: {
        '@type': 'CurrentProperty',
        label: 'Current',
        type: 'number',
        unit: 'ampere',
      },
    },
    {
      name: 'frequency',
      value: 0,
      metadata: {
        '@type': 'FrequencyProperty',
        label: 'Frequency',
        type: 'number',
        unit: 'hertz',
      },
    },
  ],
  actions: [],
  events: [],
};

const onOffLight = {
  type: 'onOffLight',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'Light'],
  name: 'Virtual On/Off Light',
  properties: [
    on(),
  ],
  actions: [],
  events: [],
};

const dimmableLight = {
  type: 'dimmableLight',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch', 'Light'],
  name: 'Virtual Dimmable Light',
  properties: [
    on(),
    brightness(),
  ],
  actions: [],
  events: [],
};

const thing = {
  type: 'thing',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': [],
  name: 'Virtual Thing',
  properties: [
    {
      name: 'boolProperty',
      value: true,
      metadata: {
        type: 'boolean',
      },
    },
    {
      name: 'stringProperty',
      value: 'blah',
      metadata: {
        type: 'string',
      },
    },
    {
      name: 'numberProperty',
      value: 12,
      metadata: {
        type: 'number',
      },
    },
    {
      name: 'numberUnitProperty',
      value: 34,
      metadata: {
        type: 'number',
        unit: 'metres',
      },
    },
    {
      name: 'numberUnitMinMaxProperty',
      value: 56,
      metadata: {
        type: 'number',
        unit: 'degrees',
        min: 0,
        max: 100,
      },
    },
  ],
  actions: [],
  events: [],
};

const actionsEventsThing = {
  type: 'thing',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': [],
  name: 'Virtual Actions & Events Thing',
  properties: [],
  actions: [
    {
      name: 'basic',
      metadata: {
        label: 'No Input',
        description: 'An action with no inputs, fires an event',
      },
    },
    {
      name: 'single',
      metadata: {
        label: 'Single Input',
        description: 'An action with a single, non-object input',
        input: {
          type: 'number',
        },
      },
    },
    {
      name: 'multiple',
      metadata: {
        label: 'Multiple Inputs',
        description: 'An action with mutiple, optional inputs',
        input: {
          type: 'object',
          properties: {
            stringInput: {
              type: 'string',
            },
            booleanInput: {
              type: 'boolean',
            },
          },
        },
      },
    },
    {
      name: 'advanced',
      metadata: {
        label: 'Advanced Inputs',
        description: 'An action with many inputs, some required',
        input: {
          type: 'object',
          required: [
            'numberInput',
          ],
          properties: {
            numberInput: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              unit: 'percent',
            },
            integerInput: {
              type: 'integer',
              unit: 'meters',
            },
            stringInput: {
              type: 'string',
            },
            booleanInput: {
              type: 'boolean',
            },
            enumInput: {
              type: 'string',
              enum: [
                'enum string1',
                'enum string2',
                'enum string3',
              ],
            },
          },
        },
      },
    },
  ],
  events: [
    {
      name: 'virtualEvent',
      metadata: {
        description: 'An event from a virtual thing',
        type: 'number',
      },
    },
  ],
};

const onOffSwitchWithPin = {
  type: 'onOffSwitch',
  '@context': 'https://iot.mozilla.org/schemas',
  '@type': ['OnOffSwitch'],
  name: 'Virtual On/Off Switch (with PIN)',
  properties: [
    on(),
  ],
  actions: [],
  events: [],
  pin: {
    required: true,
    pattern: '^\\d{4}$',
  },
};

const VIRTUAL_THINGS = [
  onOffColorLight,
  multiLevelSwitch,
  dimmableColorLight,
  onOffSwitch,
  binarySensor,
  multiLevelSensor,
  smartPlug,
  onOffLight,
  dimmableLight,
  thing,
  actionsEventsThing,
  onOffSwitchWithPin,
  onOffColorTemperatureLight,
];

/**
 * A virtual property
 */
class VirtualThingsProperty extends Property {
  constructor(device, name, descr, value) {
    super(device, name, descr);
    this.setCachedValue(value);
  }

  /**
   * @param {any} value
   * @return {Promise} a promise which resolves to the updated value.
   */
  setValue(value) {
    return new Promise((resolve) => {
      this.setCachedValue(value);
      resolve(this.value);
      this.device.notifyPropertyChanged(this);
    });
  }
}

/**
 * A virtual device
 */
class VirtualThingsDevice extends Device {
  /**
   * @param {VirtualThingsAdapter} adapter
   * @param {String} id - A globally unique identifier
   * @param {Object} template - the virtual thing to represent
   */
  constructor(adapter, id, template) {
    super(adapter, id);

    this.name = template.name;

    this.type = template.type;
    this['@context'] = template['@context'];
    this['@type'] = template['@type'];

    if (template.hasOwnProperty('pin')) {
      this.pinRequired = template.pin.required;
      this.pinPattern = template.pin.pattern;
    } else {
      this.pinRequired = false;
      this.pinPattern = false;
    }

    for (const prop of template.properties) {
      this.properties.set(
        prop.name,
        new VirtualThingsProperty(this, prop.name, prop.metadata, prop.value));
    }

    if (Action) {
      for (const action of template.actions) {
        this.addAction(action.name, action.metadata);
      }
    }

    if (Event) {
      for (const event of template.events) {
        this.addEvent(event.name, event.metadata);
      }
    }

    this.adapter.handleDeviceAdded(this);
  }

  performAction(action) {
    console.log(`Performing action "${action.name}" with input:`, action.input);

    action.start();

    if (action.name === 'basic') {
      // For the "basic" action, fire an event.
      this.eventNotify(new Event(this,
                                 'virtualEvent',
                                 Math.floor(Math.random() * 100)));
    }

    action.finish();

    return Promise.resolve();
  }
}

/**
 * Virtual Things adapter
 * Instantiates one virtual device per template
 */
class VirtualThingsAdapter extends Adapter {
  constructor(adapterManager, manifestName) {
    super(adapterManager, 'virtual-things', manifestName);

    adapterManager.addAdapter(this);

    this.addAllThings();
  }

  startPairing() {
    this.addAllThings();
  }

  addAllThings() {
    for (let i = 0; i < VIRTUAL_THINGS.length; i++) {
      const id = `virtual-things-${i}`;
      if (!this.devices[id]) {
        new VirtualThingsDevice(this, id, VIRTUAL_THINGS[i]);
      }
    }
  }

  setPin(deviceId, pin) {
    return new Promise((resolve, reject) => {
      const device = this.getDevice(deviceId);
      if (device && device.pinRequired && pin === '1234') {
        resolve();
      } else {
        reject('Invalid PIN');
      }
    });
  }
}

module.exports = VirtualThingsAdapter;

