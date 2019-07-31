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
    
    // Here we add a new thing.
    if (topic.startsWith(`${this.config.prefix}/bridge/config/devices`)) {
      for (const device of msg) {
        this.addDevice(device);
      }
    }
    
    // Here we deal with incoming messages from things, such as state changes or new values from sensors.
    if (!topic.startsWith(`${this.config.prefix}/bridge`)) {
      
      
      var possibleModelId = "";
      var possibleFriendlyName = "";
      
      if('device' in msg){                  // In some cases it's a complex message with a device dictionary in it.
        possibleFriendlyName = msg.device.friendlyName;
        possibleModelId = msg.device.modelId;
      }
      else {                                // In other cases it's a simple message, just a list of new values.
        var parts = topic.split("/");
        possibleFriendlyName = parts.pop();
      }
      
      // If we found the device ID in the incoming message, then we can look-up the existing thing.
      const device = this.devices[possibleFriendlyName];
      if (!device) {
        return;
      }
      
      // We loop over all the attributes of the incoming message, and try to match it to the properties in the existing thing.
      for (const key of Object.keys(msg)) {
        const property = device.findProperty(key);
        if (!property) {
          continue;
        }       
        
        if(possibleModelId) {               // If we are dealing with a complex message.
          const description = Devices[possibleModelId];
          const { fromMqtt = identity } = description.properties[key];
          property.setCachedValue(fromMqtt(msg[key]));
        }
        else {                              // If we are dealing with a simple message which only holds values.
          property.setCachedValue(msg[key]);
        }
        device.notifyPropertyChanged(property); // Notify the Gateway that this property's value has updated.
      }
      
      // If it's a complex message, then it may hold an event update
      if (msg.action && possibleModelId) {
        const description = Devices[possibleModelId];
        if(description.events[msg.action]) {
          const event = new Event(
            device,
            msg.action,
            msg[description.events[msg.action]],
          );
          device.eventNotify(event);
        }
      }
    }
  }

  publishMessage(topic, msg) {
    this.client.publish(`${this.config.prefix}/${topic}`, JSON.stringify(msg));
  }

  addDevice(info) {
    const description = Devices[info.modelId];
    if (!description) {
      return;
    }
    const device = new MqttDevice(this, info.friendly_name, description);
    this.handleDeviceAdded(device);
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
