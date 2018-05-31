/**
 *
 * VirtualThingsAdapter - an adapter for trying out virtual things
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

let Adapter, Device, Event, Property;
try {
  Adapter = require('../adapter');
  Device = require('../device');
  Property = require('../property');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') {
    throw e;
  }

  const gwa = require('gateway-addon');
  Adapter = gwa.Adapter;
  Device = gwa.Device;
  Event = gwa.Event;
  Property = gwa.Property;
}

function on() {
  return {
    name: 'on',
    value: false,
    metadata: {
      type: 'boolean',
    },
  };
}

function color() {
  return {
    name: 'color',
    value: '#ffffff',
    metadata: {
      type: 'string',
    },
  };
}

function level() {
  return {
    name: 'level',
    value: 0,
    metadata: {
      type: 'number',
      unit: 'percent',
    },
  };
}

const onOffColorLight = {
  type: 'onOffColorLight',
  name: 'Virtual On/Off Color Light',
  properties: [
    on(),
    color(),
  ],
  actions: [],
  events: [],
};

const dimmableColorLight = {
  type: 'dimmableColorLight',
  name: 'Virtual Dimmable Color Light',
  properties: [
    color(),
    level(),
    on(),
  ],
  actions: [],
  events: [],
};

const multiLevelSwitch = {
  type: 'multiLevelSwitch',
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
  name: 'Virtual On/Off Switch',
  properties: [
    on(),
  ],
  actions: [],
  events: [],
};

const binarySensor = {
  type: 'binarySensor',
  name: 'Virtual Binary Sensor',
  properties: [
    on(),
  ],
  actions: [],
  events: [],
};

const multiLevelSensor = {
  type: 'multiLevelSensor',
  name: 'Virtual Multi-level Sensor',
  properties: [
    on(),
    level(),
  ],
  actions: [],
  events: [],
};

const smartPlug = {
  type: 'smartPlug',
  name: 'Virtual Smart Plug',
  properties: [
    on(),
    level(),
    {
      name: 'instantaneousPower',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'watt',
      },
    },
    {
      name: 'voltage',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'volt',
      },
    },
    {
      name: 'current',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'ampere',
      },
    },
    {
      name: 'frequency',
      value: 0,
      metadata: {
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
  name: 'Virtual On/Off Light',
  properties: [
    on(),
  ],
  actions: [],
  events: [],
};

const dimmableLight = {
  type: 'dimmableLight',
  name: 'Virtual Dimmable Light',
  properties: [
    on(),
    level(),
  ],
  actions: [],
  events: [],
};

const thing = {
  type: 'thing',
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
  name: 'Virtual Actions & Events Thing',
  properties: [],
  actions: [
    {
      name: 'basic',
      metadata: {
        description: 'An action with no inputs, fires an event',
      },
    },
    {
      name: 'single',
      metadata: {
        description: 'An action with a single, non-object input',
        input: {
          type: 'number',
        },
      },
    },
    {
      name: 'multiple',
      metadata: {
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

    if (Event) {
      for (const action of template.actions) {
        this.addAction(action.name, action.metadata);
      }

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

