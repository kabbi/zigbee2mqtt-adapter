/**
 * zigbee2mqtt-adapter.js - Adapter to use all those zigbee devices via
 * zigbee2mqtt.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const mqtt = require('mqtt');
const { Adapter, Device, Property, Event } = require('gateway-addon');

const Devices = require('./devices');

const identity = v => v;

class MqttProperty extends Property {
  constructor(device, name, propertyDescription) {
    super(device, name, propertyDescription);
    this.setCachedValue(propertyDescription.value);
    this.device.notifyPropertyChanged(this);
    this.options = propertyDescription;
  }

  setValue(value) {
    return new Promise((resolve, reject) => {
      super
        .setValue(value)
        .then(updatedValue => {
          const { toMqtt = identity } = this.options;
          this.device.adapter.publishMessage(`${this.device.id}/set`, {
            [this.name]: toMqtt(updatedValue),
          });
          resolve(updatedValue);
          this.device.notifyPropertyChanged(this);
        })
        .catch(err => {
          reject(err);
        });
    });
  }
}

class MqttDevice extends Device {
  constructor(adapter, id, description) {
    super(adapter, id);
    this.name = description.name;
    this['@type'] = description['@type'];
    for (const [name, desc] of Object.entries(description.properties || {})) {
      const property = new MqttProperty(this, name, desc);
      this.properties.set(name, property);
    }
    for (const [name, desc] of Object.entries(description.events || {})) {
      this.addEvent(name, desc);
    }
  }
}

class ZigbeeMqttAdapter extends Adapter {
  constructor(addonManager, manifest) {
    super(addonManager, 'ZigbeeMqttAdapter', manifest.name);
    this.config = manifest.moziot.config;
    addonManager.addAdapter(this);

    this.client = mqtt.connect(this.config.mqtt);
    this.client.on('error', error => console.error('mqtt error', error));
    this.client.on('message', this.handleIncomingMessage.bind(this));
    this.client.subscribe(`${this.config.prefix}/bridge/config/devices`);
    this.client.subscribe(`${this.config.prefix}/+`);
    this.client.publish(`${this.config.prefix}/bridge/config/devices/get`);
  }

  handleIncomingMessage(topic, data) {
    const msg = JSON.parse(data.toString());
    if (topic.startsWith(`${this.config.prefix}/bridge/config/devices`)) {
      for (const device of msg) {
        this.addDevice(device);
      }
    }
    if (!topic.startsWith(`${this.config.prefix}/bridge`)) {      
      const device = this.getDevice(msg);

      if (!device) return;

      const description = Devices[msg.device.modelId || msg.device.model];
      if (msg.action && description.events[msg.action]) {
        const event = new Event(
          device,
          msg.action,
          msg[description.events[msg.action]],
        );
        device.eventNotify(event);
      }
      for (const key of Object.keys(msg)) {
        const property = device.findProperty(key);
        if (!property) {
          continue;
        }
        const { fromMqtt = identity } = description.properties[key];
        property.setCachedValue(fromMqtt(msg[key]));
        device.notifyPropertyChanged(property);
      }
    }
  }

  getDevice(msg) {
    const friendlyName = msg.device.friendlyName || msg.device.friendly_name;
    const device = this.devices[friendlyName];
    if (!device) {
      this.addDevice(msg.device);
    }
    return this.devices[friendlyName];
  }

  publishMessage(topic, msg) {
    this.client.publish(`${this.config.prefix}/${topic}`, JSON.stringify(msg));
  }

  addDevice(info) {
    const modelId = info.modelId || info.model;
    const description = Devices[modelId];
    if (!description) {
      console.warn(`Failed to add new device. There is no description for ${modelId} model.`);
      return;
    }
    const friendlyName = info.friendlyName || info.friendly_name;
    if (friendlyName in this.devices) {
      console.info(`Device model:${modelId}, friendlyName:${friendlyName} already exists. Skip adding.`);
      return;
    }
    const device = new MqttDevice(this, friendlyName, description);
    this.handleDeviceAdded(device);
    console.info(`New device model:${modelId}, friendlyName:${friendlyName} is added.`);
  }

  startPairing(_timeoutSeconds) {
    this.client.publish(`${this.config.prefix}/bridge/config/devices/get`);
    // TODO: Set permitJoin
  }

  cancelPairing() {
    // TODO: Clear permitJoin
  }
}

function loadAdapter(addonManager, manifest, _errorCallback) {
  new ZigbeeMqttAdapter(addonManager, manifest);
}

module.exports = loadAdapter;
