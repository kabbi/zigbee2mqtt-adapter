/**
 * index.js - Loads the virtual things adapter
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

const VirtualThingsAdapter = require('./virtual-things-adapter');

module.exports = function(adapterManager) {
  new VirtualThingsAdapter(adapterManager);
};