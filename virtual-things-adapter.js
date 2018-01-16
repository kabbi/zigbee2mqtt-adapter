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
  multiLevelSwitch,
  // colorLight,
  // dimmableColorLight,
  // binarySensor,
];

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
        new Property(this, prop.name, prop.metadata, prop.value));
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

