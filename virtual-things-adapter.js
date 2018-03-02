/**
 *
 * VirtualThingsAdapter - an adapter for trying out virtual things
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

let Adapter, Device, Property;
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
  Property = gwa.Property;
}

function on() {
  return {
    name: 'on',
    value: false,
    metadata: {
      type: 'boolean'
    }
  };
}

function color() {
  return {
    name: 'color',
    value: '#ffffff',
    metadata: {
      type: 'string'
    }
  };
}

function level() {
  return {
    name: 'level',
    value: 0,
    metadata: {
      type: 'number',
      unit: 'percent'
    }
  };
}

const onOffColorLight = {
  type: 'onOffColorLight',
  name: 'Virtual On/Off Color Light',
  properties: [
    on(),
    color()
  ]
};

const dimmableColorLight = {
  type: 'dimmableColorLight',
  name: 'Virtual Dimmable Color Light',
  properties: [
    color(),
    level(),
    on()
  ]
};

const multiLevelSwitch = {
  type: 'multiLevelSwitch',
  name: 'Virtual Multi-level Switch',
  properties: [
    level(),
    on()
  ]
};

const onOffSwitch = {
  type: 'onOffSwitch',
  name: 'Virtual On/Off Switch',
  properties: [
    on()
  ]
};

const binarySensor = {
  type: 'binarySensor',
  name: 'Virtual Binary Sensor',
  properties: [
    on()
  ]
};

const multiLevelSensor = {
  type: 'multiLevelSensor',
  name: 'Virtual Multi-level Sensor',
  properties: [
    on(),
    level()
  ]
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
        unit: 'watt'
      }
    },
    {
      name: 'voltage',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'volt'
      }
    },
    {
      name: 'current',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'ampere'
      }
    },
    {
      name: 'frequency',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'hertz'
      }
    }
  ]
};

const thing = {
  type: 'thing',
  name: 'Virtual Thing',
  properties: [
    {
      name: 'boolProperty',
      value: true,
      metadata: {
        type: 'boolean'
      }
    },
    {
      name: 'stringProperty',
      value: 'blah',
      metadata: {
        type: 'string'
      }
    },
    {
      name: 'numberProperty',
      value: 12,
      metadata: {
        type: 'number'
      }
    },
    {
      name: 'numberUnitProperty',
      value: 34,
      metadata: {
        type: 'number',
        unit: 'metres'
      }
    },
    {
      name: 'numberUnitMinMaxProperty',
      value: 56,
      metadata: {
        type: 'number',
        unit: 'degrees',
        min: 0,
        max: 100
      }
    }
  ]
};

const onOffLight = {
  type: 'onOffLight',
  name: 'Virtual On/Off Light',
  properties: [
    on()
  ]
};

const dimmableLight = {
  type: 'dimmableLight',
  name: 'Virtual Dimmable Light',
  properties: [
    on(),
    level()
  ]
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
  thing
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
    return new Promise(resolve => {
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

    for (let prop of template.properties) {
      this.properties.set(prop.name,
        new VirtualThingsProperty(this, prop.name, prop.metadata, prop.value));
    }

    this.adapter.handleDeviceAdded(this);
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

    for (let i = 0; i < VIRTUAL_THINGS.length; i++) {
      var id = 'virtual-things-' + i;
      new VirtualThingsDevice(this, id, VIRTUAL_THINGS[i]);
    }
  }
}

module.exports = VirtualThingsAdapter;

