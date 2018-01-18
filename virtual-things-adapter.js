/**
 *
 * VirtualThingsAdapter - an adapter for trying out virtual things
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

var Adapter = require('../adapter');
var Device = require('../device');
var Property = require('../property');

const onOffColorLight = {
  type: 'onOffColorLight',
  name: 'Virtual On/Off Color Light',
  properties: [
    {
      name: 'color',
      value: '#ffffff',
      metadata: {
        type: 'string'
      }
    },
    {
      name: 'on',
      value: false,
      metadata: {
        type: 'boolean'
      }
    }
  ]
};

const dimmableColorLight = {
  type: 'dimmableColorLight',
  name: 'Virtual Dimmable Color Light',
  properties: [
    {
      name: 'color',
      value: '#ffffff',
      metadata: {
        type: 'string'
      }
    },
    {
      name: 'level',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'percent'
      }
    },
    {
      name: 'on',
      value: false,
      metadata: {
        type: 'boolean'
      }
    }
  ]
};

const multiLevelSwitch = {
  type: 'multiLevelSwitch',
  name: 'Virtual Multi-level Switch',
  properties: [
    {
      name: 'level',
      value: 0,
      metadata: {
        type: 'number',
        unit: 'percent'
      }
    },
    {
      name: 'on',
      value: false,
      metadata: {
        type: 'boolean'
      }
    }
  ]
};

const VIRTUAL_THINGS = [
  // thing,
  // onOffSwitch,
  onOffColorLight,
  multiLevelSwitch,
  dimmableColorLight,
  // binarySensor,
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
  constructor(adapterManager) {
    super(adapterManager, 'virtual-things', 'virtual-things');

    adapterManager.addAdapter(this);

    for (let i = 0; i < VIRTUAL_THINGS.length; i++) {
      var id = 'virtual-things-' + i;
      new VirtualThingsDevice(this, id, VIRTUAL_THINGS[i]);
    }
  }
}

module.exports = VirtualThingsAdapter;

