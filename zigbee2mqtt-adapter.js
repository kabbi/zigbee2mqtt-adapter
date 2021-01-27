/**
 * zigbee2mqtt-adapter.js - Adapter to use all those zigbee devices via
 * zigbee2mqtt.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

const { exec, execSync, execFile, spawn } = require('child_process');
const https = require('https');
const fs = require("fs");
const path = require('path');

const mqtt = require('mqtt');
const { Adapter, Device, Property, Event } = require('gateway-addon');

const Devices = require('./devices');
const ExposesDeviceGenerator = require('./ExposesDeviceGenerator');
const events = require('events');
const myEmitter = new events.EventEmitter();

const identity = v => v;



class ZigbeeMqttAdapter extends Adapter {
  constructor(addonManager, manifest) {
	  
		//
		// STARTING THE ADDON
		//
		
    super(addonManager, 'ZigbeeMqttAdapter', manifest.name);
    this.config = manifest.moziot.config;
		if(this.config.debug){ console.log(this.config); }
    addonManager.addAdapter(this);
    this.exposesDeviceGenerator = new ExposesDeviceGenerator();

    this.client = mqtt.connect(this.config.mqtt);
    this.client.on('error', error => console.error('mqtt error', error));
    this.client.on('message', this.handleIncomingMessage.bind(this));
    this.client.subscribe(`${this.config.prefix}/bridge/devices`);
		
		
		const addon_path = path.resolve('.');
		//console.log("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");
		//console.log("addon path: " + addon_path);
			
		
		this.zigbee2mqtt_data_dir_path = path.join(path.resolve('../..'), 'data','zigbee2mqtt-adapter'); // configuration file location
		//console.log("this.zigbee2mqtt_data_dir_path = " + this.zigbee2mqtt_data_dir_path);
		
		//this.zigbee2mqtt_dir_path = path.join(addon_path, 'zigbee2mqtt'); // actual zigbee2mqt location
		this.zigbee2mqtt_dir_path = path.join(this.zigbee2mqtt_data_dir_path, 'zigbee2mqtt'); // actual zigbee2mqt location
		
		this.zigbee2mqtt_file_path = path.join(this.zigbee2mqtt_dir_path, 'index.js'); // index.js file to be started by node
		//console.log("this.zigbee2mqtt_dir_path = " + this.zigbee2mqtt_dir_path);
		
		this.zigbee2mqtt_configuration_file_source_path = path.join(this.zigbee2mqtt_dir_path, 'data', 'configuration.yaml'); // should be copied at the first installation
		this.zigbee2mqtt_configuration_file_path = path.join(this.zigbee2mqtt_data_dir_path, 'configuration.yaml');
		//console.log("this.zigbee2mqtt_configuration_file_path  = " + this.zigbee2mqtt_configuration_file_path);
		
		this.zigbee2mqtt_configuration_devices_file_path = path.join(this.zigbee2mqtt_data_dir_path, 'devices.yaml');
		this.zigbee2mqtt_configuration_groups_file_path = path.join(this.zigbee2mqtt_data_dir_path, 'groups.yaml');
		//console.log("this.zigbee2mqtt_configuration_devices_file_path = " + this.zigbee2mqtt_configuration_devices_file_path);
		
		this.zigbee2mqtt_package_file_path = path.join(this.zigbee2mqtt_data_dir_path, 'zigbee2mqtt','package.json');
		//console.log("this.zigbee2mqtt_package_file_path = " + this.zigbee2mqtt_package_file_path);
		
		this.zigbee2mqtt_configuration_log_path = path.join(this.zigbee2mqtt_data_dir_path, 'log','%TIMESTAMP%');
		//console.log("this.zigbee2mqtt_configuration_log_path = " + this.zigbee2mqtt_configuration_log_path);
			
	

		
		//
		// CHECK IF ZIGBEE2MQTT SHOULD BE INSTALLED OR UPDATED
		//
		
		fs.access(this.zigbee2mqtt_dir_path, (err) => {
		//fs.access(this.zigbee2mqtt_dir_path, function(err) {
			if (err && err.code === 'ENOENT') {
				this.download_z2m();
				
			}else{
 				console.log("zigbee2mqtt folder existed.");
				
				if(this.config.auto_update){
					console.log("Auto-update is enabled. Checking if zigbee2mqtt should be updated...");
	 				// downloads json from https://api.github.com/repos/Koenkk/zigbee2mqtt/releases/latest;

					try{
						const options = {
						  hostname: 'api.github.com',
						  port: 443,
						  path: '/repos/Koenkk/zigbee2mqtt/releases/latest',
						  method: 'GET',
						  headers: {
						     'X-Forwarded-For': 'xxx',
						     'User-Agent': 'Node'
						  }
						};

						const req = https.request(options, (res) => {
						  console.log('statusCode:', res.statusCode);
						  //console.log('headers:', res.headers);

							let body = "";
						  res.on('data', (chunk) => {
								body += chunk;
						  });
					
					    res.on("end", () => {
					        try {
										  //console.log("parsing...");
											//console.log(body);
					            let github_json = JSON.parse(body);
									
											console.log("latest zigbee2MQTT version found on Github = " + github_json['tag_name']);
									
											fs.readFile(this.zigbee2mqtt_package_file_path, 'utf8', (err, data) => {

											    if (err) {
											        console.log(`Error reading file from disk: ${err}`);
											    } else {

											        // parse JSON string to JSON object
											        const z2m_package_json = JSON.parse(data);
															console.log('local zigbee2MQTT version = ' + z2m_package_json['version']);
													
															if(github_json['tag_name'] == z2m_package_json['version']){
																  console.log("zigbee2mqtt versions are the same, no need to update zigbee2mqtt");
																	this.check_if_config_file_exists(this);
															}
															else{
																  console.log("a new official release of zigbee2mqtt is available. Will attempt to upgrade.");
																	//console.log("tarball_url to download = " + github_json['tarball_url']);
																	delete_z2m();
																	download_z2m();
															}
											    }

											});
									
											let json = JSON.parse(body);
									
					            // do something with JSON
					        } catch (error) {
					            console.error(error.message);
					        };
					    });
					
						});

						req.on('error', (e) => {
						  console.error(e);
						});
						req.end();
					}
					catch(error){
						console.error(error.message);
					}
				}
				else{
					this.check_if_config_file_exists();
				}
				
			}
		}); // end of fs.access check

  }



	// By having the config files outside of the zigbee2mqtt folder it becomes easier to update zigbee2mqtt
	check_if_config_file_exists(){
		try{
			console.log("Checking if config file exists");
			//console.log(config);
			//console.log(this.config);
			
			fs.access(this.zigbee2mqtt_configuration_file_source_path, (err) => {
			//fs.access(this.zigbee2mqtt_configuration_file_source_path, function(err) {
				if (err && err.code === 'ENOENT') {
					console.log("The configuration.yaml source file doesn't exist: " + this.zigbee2mqtt_configuration_file_source_path);
				}else{
					console.log("configuration.yaml source file existed");
					fs.access(this.zigbee2mqtt_configuration_file_path, (err) => {
					//fs.access(this.zigbee2mqtt_configuration_file_path, function(err) {
						if (err && err.code === 'ENOENT') {
							console.log("data dir configuration.yaml file doesn't exist yet (" + this.zigbee2mqtt_configuration_file_path + "). It should be copied over.");
							fs.copyFile(this.zigbee2mqtt_configuration_file_source_path, this.zigbee2mqtt_configuration_file_path, (err) => {
							  if (err) throw err;
							  console.log('configuration yaml file was copied to the correct location.');
								this.run_zigbee2mqtt();
							});
						}else{
							console.log("configuration.yaml file existed.");
							this.run_zigbee2mqtt();
						}
						
					});
				}
			});
			
		}
		catch (error) {
      console.error("Error checking if zigbee2mqtt config file exists: " + error.message);
  	};
	}
	
	

	stop_zigbee2mqtt(){
		try{
			this.zigbee2mqtt_subprocess.kill()
		}
		catch (error) {
      console.error("Error stopping zigbee2mqtt: " + error.message);
  	}
	}



	run_zigbee2mqtt(){
		console.log("starting zigbee2MQTT");
		
		process.env["ZIGBEE2MQTT_DATA"] = this.zigbee2mqtt_data_dir_path;
		
		try{
			this.zigbee2mqtt_subprocess = execFile('node', [this.zigbee2mqtt_file_path], (error, stdout, stderr) => {
			    if (error) {
			        console.log(`error: ${error.message}`);
			        return;
			    }
			    if (stderr) {
			        console.log(`stderr: ${stderr}`);
			        return;
			    }
			    console.log(`stdout: ${stdout}`);
			});
		}
		catch (error) {
      console.error("Error starting zigbee2mqtt: " + error.message);
  	}
		
	}



  download_z2m(){  	
		console.log("Downloading zigbee2MQTT");
		let git_clone_result = execSync('git clone --depth=1 https://github.com/Koenkk/zigbee2mqtt ' + this.zigbee2mqtt_dir_path, {
		  stdio: [0, 1, 2], // we need this so node will print the command output
		})
		
		console.log("Installing zigbee2MQTT. This may take up to 10 minutes.");
		let ci_result = execSync('cd ' + this.zigbee2mqtt_dir_path + '; npm ci --production', (error, stdout, stderr) => {
		    if (error) {
		        console.log(`- install error: ${error.message}`);
		        return;
		    }
		    if (stderr) {
		        console.log(`- install stderr: ${stderr}`);
		        return;
		    }
		    console.log(`- install stdout: ${stdout}`);
		});
		
  }



	delete_z2m(){
		console.log("deleting zigbee2mqtt from data folder");
		let git_clone_result = execSync('rf -rf ' + this.zigbee2mqtt_dir_path, {
		  stdio: [0, 1, 2],
		})
		
	}



  handleIncomingMessage(topic, data) {	
		console.log("in incoming message");
    const msg = JSON.parse(data.toString());
    if (topic.startsWith(`${this.config.prefix}/bridge/devices`)) {
      for (const device of msg) {
        this.addDevice(device);
      }
    }
    if (!topic.startsWith(`${this.config.prefix}/bridge`)) {
      const friendlyName = topic.replace(`${this.config.prefix}/`, '');
      const device = this.getDevice(friendlyName);
      if (!device) {
        return;
      }
      if (msg.action && device.events.get(msg.action)) {
        const event = new Event(
          device,
          msg.action,
          msg[device.events.get(msg.action)],
        );
        device.eventNotify(event);
      }
      for (const key of Object.keys(msg)) {
        const property = device.findProperty(key);
        if (!property) {
          continue;
        }
        const { fromMqtt = identity } = property.options;
        property.setCachedValue(fromMqtt(msg[key]));
        device.notifyPropertyChanged(property);
      }
    }
  }

  publishMessage(topic, msg) {
		console.log("in pubmsg");
    this.client.publish(`${this.config.prefix}/${topic}`, JSON.stringify(msg));
  }

  addDevice(info) {
		console.log("in addDevice");
    const existingDevice = this.getDevice(info.friendly_name);
    if (existingDevice && existingDevice.modelId === info.model_id) {
      console.info(`Device ${info.friendly_name} already exists`)
      return;
    }

    let deviceDefinition = Devices[info.model_id]; // devices.js

    if (!deviceDefinition) {
      const detectedDevice = this.exposesDeviceGenerator.generateDevice(info);
      if (detectedDevice) {
        deviceDefinition = detectedDevice;
        console.info(`Device ${info.friendly_name} created from Exposes API`)
      }
    } else {
      console.info(`Device ${info.friendly_name} created from devices.js`)
    }

    if (deviceDefinition) {
      const device = new MqttDevice(this, info.friendly_name, info.model_id, deviceDefinition);
      this.client.subscribe(`${this.config.prefix}/${info.friendly_name}`);
      this.handleDeviceAdded(device);
    }
  }

  startPairing(_timeoutSeconds) {
	  console.log("in startPairing");
    this.client.publish(`${this.config.prefix}/bridge/config/devices/get`);
    // TODO: Set permitJoin
  }

  cancelPairing() {
	  console.log("in cancelPairing");
    // TODO: Clear permitJoin
  }
}



class MqttDevice extends Device {
  constructor(adapter, id, modelId, description) {
    super(adapter, id);
    this.name = description.name;
    this['@type'] = description['@type'];
    this.modelId = modelId;
    for (const [name, desc] of Object.entries(description.actions || {})) {
      this.addAction(name, desc);
    }
    for (const [name, desc] of Object.entries(description.properties || {})) {
      const property = new MqttProperty(this, name, desc);
      this.properties.set(name, property);
    }
    for (const [name, desc] of Object.entries(description.events || {})) {
      this.addEvent(name, desc);
    }
  }

  performAction(action) {
    return new Promise((resolve, reject) => {
      action.start();
      this.adapter.publishMessage(`${this.id}/set`, {
        [action.name]: action.input
      });
      action.finish();
    });
  }
}




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




function loadAdapter(addonManager, manifest, _errorCallback) {
  new ZigbeeMqttAdapter(addonManager, manifest);
}

module.exports = loadAdapter;

