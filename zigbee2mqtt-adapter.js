/**
 * zigbee2mqtt-adapter.js - Adapter to use all those zigbee devices via
 * zigbee2mqtt.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */
'use strict';

const {
	spawn,
	exec,
	execSync,
} = require('child_process');

const https = require('https');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const mqtt = require('mqtt');
const {
	Adapter,
	Device,
	Property,
	Event
} = require('gateway-addon');
const Zigbee2MQTTHandler = require('./api-handler');

const Devices = require('./devices');
const ExposesDeviceGenerator = require('./ExposesDeviceGenerator');
//const colorTranslator = require('./colorTranslator');

const barometer = require('barometer-trend');

const identity = (v) => v;
//console.log("identity = ", identity);


// TODO: noticed these error from the Gateway
//2022-01-24 22:22:38.213 ERROR  : zigbee2mqtt-adapter: The `manifest` object is deprecated and will be removed soon. Instead of using `manifest.name`, please read the `id` field from your manifest.json instead.
//2022-01-24 22:22:38.216 ERROR  : zigbee2mqtt-adapter: The `manifest` object is deprecated and will be removed soon. Instead of using `manifest.moziot`, please read the user configuration with the `Database` class instead.


class ZigbeeMqttAdapter extends Adapter {
	constructor(addonManager, manifest) {

		//
		// STARTING THE ADDON
		//

		super(addonManager, 'ZigbeeMqttAdapter', manifest.name);
		this.config = manifest.moziot.config;

		this.current_os = os.platform().toLowerCase();



		if (typeof this.config.debug == "undefined") {
            console.log("Debugging is disabled");
			this.config.debug = false;
		} else if (this.config.debug) {
			console.log("Debugging is enabled");
			console.log(this.config);
			console.log("OS: " + this.current_os);
		}
		addonManager.addAdapter(this);
		this.exposesDeviceGenerator = new ExposesDeviceGenerator(this, this.config);



        this.reverse_list_contact = ['RH3001']; // All the devices for which the contact property should be reversed. RH3001 is a great usb-rechargeable contact sensor.

		// Handle missing default values
		if (typeof this.config.local_zigbee2mqtt == "undefined") {
			this.config.local_zigbee2mqtt = true;
		}
		if (typeof this.config.auto_update == "undefined") {
			this.config.auto_update = true;
		}
        
		if (typeof this.config.virtual_brightness_alternative == "undefined") {
			this.config.virtual_brightness_alternative = false;
            console.log("this.config.virtual_brightness_alternative = " + this.config.virtual_brightness_alternative);
		}

		if (typeof this.config.manual_toggle_response == "undefined") {
			console.log("this.config.manual_toggle_response was undefined. Set to BOTH");
			this.config.manual_toggle_response = "both";
		}

		if (typeof this.config.prefix == "undefined") {
			this.config.prefix = "zigbee2mqtt";
		}
		if (typeof this.config.mqtt == "undefined") {
			this.config.mqtt = "mqtt://localhost";
		}
        if (this.config.debug) {
            console.log('this.config.mqtt = ', this.config.mqtt);
        }

		if (this.config.local_zigbee2mqtt) {
			try {
				if (typeof this.config.serial_port == "undefined" || this.config._port == "") {
					console.log("Serial port is not defined in settings. Will attempt auto-detect.");
					if (this.current_os == 'linux') {
						this.config.serial_port = "/dev/ttyAMA0";
						let result = require('child_process').execSync('ls -l /dev/serial/by-id').toString();
						result = result.split(/\r?\n/);
						for (const i in result) {
							if (this.config.debug) {
								console.log("line: " + result[i]);
							}
							if (result[i].length == 3 && result[i].includes("->")) { // If there is only one USB device, grab what you can.
								this.config.serial_port = "/dev/" + result[i].split("/").pop();
							}
							// In general, be picky, and look for hints that we found a viable Zigbee stick
							if (result[i].toLowerCase().includes("cc253") || result[i].toLowerCase().includes("conbee") || result[i].toLowerCase().includes('cc26x') || result[i].toLowerCase().includes('cc265') || result[i].toLowerCase().includes('igbee') ){ // CC26X2R1, CC253, CC2652
								this.config.serial_port = "/dev/" + result[i].split("/").pop();
								console.log("- USB stick spotted at: " + this.config.serial_port);
							}
						}
					} else {
						this.config.serial_port = null; // fall back on Zigbee2MQTT's own auto-detect (which doesn't work on the Webthings Raspberry Pi disk image)
					}
				}
			} catch (error) {
				console.log(error);
			}
		}

        this.security = {pan_id: "", network_key: ""};
        
        this.z2m_installed_succesfully = false;
		this.z2m_started = false;
        this.z2m_state = false;
		this.waiting_for_map = false;
		this.updating_firmware = false;
		this.update_result = {'status':'idle'}; // will contain the message that Z2M returns after the update process succeeds or fails.
        //this.updating_firmware_progress = 0;
        
        try{
    		if (typeof this.config.virtual_brightness_alternative_speed == "undefined") {
    			this.config.virtual_brightness_alternative_speed = 10;
    		}
            else{
                this.config.virtual_brightness_alternative_speed = parseInt(this.config.virtual_brightness_alternative_speed);
            }
        }
		catch(e){
		    this.config.virtual_brightness_alternative_speed = 10;
		}
        
            
        //console.log("this.config.virtual_brightness_alternative = " + this.config.virtual_brightness_alternative);
        //this.persistent_data.virtual_brightness_alternatives = {};

		// Availability checking
		//this.ignored_first_availability_device_list = []; // For now this has been replaced with just ignoring availabiliy messages for 10 seconds.
		this.addon_start_time = Date.now(); // During the first 10 second after Zigbee2MQTT starts, the availability messages are ignored.
		this.availability_interval = 3; // polls devices on the zigbee network every X minutes. Used to discover if lightbulb have been powered down manually.


        this.mqtt_connection_attempted = false;
        
        const homedir = require('os').homedir();
        //console.log("homedir = " + homedir);
        
		// configuration files location
		this.zigbee2mqtt_data_dir_path =
			path.join(homedir, '.webthings', 'data', 'zigbee2mqtt-adapter');
		if (this.config.debug) {
			console.log("this.zigbee2mqtt_data_dir_path = ", this.zigbee2mqtt_data_dir_path);
		}
        
        // Persistent data fle path
        this.persistent_data_file_path = path.join(this.zigbee2mqtt_data_dir_path, 'persistent_data.json');
        
		// actual zigbee2mqt location
		this.zigbee2mqtt_dir_path = path.join(this.zigbee2mqtt_data_dir_path, 'zigbee2mqtt');
        if (this.config.debug) {
            console.log("this.zigbee2mqtt_dir_path = ", this.zigbee2mqtt_dir_path);
        }
		// index.js file to be started by node
		this.zigbee2mqtt_file_path = path.join(this.zigbee2mqtt_dir_path, 'index.js');
		// console.log("this.zigbee2mqtt_dir_path =", this.zigbee2mqtt_dir_path);

		// should be copied at the first installation
		this.zigbee2mqtt_configuration_file_source_path =
			path.join(this.zigbee2mqtt_dir_path, 'data', 'configuration.yaml');
		this.zigbee2mqtt_configuration_file_path =
			path.join(this.zigbee2mqtt_data_dir_path, 'configuration.yaml');
		// console.log("this.zigbee2mqtt_configuration_file_path =",
		//             this.zigbee2mqtt_configuration_file_path);

		this.zigbee2mqtt_configuration_devices_file_path =
			path.join(this.zigbee2mqtt_data_dir_path, 'devices.yaml');
		this.zigbee2mqtt_configuration_groups_file_path =
			path.join(this.zigbee2mqtt_data_dir_path, 'groups.yaml');
		this.zigbee2mqtt_configuration_security_file_path =
			path.join(this.zigbee2mqtt_data_dir_path, 'security.yaml');
		// console.log("this.zigbee2mqtt_configuration_devices_file_path =",
		//             this.zigbee2mqtt_configuration_devices_file_path);

        this.zigbee2mqtt_coordinator_backup_json_file_path =
            path.join(this.zigbee2mqtt_data_dir_path, 'coordinator_backup.json');

		this.zigbee2mqtt_package_file_path =
			path.join(this.zigbee2mqtt_data_dir_path, 'zigbee2mqtt', 'package.json');
		// console.log("this.zigbee2mqtt_package_file_path =", this.zigbee2mqtt_package_file_path);

		this.zigbee2mqtt_configuration_log_path = path.join(this.zigbee2mqtt_data_dir_path, 'log');
		// console.log("this.zigbee2mqtt_configuration_log_path =",
		//             this.zigbee2mqtt_configuration_log_path);


		//this.persistent_data.devices_overview = {}; //new Map(); // stores all the connected devices, and if they can be updated. Could potentially also be used to force-remove devices from the network.

        this.persistent_data = {'devices_overview':{},'virtual_brightness_alternatives': {}}
        
        // try to load persistent data
        try {
			fs.access(this.persistent_data_file_path, (err) => {
				if (err && err.code === 'ENOENT') {
					console.log('persistent data file did not exist yet. Creating it now.');

                    this.save_persistent_data();
            
				}
                else {
					if (this.config.debug) {
						console.log('zigbee2mqtt persistent data file existed:');
					}
                    
                    fs.readFile(this.persistent_data_file_path, 'utf8', (error, data) => {
                        if (error){
                            console.log("Error reading security file: " + error);
                        }
                        //console.log("READING PERSISTENT DATA NOW from data: ", data);
                        this.persistent_data = JSON.parse(data);
                        //console.log(this.persistent_data);
                    });
                    
                }
                
            });
		} 
        catch (error) {
			console.error("Error while checking/opening security file: " + error.message);
		}

        // Restore barometer measurements if available.
        
        if( typeof this.persistent_data['barometer_measurements'] != 'undefined'){
            console.log("barometer values were present in persistent data: ", this.persistent_data['barometer_measurements']);
            
            for (let q = 0; q < this.persistent_data['barometer_measurements'].length; q++){
                //this.persistent_data['barometer_measurements'][q].datetime
                //this.persistent_data['barometer_measurements'][q].value
                
                var timestamp = Date.parse( this.persistent_data['barometer_measurements'][q].datetime );
                var dateObject = new Date(timestamp);
                
                console.log("re-adding value to barometer: " + this.persistent_data['barometer_measurements'][q].value);        
                barometer.addPressure(dateObject, this.persistent_data['barometer_measurements'][q].value);
            }
            
            this.persistent_data['barometer_measurements'].forEach(function(measurement) {
                console.log("measurement for-each: ", measurement);
            });            
        }

        this.improve_security = false;
        
        // Check security file
        try {
			fs.access(this.zigbee2mqtt_configuration_security_file_path, (err) => {
				if (err && err.code === 'ENOENT') {
					if (this.config.debug) {
						console.log('zigbee2mqtt security file did not exist.');
					}
            
				} else {
					if (this.config.debug) {
						console.log('zigbee2mqtt security file existed:');
					}
                    //this.security = require( this.zigbee2mqtt_configuration_security_file_path );
                    
                    fs.readFile(this.zigbee2mqtt_configuration_security_file_path, 'utf8', (error, data) => {
                        if (error){
                            console.log("Error reading security file: " + error);
                        }
                        else{
                            this.security = JSON.parse(data);
                                
                            if (this.config.debug) {
                                console.log("Security settings have been loaded from file: ", this.security);
                            }
                            
                            // adding extra security
                            if(this.config.disable_improved_security == true){
                                console.log('WARNING: (extra) security has been manually disabled.');
                            }
                            else {
                                this.improve_security = true;
                            }
                        }
                    });
                    

                }
            });
		} 
        catch (error) {
			console.error("Error while checking/opening persistent data file: " + error.message);
		}
        


		// Allow UI to connect
		try {
			this.apiHandler = new Zigbee2MQTTHandler(
				addonManager,
				this,
				this.config
			);
		} catch (error) {
			console.log("Error loading api handler: " + error)
		}


		//
		// CHECK IF ZIGBEE2MQTT SHOULD BE INSTALLED OR UPDATED
		//
		if (this.config.debug) {
			console.log("this.config.local_zigbee2mqtt = " + this.config.local_zigbee2mqtt);
		}
		if (this.config.local_zigbee2mqtt == true) {
            
			fs.access(this.zigbee2mqtt_dir_path, (err) => {
				if (err && err.code === 'ENOENT') {
                    console.log("zigbee2mqtt folder was missing, should download and install");
					this.download_z2m(); // this then also installs and starts zigbee2mqtt
				} else {
					if (this.config.debug) {
						console.log('zigbee2mqtt folder existed.');
					}

					if (this.config.auto_update) {
						console.log('Auto-update is enabled. Checking if Zigbee2MQTT should be updated...');
						// downloads json from https://api.github.com/repos/Koenkk/zigbee2mqtt/releases/latest;

						try {
							const options = {
								hostname: 'api.github.com',
								port: 443,
								path: '/repos/Koenkk/zigbee2mqtt/releases/latest',
								method: 'GET',
                                timeout: 3000,
								headers: {
									'X-Forwarded-For': 'xxx',
									'User-Agent': 'Node',
								},
							};

							const req = https.request(options, (res) => {
								if (this.config.debug) {
									console.log('statusCode:', res.statusCode);
								}
								// console.log('headers:', res.headers);

								let body = '';
								res.on('data', (chunk) => {
									body += chunk;
								});

								res.on('end', () => {
									try {

										// Parse JSON from api.github
										const github_json = JSON.parse(body);
										if (this.config.debug) {
											console.log('latest zigbee2MQTT version found on Github =', github_json.tag_name);
										}

										fs.readFile(this.zigbee2mqtt_package_file_path, 'utf8', (err, data) => {
											if (err) {
												console.log(`Error reading file from disk: ${err}`);

											} else {
												const z2m_package_json = JSON.parse(data);
												if (this.config.debug) {
													console.log(`local zigbee2MQTT version = ${z2m_package_json.version}`);
												}

												if (github_json.tag_name == z2m_package_json.version) {
													if (this.config.debug) {
														console.log('zigbee2mqtt versions are the same, no need to update zigbee2mqtt');
													}
													this.run_zigbee2mqtt();

												} else {
													console.log('a new official release of zigbee2mqtt is available.',
														'Will attempt to upgrade.');

													this.sendPairingPrompt("Updating Zigbee2MQTT to " + github_json.tag_name);

													this.delete_z2m();
													this.download_z2m(); // this also then installs and starts zigbee2mqtt

												}
											}
										});

									} catch (error) {
										console.error(error.message);
										this.run_zigbee2mqtt();
									}
								});
							});

							req.on('error', (e) => {
								console.error(e);
								this.run_zigbee2mqtt();
							});
							req.end();
						} catch (error) {
							console.error(error.message);
							this.run_zigbee2mqtt();
						}
					} else {
						// Skipping auto-update check
                        this.z2m_installed_succesfully = true;
						this.run_zigbee2mqtt();
					}
				}
			}); // end of fs.access check

		} else {
			console.log("Not using built-in zigbee2mqtt");
			this.z2m_started = true;
		}
        
        // Start the periodic availability check, which pings routers every 2 minutes.
        /*
        this.pinging_things = false;
        
        this.ping_interval = setInterval(() => {
            
            // this.config.manual_toggle_response
            if (!this.config.debug) { // TODO: remove this again for more ping testing.
                //this.ping_things();
            }
            
        }, 120000);
        */

	}












    // Pings all routers to see if they are (still) connected. E.g. lightbulbs that may have been turned off.
    ping_things(){
        if (this.config.debug) {
            console.log("in ping_things");
        }
        try{
            if(this.z2m_state == true && this.pinging_things == false && typeof this.persistent_data.devices_overview != 'undefined'){
                this.pinging_things = true;
                var query_delay = 1;
                var ping_counter = 0;
                for (const device_id in this.persistent_data.devices_overview) {
                    if (this.persistent_data.devices_overview.hasOwnProperty(device_id)) {
                        const device_info = this.persistent_data.devices_overview[device_id];
                        //console.log("availability check loop: " + device_id);
                        //console.log(device_info);
                        if( typeof device_info.type != 'undefined'){
                            //console.log("- device_info.type: " + device_info.type);
                            //console.log("- device_info.power_source: " + device_info.power_source);
                            if(device_info.type == 'Router' && device_info.power_source != 'battery'){
                            
                                var device = this.getDevice(device_id);
                                if(device){
                					var property = device.findProperty('state');
                					if (property) {
                                        //console.log("PINGING TO:");
                                        //console.log(property);
                                        //console.log("property.options: ", property.options);
                                        //console.log("should ping this device. query_delay: " + query_delay);
                                        ping_counter++;
                                        setTimeout(() => {
                                            const z_id = device_info.zigbee_id;
                                            if (this.config.debug) {
                                                console.log(query_delay + " pinging: " + device_info.zigbee_id);
                                            }
                                            //console.log("ping alt: " + z_id);
                    						this.publishMessage(`${device_info.zigbee_id}/get`, {
                    							"state": ""
                                            });
                                        }, query_delay);
                            
                                        query_delay += 1000;
                                    }
                                    else{
                                        console.log("ping: potential device didn't have state, skipping: " + device_id);
                                    }
                                }
                            }
                        }
                    }
                }
            
                setTimeout(() => {
                    if (this.config.debug) {
                        console.log('finished pinging devices');
                    }
                    this.pinging_things = false;
                }, ping_counter * 1001);
            
            
            }
        }
        catch(e){
            console.log("error in ping_things: ", e);
        }
    }




	// By having the config files outside of the zigbee2mqtt folder it becomes easier to update zigbee2mqtt
	check_if_config_file_exists() {
		try {
			if (this.config.debug) {
				console.log('Checking if config file exists');
			}
            
            
			fs.access(this.zigbee2mqtt_configuration_file_path, (err) => {
							
                if (err && err.code === 'ENOENT') {
					console.log('The configuration.yaml source file didn\'t exist yet:', this.zigbee2mqtt_configuration_file_source_path);
				}
                
                var base_config = "";
                
                // Home Assistant support
                if (this.config.home_assistant_support == true) {
                    base_config += "homeassistant: true\n";
				}
                else{
                    base_config += "homeassistant: false\n";
                }
                
                base_config += "permit_join: false\n" +
                        "devices: devices.yaml\n" +
                        "groups: groups.yaml\n" +
						"mqtt:\n" +
						"  base_topic: zigbee2mqtt\n" +
						"  server: 'mqtt://localhost'\n" +
						"serial:\n" +
						"  port: " + this.config.serial_port + "\n" +
                        "availability:\n" +
                        "  active:\n" +
                        "    timeout: " + this.availability_interval + "\n" +
                        "  passive:\n" +
                        "    timeout: 1500\n" +
                        "ota:\n" +
                        "  update_check_interval: 2880\n" +
						"advanced:\n" +
                        "  cache_state: true\n" +
                        "  cache_state_persistent: true\n" +
                        "  cache_state_send_on_startup: true\n" +
                        "  last_seen: 'epoch'\n";
                        
                
                //console.log("this.config.disable_improved_security = " + this.config.disable_improved_security);
                
                if(this.improve_security){
                    if (this.config.debug) {
                        console.log('Adding extra security.');
                        console.log("this.security.pan_id = " + this.security.pan_id);
                    }
                    if(this.security.pan_id != ""){
                        base_config += "  pan_id: " + this.security.pan_id + "\n" +
                        "  network_key: [" + this.security.network_key + "]\n";
                    }
                    else{
                        console.log('Warning: security pan_id was empty! Security was not upgraded, and is using default values.');
                    }
                }
                
				base_config += "  legacy_api: false\n" +
						"device_options:\n" +
                        //"  debounce: 1\n" +
                        //"  debounce_ignore: action\n" +
					    "  legacy: false\n" +
                        "  filtered_attributes: ['Action group', 'Action rate', 'xy']\n";

                //if(!this.config.virtual_brightness_alternative){
                    console.log("using Zigbee2MQTT's built-in simulated brightness feature");
                    base_config += "  simulated_brightness:\n" +
					"    delta: 2\n" +
					"    interval: 100\n";
                //}
                
                
                //base_config += "external_converters:\n" +
                //"  - door_lock.js\n" +;
			    //"  - TZE200_kzm5w4iz.js\n";
                //"  - leak.js\n";
                
                if (this.config.debug) {
                    console.log("- - -");
                    console.log(base_config);
                    console.log("- - -");
                }
                
				fs.writeFile(this.zigbee2mqtt_configuration_file_path, base_config, (err) => {
					if (err) {
						console.log("Error writing base configuration.yaml file");
					} else {
						console.log('basic configuration.yaml file was succesfully created at: ' + this.zigbee2mqtt_configuration_file_path);
					}
				});

			});
		} catch (error) {
			console.error(`Error checking if zigbee2mqtt config file exists: ${error.message}`);
		}
	}



	stop_zigbee2mqtt() {
		try {
			this.zigbee2mqtt_subprocess.kill();
		} catch (error) {
			console.error(`Error stopping zigbee2mqtt: ${error.message}`);
    		if (this.config.local_zigbee2mqtt == true) {
    			// Make sure previous instances of Zigbee2mqtt are gone
    			try {
    				//execSync("pgrep -f 'zigbee2mqtt-adapter/zigbee2mqtt/index.js' | xargs kill -9");
    				execSync("pkill 'zigbee2mqtt-adapter/zigbee2mqtt/index.js'");
    				console.log("pkill done");
    			} catch (error) {
    				console.log("exec pkill error: " + error);
    			}
    		}
		}
	}



	run_zigbee2mqtt(delay = 10) {
        //if (this.config.debug) {
        console.log("in run_zigbee2mqtt. Will really start in: " + delay + " seconds.");
        //}
        setTimeout(this.check_if_config_file_exists.bind(this), 4000);
		setTimeout(this.connect_to_mqtt.bind(this), delay * 1000); // wait 10 seconds before really starting Zigbee2MQTT, to make sure serial port has been released.
    }


    //if(this.mqtt_connection_attempted == false){
    //    this.connect_to_mqtt();
    //}



    connect_to_mqtt(){
        console.log("attempting to latch onto MQTT");
		// Start MQTT connection
		this.client = mqtt.connect(this.config.mqtt);
        this.client.on('connect', () => {
            this.mqtt_connected = true;
            
    		this.client.subscribe(`${this.config.prefix}/bridge/devices`);
            this.client.subscribe(`${this.config.prefix}/bridge/state`);
    		//this.client.subscribe(`${this.config.prefix}/bridge/event`); // in practise these messages hardly ever appear, and were useless. Used availability instead.
    		this.client.subscribe(`${this.config.prefix}/bridge/response/networkmap`);
    		this.client.subscribe(`${this.config.prefix}/bridge/response/device/ota_update/update`);
            this.client.subscribe(`${this.config.prefix}/bridge/response/device/ota_update/check`);
            
            if(this.z2m_started == false){
                console.log("MQTT is now connected. Next, starting Zigbee2MQTT (since it will now also be able to connect to MQTT)");
                this.really_run_zigbee2mqtt();
            }
            else{
                console.log("Warning: z2m_started was already true in MQTT on_connect, so Z2M will not be started.");
            }
        })
		this.client.on('error', (error) => console.error('mqtt error:', error));
        this.client.onConnectionLost = this.on_mqtt_connection_lost;
		this.client.on('message', this.handleIncomingMessage.bind(this));

        this.mqtt_connection_attempted = true;

		//this.client.subscribe(`${this.config.prefix}/#`);
    }


    on_mqtt_connection_lost(){
        console.log("ERROR: client lost connection to MQTT! This means the addon will no longer receive messages from Zigbee2MQTT. It should automatically reconnect soon.");
        this.mqtt_connected = false;
    }



	really_run_zigbee2mqtt() {
        //if (this.config.debug) {
			console.log('really starting zigbee2MQTT using: node ' + this.zigbee2mqtt_file_path);
			console.log("initial this.config.serial_port = " + this.config.serial_port);
			console.log("this.zigbee2mqtt_configuration_devices_file_path = " + this.zigbee2mqtt_configuration_devices_file_path);
			console.log("this.zigbee2mqtt_configuration_log_path = " + this.zigbee2mqtt_configuration_log_path);
        //}
		process.env.ZIGBEE2MQTT_DATA = this.zigbee2mqtt_data_dir_path;
		process.env.ZIGBEE2MQTT_CONFIG_MQTT_BASE_TOPIC = this.config.prefix;
		process.env.ZIGBEE2MQTT_CONFIG_MQTT_SERVER = this.config.mqtt;
		process.env.ZIGBEE2MQTT_CONFIG_SERIAL_PORT = this.config.serial_port;
		process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LEGACY_API = false;
        process.env.ZIGBEE2MQTT_CONFIG_MQTT_BASE_TOPIC = this.config.prefix;

		process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_FILE = 'Zigbee2MQTT-adapter-%TIMESTAMP%.txt';

		if (typeof this.config.ikea_test_server != "undefined") {
			if (this.config.debug) {
				console.log("Using IKEA test server for firmware updates? " + this.config.ikea_test_server);
			}
            if(this.config.ikea_test_server){
                process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_IKEA_OTA_USE_TEST_URL = this.config.ikea_test_server;
            }
			
		} else {
			if (this.config.debug) {
				console.log("Ikea test server preference was undefined");
			}
		}
		//process.env.ZIGBEE2MQTT_CONFIG_DEVICE_OPTIONS_SIMULATED_BRIGHTNESS = true; // doesn't seem to work. Moved it into configuration.yaml instead

		process.env.ZIGBEE2MQTT_CONFIG_MAP_OPTIONS_GRAPHVIZ_COLORS_FILL_COORDINATOR = '#333333';
		process.env.ZIGBEE2MQTT_CONFIG_MAP_OPTIONS_GRAPHVIZ_COLORS_FILL_ROUTER = '#666666';
		process.env.ZIGBEE2MQTT_CONFIG_MAP_OPTIONS_GRAPHVIZ_COLORS_FILL_ENDDEVICE = '#CCCCCC';

		process.env.ZIGBEE2MQTT_CONFIG_MAP_OPTIONS_GRAPHVIZ_COLORS_LINE_ACTIVE = '#5d9bc7';
		process.env.ZIGBEE2MQTT_CONFIG_MAP_OPTIONS_GRAPHVIZ_COLORS_LINE_INACTIVE = '#554444';


		if (this.config.debug) {
			process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_LEVEL = 'debug';
		} else {
			process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_LEVEL = 'debug';
            //process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_LEVEL = 'error';
		}
		if (typeof this.config.channel != "undefined") {
			process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_CHANNEL = Math.round(Number(this.config.channel));
		}

		if (this.current_os == 'linux') {
            process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_DIRECTORY = this.zigbee2mqtt_configuration_log_path;
			/*
            if (this.config.debug) {
				
			} else {
				process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_DIRECTORY = '/tmp'; // for normal linux users the log file will be automatically deleted
			}*/
		} else {
			process.env.ZIGBEE2MQTT_CONFIG_ADVANCED_LOG_DIRECTORY = this.zigbee2mqtt_configuration_log_path; // Not sure where /tmp directories are on other OS-es.
		}

		//process.env.ZIGBEE2MQTT_CONFIG_DEVICES = this.zigbee2mqtt_configuration_devices_file_path;
		//process.env.ZIGBEE2MQTT_CONFIG_GROUPS = this.zigbee2mqtt_configuration_groups_file_path;

        this.z2m_installed_succesfully = true;
		this.z2m_started = true;
		this.addon_start_time = Date.now();

        /*
		if (this.config.debug) {
			this.zigbee2mqtt_subprocess = spawn('node', [this.zigbee2mqtt_file_path], {
				stdio: [process.stdin, process.stdout, process.stderr]
			});
		} else {
			this.zigbee2mqtt_subprocess = spawn('node', [this.zigbee2mqtt_file_path], {
				//stdio: ['ignore', 'ignore', process.stderr]
                stdio: [process.stdin, process.stdout, process.stderr]
			});
		}
        */
        
        try{
            var parent_scope = this;
            
            this.zigbee2mqtt_subprocess = spawn('node', [this.zigbee2mqtt_file_path]);
        
            this.zigbee2mqtt_subprocess.stdout.setEncoding('utf8');
            this.zigbee2mqtt_subprocess.stdout.on('data', (data) => { // 
                //Here is where the output goes
                
                console.log('z2m stdout: ' + data);
                
                //console.log('parent_scope: ', parent_scope);
                
                data=data.toString();
                
                if( data.includes("rror while opening serialport") ){
                    console.log('ERROR: COULD NOT CONNECT TO THE USB STICK. PLEASE RESTART THE CONTROLLER. MAKE SURE OTHER ZIGBEE ADDONS ARE DISABLED.');
                    this.sendPairingPrompt("Zigbee stick did not respond, please restart the controller");
                }
                else if( data.includes("ailed to start") ){
                    console.log("Yikes, failed to start Zigbee2MQTT. Try again later?");
                    try{
                        execSync("pkill 'zigbee2mqtt-adapter/zigbee2mqtt/index.js'");
                    }
                    catch(e){
                        console.log("pkill error: " + e);
                    }
                    //parent_scope.run_zigbee2mqtt(61); // wait 61 seconds before retrying
                    this.run_zigbee2mqtt(61); // wait 61 seconds before retrying
                }
                else if( data.includes(", failed") ){
                
                    //const zigbee2mqtt_dir = path.join(path.resolve('../..'), '.webthings', 'data', 'zigbee2mqtt-adapter','zigbee2mqtt');
                    console.log("Yikes, Zigbee2MQTT may not be installed ok. Will attempt to fix. Dir: " + this.zigbee2mqtt_dir_path);
                
        			exec(`cd ${this.zigbee2mqtt_dir_path}; npm i --save-dev @types/node; npm ci --production`, (err, stdout, stderr) => {
        				if (err) {
        					console.error(err);
        					return;
        				}
                        else{
                            console.log("nice, fix attempt did not create an error?");
                        }
        				if (this.config.debug) {
        					console.log(stdout);
        				}
        				console.log("-----INSTALL FIX ATTEMPT COMPLETE-----");
    				
        				//parent_scope.run_zigbee2mqtt();
                        this.run_zigbee2mqtt();
        			});
                    
                }
                
            });
        
            this.zigbee2mqtt_subprocess.stderr.setEncoding('utf8');
            this.zigbee2mqtt_subprocess.stderr.on('data', (data) => {
                //Here is where the error output goes
                
                if (this.config.debug) {
                    console.log('z2m stderr: ', data);
                }

            });

            //this.zigbee2mqtt_subprocess.on('close', function(code) {
            this.zigbee2mqtt_subprocess.on('close', (code) => {
                //Here you can get the exit code of the script
                if (this.config.debug) {
                    console.log('z2m closing code: ' + code);
                }
                if(code == 0){
                    console.log("Z2M closed cleanly.");
                }
                else{
                    console.log("Warning, Z2M did not close cleanly. Error code: " + code);
                    this.z2m_state = false;
                }
                this.z2m_started = false;
                //console.log('Full output of script: ',scriptOutput);
            });
            
        }
        catch(e){
            console.log("Error in really_run:",e);
        }

	}



	download_z2m() {
        this.z2m_installed_succesfully = false;
        try{
    		exec(`git clone --depth=1 https://github.com/Koenkk/zigbee2mqtt ${this.zigbee2mqtt_dir_path}`, (err, stdout, stderr) => {
    			if (err) {
    				console.error(err);
    				return;
    			}
    			if (this.config.debug) {
    				console.log(stdout);
    			}
    			console.log("-----DOWNLOAD COMPLETE, STARTING INSTALL-----");
                
                // Create new security file
                try {
        			fs.access(this.zigbee2mqtt_configuration_security_file_path, (err) => {
        				if (err && err.code === 'ENOENT') {
        					if (this.config.debug) {
        						console.log('zigbee2mqtt security file did not exist yet.');
        					}
                    
                            this.security = {
                                pan_id: rand_hex(4),
                                network_key: generate_security_key()
                            };
                            if (this.config.debug) {
                                console.log("new security details: ", this.security);
                            }
					
                            fs.writeFile( this.zigbee2mqtt_configuration_security_file_path, JSON.stringify( this.security ), "utf8", function(err, result) {
                                if(err) console.log('file write error:', err);
                            });
                    
        				} 
                        
                    });
    			} 
                catch (error) {
    				console.error("Error while checking/opening security file: " + error.message);
    			}
                
                
                const command_to_run = `cd ${this.zigbee2mqtt_dir_path}; npm install -g typescript; npm i --save-dev @types/node; npm ci`; //npm ci --production
                if (this.config.debug) {
                    console.log("command_to_run: " + command_to_run);
                }
    			exec(command_to_run, (err, stdout, stderr) => { // npm ci --production
    				if (err) {
    					console.error(err);
                        this.z2m_installed_succesfully = false;
    					return;
    				}
    				if (this.config.debug) {
    					console.log(stdout);
    				}
    				console.log("-----INSTALL COMPLETE-----");
                    this.z2m_installed_succesfully = true;
    				this.sendPairingPrompt("Zigbee2MQTT installation complete. Starting...");
    				this.run_zigbee2mqtt();
    			});
    		});
        }
        catch(e){
            console.log("ERROR DURING INSTALL OF ZIGBEE2MQTT!:" + e);
        }
		
	}



	delete_z2m() {
        this.z2m_installed_succesfully = false;
        this.stop_zigbee2mqtt()
		if (this.config.debug) {
			console.log('Attempting to delete local zigbee2mqtt from data folder');
		}
		try {
			execSync(`rm -rf ${this.zigbee2mqtt_dir_path}`);
            execSync(`rm ${this.zigbee2mqtt_configuration_file_path}`);
			return true;
		} catch (error) {
			console.error('Error deleting:', error);
			return false;
		}
		return false;
	}



    //
    //  HANDLE INCOMING MQTT MESSAGE
    //

	handleIncomingMessage(topic, data) {
		try{
    		if (this.config.debug){ // && !topic.endsWith('/availability') ) {
    			console.log('');
    			console.log('_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ * * *');
    			console.log('in incoming message, topic: ' + topic);
    			//console.log(this.config.prefix);
                //console.log('msg data: ', data.toString());
            }

    		if (topic.trim() == this.config.prefix + '/bridge/logging') {
    			console.log("ignoring logging");
    			return;
    		}
            

    		if (topic.trim() == this.config.prefix + '/bridge/state') {
    			if (this.config.debug) {
    				console.log("/bridge/state detected: ");
                    console.log('msg data: ', data.toString());
    			}
                if(data.toString() == 'offline'){
                    this.z2m_state = false;
                    console.log("Z2M has stopped");
                }
                else{
                    console.log("Z2M is now running");
                    this.z2m_state = true;
                    //this.ping_things();
                    
                    this.ping_interval = setTimeout(() => {
            
                        // this.config.manual_toggle_response
                        if (!this.config.debug) { // TODO: remove this again for more ping testing.
                            //this.ping_things();
                        }
            
                    }, 3000); // 30 seconds after starting, we make sure we have to correct state for all the lights.
                    
                    
                }
            }

            // Do not parse anything else until Z2M is connected
            // Actually.. why not.
            if(this.z2m_state == false){    
    			if (this.config.debug) {
    				console.log("early message, but Z2M is still offline");
    			}
    			//return;
    		}

            //
            //  Parse incoming availability message
            //

    		if (topic.endsWith('/availability')) { // either "online" or "offline" as payload
    			if (this.config.debug) {
                    console.log("Received availability message. Data = " + data.toString());
                }
                
    			if (data == "offline" || data == "online") {
    				const zigbee_id = topic.split('/')[1];
                    const device_id = 'z2m-' + zigbee_id;

    				const device = this.getDevice(device_id); // try to get the device
    				if (!device) {
    					if (this.config.debug) {
    						console.log("- strange, got availability data for a device that wasn't created yet: " + device_id);
    					}
    					return;
    				} 
                    else {
                    
                        try{
                            //console.log("this.persistent_data.devices_overview[device_id].type: " + this.persistent_data.devices_overview[device_id].type);
                            if(this.persistent_data.devices_overview[device_id].type == 'Router'){
                                console.log(">> router <<");
                            }
                            //if(typeof this.persistent_data.devices_overview[device_id].type != 'undefined'){
                            //    console.log("availability: type data in devices_overview: " + this.persistent_data.devices_overview[device_id].type);
                            //}
                        }
                        catch(e){
                            console.log("availability error: that device had no type data in devices_overview");
                        }

    					if (data == "offline") { // && device.connected == true ){
    						if (this.config.debug) {
    							console.log("O F F L I N E (got availability message). this.config.manual_toggle_response = " + this.config.manual_toggle_response);
    						}
                            
                            //console.log('device.properties: ', device.properties);
                            //console.log("device.properties.contact: " + device.properties.contact);
                            //for(proppy in device.properties){
                            //    console.log("proppy: ", proppy);
                            //}
                            
                            //console.log("device.hasProperty('state'): ", device.hasProperty('state'));
                            
                            if( device.hasProperty('contact') || device.hasProperty('water_leak') || device.hasProperty('action') || device.hasProperty('vibration') || device.hasProperty('smoke')){
                                if (this.config.debug) {
                                    console.log("device has contact, leak, action, vibration or similar property, so will likely not send data very often. Offline message should be ignored.");
                                }
                                device.connectedNotify(true);
                            }
                            else{
                                if (this.config.debug) {
                                    console.log("offline, and device doesn't have smoke/water_leak/etc");
                                }
                                const property = device.findProperty('state');
                                if (property) {
                                    if (this.config.debug) {
                                        console.log("ofline, and found state property");
                                    }
            						// Set state to off
            						if (this.config.manual_toggle_response == "toggle off" || this.config.manual_toggle_response == "both") {
                    					if (property.readOnly == false) { // an extra check
                							if (this.config.debug) {
                                                console.log("availability: manual_toggle_response: also setting state to false: ", device_id);
                                            }
            							    property.setCachedValue(false);
            							    device.notifyPropertyChanged(property);
                                        }
                                        else{
                                            if (this.config.debug) {
                                                console.log("interesting, found a state property that is read-only.");
                                            }
                                        }

            						}

            						// Set to disconnected
            						if (this.config.manual_toggle_response == "disconnected" || this.config.manual_toggle_response == "both") {
            							if (this.config.debug) {
                                            console.log("availability: manual_toggle_response: setting device connected to false: ", device_id);
                                        }
            							this.devices[device_id].connected = false;
            							device.connectedNotify(false);
            						}
                                }
                                else{
                                    //console.log('offline, and no state property spotted');
        							if (this.config.debug) {
                                        console.log("availability: manual_toggle_response: setting device connected to false: ", device_id);
                                    }
                                    if(this.persistent_data.devices_overview[device_id].type == 'Router'){
                                        //console.log('offline, and router, so toggling to offline.');
                                        device.connectedNotify(false);
                                    }
                                }
                            }

    					} else if (data == "online") { //  && device.connected == false ){
    						if (this.config.debug) {
    							console.log("O N L I N E");
    						}
    						this.devices[device_id].connected = true;
    						device.connectedNotify(true);
    					}
    				}

    			}
                return;
    		} // end of availablity message parsing
        



            //
            //  Are we receiving JSON?
            //  This check is questionable, as some parts of Z2M can still return strings. In theory those aspects of Z2M should be handled by now.

    		// Only proper JSON data is allowed to pass beyond this point
    		if (!data.toString().includes(":")) {
    			if (this.config.debug) {
                    console.log("incoming message did not have a : in it? Not proper json, so will not process the incoming message further: ", data.toString());
                }
    			return;
    		}


            //
            //  Add new devices based on full devices info
            //

    		try {
    			var msg = JSON.parse(data.toString());            

    			if (topic.trim() == this.config.prefix + '/bridge/devices') {
    				if (this.config.debug) {
    					console.log("/bridge/devices detected");
    				}
                
    				try {
    					for (const device of msg) {
                            try {
                                if (this.config.debug) {
                                    console.log("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");
                                    //console.log("looping over device: ", device);
                                }
                                if(typeof device.type != "undefined"){
                                    if(device.type != "Coordinator"){
                                
                                        if(typeof device.interview_completed != "undefined" && typeof device.interviewing != "undefined" && device.supported != 'undefined'){
                                            if (this.config.debug) {
                                                console.log("- device.type was not undefined or coordinator, it was: " + device.type);
                                                
                                            }
                                            if(device.interview_completed == true && device.interviewing == false && device.supported == true){
                                                if (this.config.debug) {
                                                    console.log("device is supported and not in the interviewing stage, so may be added");
                                                }
                                                this.addDevice(device);
                                            }
                                            else{
                                                if (this.config.debug) {
                                                     console.log("? ? ?");
                                                    console.log("Warning, device is still in the proces of being interviewed OR is not supported:");
                                                    console.log(device.manufacturer, device.model_id, device.ieee_address);
                                                    console.log(device);
                                                    console.log("? ? ?");
                                                }
                                            }
                                        }
                                        else{
                                            if (this.config.debug) {
                                                console.log("INTERESTING, device was missing an interview related property");
                                            }
                                        }
                                
                                    }
                                    else{
                                        if (this.config.debug) {
                                            console.log("ignoring coordinator device");
                                        }
                                    }
                                }
                                else{
                                    if (this.config.debug) {
                                        console.log("device type was undefined");
                                    }
                                    //this.addDevice(device);
                                }
                            }
                            catch(e){
                                console.log("Error while parsing device information: ", e);
                            }
						
    					}
    				} catch (error) {
    					console.log("Error parsing /bridge/devices: " + error);
                        return;
    				}
    			}
    		} catch (error) {
    			console.log("msg parsing error (not valid json?): ", error);
                return;
    		}



            //
            //  INCOMING DATA MESSAGE
            //

    		// if it's not an 'internal' message, it must be a message with information about properties
    		if (!topic.startsWith(this.config.prefix + '/bridge')) {
    			try {
    				const zigbee_id = topic.split('/')[1];
                    const device_id = 'z2m-' + zigbee_id;
    				if (this.config.debug) {
    					console.log("- zigbee_id = " + zigbee_id);
    				}
    				const device = this.getDevice(device_id); // try to get the device
    				if (!device) {
    					if (this.config.debug) {
    						console.log("- strange, that device could not be found: " + device_id);
    					}
    					return;
    				}


                    // data transmission allowed check
                    const data_transmission_property = device.findProperty('data_transmission');
                    if (!data_transmission_property) {
                        if (this.config.debug) {
                            console.log("- strange, data transmission property not found");
                        }
                    }
                    else{
                        //console.log("data_transmission_property value:");
                        //console.log(data_transmission_property.value);
                        if(data_transmission_property.value == false){
                            if (this.config.debug) {
                                console.log("receiving data has been prevented by data transmission feature");
                            }
                            return;
                        }
                    }


    				if (msg.action && device.events.get(msg.action)) { // if there's an action (event), and the action exists in the device
                        if (this.config.debug) {
                            console.log("creating event from action");
                        }
                        const event = new Event(
    						device,
    						msg.action,
    						msg[device.events.get(msg.action)],
    					);
    					device.eventNotify(event);
    				}
                

                    // Here pressure is taken from the incoming message despite not being run though the "fromMQTT" function first, which transforms it into a WebThings Gateway property. But it should be ok.
                    if(typeof msg.pressure != 'undefined' && typeof msg.temperature != 'undefined'){
                        if (this.config.debug) {
                            console.log("PRESSURE SPOTTED on what is likely some sort of climate sensor");
                        }
                        try{
                            var is_barometer = false;
                            if( msg.pressure > 850 && msg.pressure < 1100){
                                let date_time = new Date();
                                barometer.addPressure(date_time, msg.pressure * 100);
                                is_barometer = true;
                            }
                            else if( msg.pressure > 85000 && msg.pressure < 110000){
                                let date_time = new Date();
                                barometer.addPressure(date_time, msg.pressure);
                                is_barometer = true;
                            }
                        
                            if(is_barometer){
                                var northern_hemisphere = true;
                                if(typeof this.config.southern_hemisphere != 'undefined'){
                                    northern_hemisphere = !this.config.southern_hemisphere;
                                }
                                if (this.config.debug) {
                                    console.log("on northern hemisphere?: " + northern_hemisphere);
                                }
                            
                                let forecast = barometer.getPredictions(northern_hemisphere); //returns JSON
                        
                                if (this.config.debug) {
                                    console.log("forecast: ", forecast);
                                }
                                if(forecast == null){
                                    if (this.config.debug) {
                                        console.log("forecast was still null");
                                    }
                                    msg['barometer_tendency'] = 'unknown';
                                    msg['barometer_trend'] = 'unknown';
                                    msg['weather_prediction'] = 'unknown';
                                }
                                else{
                                    // tendency (rising/falling)
                                    if(typeof forecast.trend.tendency != 'undefined'){
                                        msg['barometer_tendency'] = forecast.trend.tendency;
                                    }
                                    else{
                                        msg['barometer_tendency'] = 'unknown';
                                    }
                        
                                    if(typeof forecast.trend != 'undefined'){
                                        msg['barometer_trend'] = forecast.trend.trend;
                                    }
                                    else{
                                        msg['barometer_trend'] = 'unknown';
                                    }
                        
                                    if(typeof forecast.predictions != 'undefined'){
                                        msg['weather_prediction'] = forecast.predictions.pressureOnly
                                    }
                                    else{
                                        msg['weather_prediction'] = 'unknown';
                                    }
                                }
                            
                                this.persistent_data['barometer_measurements'] = barometer.getAll();
                                console.log("ALL BAROMETER VALUES: ", this.persistent_data['barometer_measurements']);
                                this.save_persistent_data();
                            }
                        
                        
                    
                        
                        }
                        catch(e){
                            console.log("Error appending weather prediction based on barometric pressure: ", e);
                        }
                    
                    
                    }
                
                    //
                    //  LOOP OVER AND ADD/UPDATE THE PROPERTIES FROM THE INCOMING MESSAGE
                    //
                
                
    				for (const key of Object.keys(msg)) { // loop over properties in the message
                        if (this.config.debug) {
                            //console.log(" #");
                            //console.log(key);
                        }


                    
                        //
                        //  SOME PROPERTIES ARE IGNORED
                        //
                    
                        if( key == "action_group" || key == "action_rate" || key == "action_step_size" || key == "action_transition_time"){ // Action rate isn't very useful for anything, so skip that.
    						if (this.config.debug) {
    							console.log("- ignoring property: " + key);
    						}
                            continue;
                        }
                    


                        if( key == "last_seen"){
                            if (this.config.debug) {
                                console.log('last_seen spotted. value: ' + msg[key]);
                            }
                            continue;
                        }


                        //
                        //  MODIFY SOME VALUES TO BETTER FOR
                        //

    					//console.log("updating this property:");
    					//console.log(property);
                        
                        if (key == 'lock') {
                            if(msg[key].toLowerCase() == 'lock'){msg[key] == 'locked';}
                            if(msg[key].toLowerCase() == 'unlock'){msg[key] == 'unlocked';}
                        }
                        // this should really be handled by a litle fuction in exposesDeviceGenerator.
                    
                    
                    
    					// Check if device can be updated. Example update data: "update":{"progress":100,"remaining":6,"state":"updating"}}
    					if (key == 'update') {
    						if (this.config.debug) {
                                console.log("- spotted update information: ", msg[key]);
                            }
    						//if (!this.updating_firmware) {
                                if(typeof msg[key]['state'] != 'undefined'){
                                
                                    this.persistent_data.devices_overview[device_id]['update'] =  msg[key];
                                    /*
                                    if(msg[key]['state'] == 'available'){
                                        this.persistent_data.devices_overview[zigbee_id]['update_available'] = true;
                                        this.persistent_data.devices_overview[zigbee_id]['update_progress'] = 0;
                                        //msg['update_available'] = true;
                                    }
                                    else if(msg[key]['state'] == 'updating'){
                                        console.log("THIS DEVICE IS UPDATING ITS FIRMWARE");
                                        this.persistent_data.devices_overview[zigbee_id]['update_available'] = false;
                                        //msg['update_available'] = false;
                                        this.updating_firmware = true;
                                        if(typeof msg[key]['progress'] != 'undefined'){
                                            console.log("firmware update progress: ", msg[key]['progress']);
                                            //this.updating_firmware_progress = msg[key]['progress'];
                                            this.persistent_data.devices_overview[zigbee_id]['update_progress'] = msg[key]['progress'];
                                        }
                                    }
                                    else if(msg[key]['state'] == 'idle'){
                                        this.persistent_data.devices_overview[zigbee_id]['update_available'] = false;
                                        //msg['update_available'] = false;
                                        this.persistent_data.devices_overview[zigbee_id]['update_progress'] = 0;
                                    }
                                    */
                                }
                            //}
                            continue;
    					}
                    
                        // officially deprecated in Z2M
    					if (key == 'update_available') {
    						if (this.config.debug) {
                                console.log("- found deprecated update_available information, storing in devices_overview.");
                            }
    						//if (!this.updating_firmware) {
    						this.persistent_data.devices_overview[device_id]['update_available'] = Boolean(msg[key]);
                            //}
    					}
                    

    					// Attempt to make a color compatible with the gateway's HEX color system
    					try {
    						if (key == 'color' && typeof msg[key] == "object") {
    							if (this.config.debug) {
    								console.log("- translating color to hex");
    							}
    							var brightness = 254;
    							if ('brightness' in msg) {
    								brightness = msg['brightness'];
    							}
    							if (msg[key].hasOwnProperty('x') && msg[key].hasOwnProperty('y')) {
    								msg[key] = XYtoHEX(msg[key]['x'], msg[key]['y'], brightness); // turn x+y coordinates into hex color
    							}
    							else {
    								// when a nested color payload was sent, but x or y is missing.
    								// Otherwise the gateway framework will throw exceptions and the device won't work,
    								// when it tries to split the color object.
    								msg[key] = '#FFFFFF';
    							}
    						}
    					} catch (error) {
    						console.log("zigbee2mqtt: error fixing color: " + error);
    						continue;
    					}





                        //
                        //  FIND PROPERTY OBJECT
                        //

    					var property = device.findProperty(key);
    					if (!property) {
    						if (this.config.debug) {
    							console.log("- that property could not be found: " + key);
    						}

    						if (key != "update" && typeof msg[key] != "object") { // && key != "update_available"
    							if (this.config.debug) {
    								console.log("- attempting to create missing property");
    							}
    							this.attempt_new_property(device, key, msg[key]); // fromMqtt doesn't exist here, so the value isn't run through that process.
                                if (this.config.debug) {
                                    console.log("calling handleDeviceAdded");
                                }
                                this.handleDeviceAdded(device);
    						} 
                            else {
    							if (this.config.debug) {
    								console.log("- ignoring update property");
    							}
    							continue;
    						}

    						// Check if the missing property has succesfully been created. If so, then its value may be immediately set
    						property = device.findProperty(key);
    						if (!property) {
                                if (this.config.debug) {
                                    console.log("Error: missing property still has not been created");
                                }
    							continue;
    						}
    					}
                    

    					// Modify byte (0-255) to a percentage (0-100). Whether this should be done is stored inside the property. TODO: this might not be persistent yet.
    					try {
    						if (property.options.hasOwnProperty("origin")) {

    							if (property.options.origin == "exposes-scaled-percentage") {
    								if (this.config.debug) {
    									console.log("- translating byte to percentage");
    								}
    								msg[key] = integer_to_percentage(msg['brightness'], property.options.origin_maximum);
    							}
    						}
    					} catch (error) {
    						console.log("Zigbee2MQTT addon: error translating byte to percentage: " + error);
    						continue;
    					}


                        // Allow fromMQTT to translate from MQTT values to Webthings compatible values.
						const {
							fromMqtt = identity
						} = property.options;

                        const old_val = msg[key];

                        msg[key] = fromMqtt(msg[key]); // at this point the value is changed from the MQTT messages to a Webthings compatible value

                        
                        // Check for minimum and maximum
    					try {
    						if (property.options.hasOwnProperty("minimum")) {
                                //console.log(key + " has a minimum for this value: ", property.options.minimum);
                                if( msg[key] < property.options.minimum){
                                    //console.log("- setting value to null: " + msg[key]);
                                    msg[key] = null;
                                }
                            }
    						if (property.options.hasOwnProperty("maximum")) {
                                //console.log(key + " has a maximum for this value: ", property.options.maximum);
                                if( msg[key] > property.options.maximum){
                                    //console.log("- setting value to null: " + msg[key]);
                                    msg[key] = null;
                                }
    						}
    					} catch (error) {
    						console.log("Zigbee2MQTT addon: error checking for minumum/maximum overflow: " + error);
    						continue;
    					}
                        


                        //
                        //  HANDLE ACTION PROPERTY
                        //

    					// Check if an extra boolean or brightness property should be created/updated from action data
                        // This might not be necessary anymore, since ExposesDeviceGenerator now should already create these properties beforehand.
    					try {
    						if (key == 'action') {
    							if (this.config.debug) {
                                    console.log("key == action, action: " + msg[key]);
                                }
                                if(msg[key] != null){
                                
                                    // Figure out if this incoming action should also be used to change toggle buttons. This is only relevant id the message doesn't have properties indicating the device has its own proper properties by those names.
    							    if (!msg.hasOwnProperty('state') && !msg.hasOwnProperty('toggle')  && !msg.hasOwnProperty('pushed')) { // this would indicate that these properties officially exist
                                    
                                    
                                        // TOGGLE from on-off pair
                                        // An on or off message could still be relevant to both a toggle switch and a momentary push button, so we'll have to figure out if the toggle and pushed properties actually exist.
        								if (msg[key].toLowerCase() == "on" || msg[key].toLowerCase() == "off") {
        									//console.log("it's on or off");
    										var extra_boolean = false;
    										if (msg[key].toLowerCase() == "on") {
    											extra_boolean = true;
    										}
                                        
        									const extra_toggle_property = device.findProperty('toggle');
        									if (extra_toggle_property) { 
        										extra_toggle_property.setCachedValue(extra_boolean); // Technically this should now use the fromMqtt construction, but in practise these extra generated properties all use booleans normally, so translation is not necessary.
        										device.notifyPropertyChanged(extra_toggle_property);
                                            
                                                this.handle_persistent_value(zigbee_id, 'toggle', extra_boolean, true, false);
                                                this.save_persistent_data();
                                            
        										if (this.config.debug) {
        											console.log("extra_boolean updated to: " + extra_boolean);
        										}
        									}
                                            
                                            // PUSHED
                                            if(msg[key].toLowerCase() == "on"){
                                                // Let's try looking for a pushed property too. This is only relevant if the action was "on".
                                                const extra_pushed_property = device.findProperty('pushed');
                                                if(extra_pushed_property){
                                                    
                                                    // Turn it on...
                                                    extra_pushed_property.setCachedValue(true); // Technically this should now use the fromMqtt construction, but in practise these extra generated properties all use booleans normally, so translation is not necessary.
            										device.notifyPropertyChanged(extra_pushed_property);
                                                    
                                                    // ...and a second later turn it off again
                                                    setTimeout(() => {
                                                        //console.log("switching pushed property back to off");
                										extra_pushed_property.setCachedValue(false);
                										device.notifyPropertyChanged(extra_pushed_property);
                                                    }, 1000);
                                                    
                                                }
        										
        									}
        								}
                                    
                                        // TOGGLE from single action message
                                        // A toggle action is simpler to handle. When it arrives we change the value of the toggle property to its opposite. This state also recorded in the persistent device_overview to that its value will be restored after a restart.
                                        else if(msg[key].toLowerCase() == "toggle"){
                                            if (this.config.debug) {
                                                console.log("toggle action spotted");
                                            }
                                            extra_property = device.findProperty('toggle');
                                        
        									if (extra_property) { // this never happen, as actions are pre-defined in the device information, and the addon now uses that to generate these extra properties in the exposes device generator. But it can't hurt to have it in here, just in case.
        										
                                                if (this.config.debug) {
                                                    console.log("toggle extra_property.value: ", extra_property.value);
                                                }
                                            
        										var extra_boolean = !extra_property.value;
        										extra_property.setCachedValue(extra_boolean);
        										device.notifyPropertyChanged(extra_property);
                                            
                                                this.handle_persistent_value(zigbee_id, 'toggle', extra_boolean, true, false);
                                                this.save_persistent_data();
                                                
        										if (this.config.debug) {
        											console.log("extra toggle property switched to its opposite: " + extra_boolean);
        										}
        									}
                                        } 
                                    }

    							}
                                
                                
                                
                                // Left and Right arrow push buttons
                                // boolean action
    							if (!msg.hasOwnProperty('state') && !msg.hasOwnProperty('toggle')) {
                                    if(msg[key] != null){
        								if (msg[key].toLowerCase() == "on" || msg[key].toLowerCase() == "off") {
        									//console.log("it's on or off");
    										var extra_boolean = false;
    										if (msg[key].toLowerCase() == "on") {
    											extra_boolean = true;
    										}
                                        
        									const extra_property = device.findProperty('toggle');
        									if (!extra_property) {
        										console.log("no extra toggle property spotted, will attempt to generate it now");
                                                this.attempt_new_property(device, 'toggle', extra_boolean, true, false); // value, read-only and percentage-type
                                                this.handleDeviceAdded(device);
        									} 
                                            else {
                                                
        										extra_property.setCachedValue(extra_boolean);
        										device.notifyPropertyChanged(extra_property);
                                            
                                                this.handle_persistent_value(zigbee_id, 'toggle', extra_boolean, true, false);
                                                this.save_persistent_data();
                                            
        										if (this.config.debug) {
        											console.log("extra_boolean updated to: " + extra_boolean);
        										}
        									}
        								}
                                    
                                        else if(msg[key].toLowerCase() == "arrow_left_click" || msg[key].toLowerCase() == "arrow_right_click"){
                                            if (this.config.debug) {
                                                console.log("arrow action spotted");
                                            }
                                            extra_property = device.findProperty(msg[key].toLowerCase());
                                        
        									if (!extra_property) {
        										if (this.config.debug) {
                                                    console.log("no extra arrow click property spotted. Creating it now");
                                                }
                                                this.attempt_new_property(zigbee_id, msg[key].toLowerCase(), false, true, false); // value, read-only and percentage-type
                                                if (this.config.debug) {
                                                    console.log("calling handleDeviceAdded");
                                                }
                                                this.handleDeviceAdded(device);
                                                this.save_persistent_data();
        									}
                                            else {
                                                if (this.config.debug) {
                                                    console.log("Arrow click extra_property.value: ", extra_property.value);
                                                }
                                                
                                                console.log("switching push button to on for one second");
        										extra_property.setCachedValue(true);
        										device.notifyPropertyChanged(extra_property);
                                                
                                                setTimeout(() => {
                                                    console.log("switching push button back to off");
            										extra_property.setCachedValue(false);
            										device.notifyPropertyChanged(extra_property);
                                                }, 1000);
                                                
        										if (this.config.debug) {
        											console.log("extra_boolean updated to its opposite: " + extra_boolean);
        										}
                                            
        									}
                                        } 
                                    }

    							}
                                
                            
                                //this.config.virtual_brightness_alternative = true;
                            
                                if(this.config.virtual_brightness_alternative) {
                                    if (this.config.debug) {
                                        console.log("using virtual brightness alternative");
                                    }
                                    //var extra_property = null;
                                    if(msg[key] != null && msg['brightness'] != 'undefined'){
                                        if( msg[key].toLowerCase() == "brightness_move_up" || msg[key].toLowerCase() == "brightness_move_down" || msg[key].toLowerCase() == "brightness_step_up" || msg[key].toLowerCase() == "brightness_step_down"){
                                        
                                            var direction = 'down';
                                            if(msg[key].toLowerCase() == "brightness_move_up" || msg[key].toLowerCase() == "brightness_step_up"){
                                                direction = 'up';
                                            }
                                        
                                            if (this.config.debug) {
                                                console.log("brightness alternative: spotted brightness up or down direction: " + direction );
                                            }
    								    
                                        
                                        
                                            var extra_property = device.findProperty('brightness');
        								    if (extra_property){
                                                if(typeof this.persistent_data.virtual_brightness_alternatives[device_id] == 'undefined'){
                                                    this.persistent_data.virtual_brightness_alternatives[device_id] = {'value':0,'direction':direction};
                                                
                                                }
                                                else{
                                                    this.persistent_data.virtual_brightness_alternatives[device_id]['direction'] = direction;
                                                    if( isNaN(this.persistent_data.virtual_brightness_alternatives[device_id]['value'] ) ){
                                                        console.log("warning, virtual brightness value became NaN somehow");
                                                        this.persistent_data.virtual_brightness_alternatives[device_id]['value'] = 0;
                                                    }
                                                }
                                                if (this.config.debug) {
                                                    console.log("(extra) brightness property existed. Updating it through alternative. this.persistent_data.virtual_brightness_alternatives[device_id] gave: " + JSON.stringify(this.persistent_data.virtual_brightness_alternatives[device_id]));
                                                    console.log("extra_property.value = " + extra_property.value);
                                                }
                                            
                                                if (this.config.debug) {
                                                    console.log("at the end, this.persistent_data.virtual_brightness_alternatives: " + JSON.stringify(this.persistent_data.virtual_brightness_alternatives));
                                                }
                                        
                                            }
                                    
        								}
                                        else if( msg[key].toLowerCase() == "toggle" || msg[key].toLowerCase() == "brightness_stop"){
                                            if (this.config.debug) {
                                                console.log("Toggle or brightness_stop detected. Setting virtual brightness direction to none");
                                            }
                                            this.persistent_data.virtual_brightness_alternatives[device_id]['direction'] = "none";
                                            this.save_persistent_data();
                                        }
                                    }
                                
                                }
                                else{
                                    if (this.config.debug) {
                                        console.log("not using virtual brightness alternative");
                                    }
                                }
                            
    						}
                        
    					} catch (error) {
    						console.log("Error while handling action data for custom properties: " + error);
    					}




                        //
                        //  CHECK IF BRIGHTNESS ALTERNATIVE SHOULD BE USED
                        //
                    

                        try{
                        
                            // If we're handling the brightness property, swap the intended 0-255 value with our 0 - 100 value.
                            if(this.config.virtual_brightness_alternative && key == "brightness"){
                                if(typeof this.persistent_data.virtual_brightness_alternatives[device_id] != 'undefined'){
                                    if (this.config.debug) {
                                        console.log("this device is mentioned in the list of brightness alternatives");
                                        console.log(this.persistent_data.virtual_brightness_alternatives[device_id]);
                                    }
                                
                                    if( this.persistent_data.virtual_brightness_alternatives[device_id]['direction'] == 'up' && this.persistent_data.virtual_brightness_alternatives[device_id]['value'] <= 99 ){
    									if (this.config.debug) {
                                            console.log("brightness going up...");
                                        }
                                        //extra_property.setCachedValue(extra_fromMqtt(current_value + 20));
                                        this.persistent_data.virtual_brightness_alternatives[device_id]['value'] += this.config.virtual_brightness_alternative_speed;
                                        if(this.persistent_data.virtual_brightness_alternatives[device_id]['value'] > 100){this.persistent_data.virtual_brightness_alternatives[device_id]['value'] = 100;}
                                        this.save_persistent_data();

                                    }
                                    else if( this.persistent_data.virtual_brightness_alternatives[device_id]['direction'] == 'down' && this.persistent_data.virtual_brightness_alternatives[device_id]['value'] >= 1 ){
                                        if (this.config.debug) {
                                            console.log("brightness going down...");
                                        }
                                        this.persistent_data.virtual_brightness_alternatives[device_id]['value'] -= this.config.virtual_brightness_alternative_speed;
                                        if(this.persistent_data.virtual_brightness_alternatives[device_id]['value'] < 0){this.persistent_data.virtual_brightness_alternatives[device_id]['value'] = 0;}

                                        this.save_persistent_data();
                                    }
                                    else{
                                        if (this.config.debug) {
                                            console.log("virtual brightness: probably scrolled brightness to value below or above allowed level (0-100). Or simply no change..");
                                        }
                                    }
                            
                                    msg['brightness'] = this.persistent_data.virtual_brightness_alternatives[device_id]['value']; // overwrite the brightness value with the new one

                                }
                                
                            }
                    
    				    } catch (error) {
    					    console.log("Error while checking if brightness alternative should be used: " + error);
    				    }
                        
                        
                        // Setting the values in the Webthings Gateway
                        try{
                            if( typeof msg[key] == 'string' && property.readOnly == true){
                                if( msg[key].indexOf("_") != -1 ){
                					if (this.config.debug) {
                						console.log("replacing lower dashes in string with spaces");
                					}
                                    msg[key] = msg[key].replace(/_/g, " ");
                                }
                            }
                        
        					if (this.config.debug) {
        						console.log(key + " -> " + msg[key]);
                            }
                            
                            property.setCachedValue(msg[key]);
        					device.notifyPropertyChanged(property);
                            
                            try{
                                // save updated value to devices_overview in case it has to be regenerated at init next time. this.handle_persistent_data cannot be used here, as we don't know enough about the data, so we go around and update the value only.
                                if(typeof this.persistent_data.devices_overview[device_id] != 'undefined'){
                                    if(typeof this.persistent_data.devices_overview[device_id]['appendages'] != 'undefined'){
                                        if(typeof this.persistent_data.devices_overview[device_id]['appendages'][key] != 'undefined'){
                                            //console.log("updating the value of an appendage in the devices overview: " + key);
                                            if(this.config.virtual_brightness_alternative && key == "brightness" && typeof this.persistent_data.virtual_brightness_alternatives[device_id] !='undefined'){
                                                //console.log("saving virtual brightness value to devices overview");
                                                this.persistent_data.devices_overview[device_id]['appendages'][key]['value'] = this.persistent_data.virtual_brightness_alternatives[device_id]['value']; // This is a litle silly, copying between two dictionaries, but it keeps things separeted well.
                                            }
                                            else{
                                                //console.log("saving normal value to devices overview");
                                                this.persistent_data.devices_overview[device_id]['appendages'][key]['value'] = msg[key]; //fromMqtt(msg[key]);
                                            }
                                        
                                        }
                                    }
                                }
                                else{
                                    console.log("Note: device_id was not yet in devices_overview at end of incoming message");
                                }
                            }
                            catch(e){
                                console.log("Error while trying to save updated appendage values in devices_overview:",e);
                            }
                        
                        
                    
    				    } catch (error) {
    					    console.log("Error while checking if brightness alternative should be used: " + error);
    				    }

    				} // end of looping over all the keys in the incoming data message


                    // Recognize that the device is connected (since we just received a message from it)
        			this.devices[device_id].connected = true;
        			device.connectedNotify(true);

               

    			} catch (error) {
    				console.log("Zigbee2MQWTT adonL: Error parsing incoming message: " + error);
    			}
    		}


    		// Handle incoming network map data
    		else if (topic.endsWith('/bridge/response/networkmap')) {
    			this.apiHandler.map = msg['data']['value']; //'digraph G { "Welcome" -> "To" "To" -> "Privacy" "To" -> "ZIGBEE!"}';
    			this.waiting_for_map = false;
    		}


    		// Handle OTA firmware update message
            // example when a firmware update is complete: {"data":{"from":{"date_code":"20181203","software_build_id":"2.1.022"},"id":"0xec1bbdfffeXXXXXX","to":{"date_code":"20181203","software_build_id":"2.3.086"}},"status":"ok"}
            // example when a firmware update fails: {"data":{"id":"0xec1bbdfffeXXXXXX"},"error":"Update of '0xec1bbdfffeXXXXXX' failed (Device didn't respond to OTA request)","status":"error"}'
    		else if (topic.endsWith('/bridge/response/device/ota_update/update')) {
                if (this.config.debug) {
                    console.log("PARSING OTA UPDATE MESSAGE:", msg);
                }
                try{
        			if (msg['status'] == 'ok') {
        				if (msg['data']['from']['software_build_id'] != msg['data']['to']['software_build_id']) {
        					const device_id = 'z2m-' + msg['data']['id'];
        					this.persistent_data.devices_overview[device_id]['update_available'] = false;
                            this.persistent_data.devices_overview[device_id]['update_progress'] = 0;
        					//this.update_result = 'ok';
        				} 
                        else {
                            // firmware version before and after was the same, so the update must have failed
        					//this.update_result = 'failed';
        				}
        			}
                    this.update_result = msg;
        			this.updating_firmware = false;
                }
                catch(e){
                    console.log("error while parsing firmware update result");
                }
			
    		}
        
            // TODO: manual update check is not implemented yet
            else if (topic.endsWith('/bridge/response/device/ota_update/check')) {
                if (this.config.debug) {
                    console.log("PARSING OTA CHECK MESSAGE:", msg);
                }
            }
		}
        catch(e){
            console.log("general error while handling incoming message from MQTT: ", e);
        }
	}



	publishMessage(topic, msg) {
        if(topic.startsWith('z2m-')){
            topic = topic.replace('z2m-','');
        }

		if (this.config.debug) {
			console.log('Publising message: ' + JSON.stringify(msg) + ' to topic: ' + topic);
		}
		this.client.publish(`${this.config.prefix}/${topic}`, JSON.stringify(msg));
	}



	addDevice(info) {
		if (this.config.debug) {
			console.log('in addDevice');
			//console.log(info);
        }
		try {

			if (info.hasOwnProperty('model_id') && !this.persistent_data.devices_overview.hasOwnProperty('z2m-' + info.ieee_address)) {
				this.persistent_data.devices_overview['z2m-' + info.ieee_address] = { // This data is eventually sent to the UI
					'zigbee_id': info.ieee_address,
					'update': {'state':'idle'},
					'model_id': info.model_id,
					'description': info.definition.description,
					'software_build_id': info.software_build_id,
					'vendor': info.definition.vendor,
                    'power_source': info.power_source,
                    'type': info.type
				};
			}
        }
        catch(e){console.log("Error: could not create initial entry in devices_overview: " + e);}


        try{
			var existingDevice = this.getDevice('z2m-' + info.ieee_address);
			if (existingDevice && existingDevice.modelId === info.model_id) {
				if (this.config.debug) {
					console.info(`Device z2m-${info.ieee_address} already exists`);
					//this.try_getting_state(info.ieee_address);
				}
				return;
			}
            
            
            var deviceDefinition;
            
            if(this.config.use_old_devices_description){
                console.log("using a combination of device descriptions from devices.js and, if the device is not in that list, use Exposes data as the source instead.");
    			deviceDefinition = Devices[info.model_id];

    			if (!deviceDefinition) {
    				var detectedDevice = this.exposesDeviceGenerator.generateDevice(info, info.ieee_address, info.model_id);
    				if (detectedDevice) {
    					deviceDefinition = detectedDevice;
    					if (this.config.debug) {
    						console.info(`Device z2m-${info.ieee_address} created from Exposes API`);
    					}
    				}
    			}
                else {
    				if (this.config.debug) {
    					console.info(`Device z2m-${info.ieee_address} created from devices.js`);
    				}
    			}
            }
            else{
                deviceDefinition = this.exposesDeviceGenerator.generateDevice(info, info.ieee_address, info.model_id);
                //console.log("deviceDefinition from exposes: ", deviceDefinition);
                if (!deviceDefinition) {
                    deviceDefinition = Devices[info.model_id];
                }
            }

			if (deviceDefinition) {
				var device = new MqttDevice(this, 'z2m-' + info.ieee_address, info.model_id, deviceDefinition);
				
                //const zigbee_id = info.ieee_address;
				if (deviceDefinition.properties.state) { // If the device has a state property, then initially set it to disconnected.
                    //console.log("addDevice: spotted state in properties");
					device.connectedNotify(false);
					//let timerId = setTimeout(() => this.try_getting_state(info.ieee_address), 11000); // 11 seconds after creating the device, an extra /get will be used to try and get the actual state
				}
                else{
                    device.connectedNotify(true);
                }

                // Regenerate other appendages too
                if (this.config.debug) {
                    console.log("at end of addDevice, will call attempt_regen to add any appendage properties that were discovered later");
                }
                //this.attempt_regen('z2m-' + info.ieee_address);
                device = this.attempt_regen(device, 'z2m-' + info.ieee_address); // device and device_id

                // Add data transmission property
                if (this.config.debug) {
                    console.log("adding data transmission property to new device (only if data_transmission doesn't exist yet)");
                }
                //this.attempt_new_property(info.ieee_address, "data_transmission", true, false); // device name, property name, value (true) and readOnly (false)
                
                device = this.attempt_new_property(device, "data_transmission", true, false, false); // initial value, not read-only, no percentage
                
                if (this.config.debug) {
                    console.log("calling handleDeviceAdded");
                }
                this.handleDeviceAdded(device);
			}
            else{
                console.log('Error: could not create device using exposesDeviceGenerator');
            }

		} catch (error) {
			console.log("Later error in addDevice: " + error);
		}
        
		try {
			if (this.config.debug) {
				console.log("subscribing to: " + this.config.prefix + "/" + info.ieee_address);
			}
			this.client.subscribe(`${this.config.prefix}/${info.ieee_address}`);
			this.client.subscribe(`${this.config.prefix}/${info.ieee_address}/availability`);
			//this.client.subscribe(this.config.prefix + "/" + info.ieee_address);

		} catch (error) {
			console.log("Early when trying to subscribe to MQTT in addDevice: " + error);
		}

	}


	// Sometimes incoming data has values that are not reflected in existing properties yet.
	// In those cases, this will attempt to add the missing properties.
	attempt_new_property(device, property_name, value, read_only = true, percentage = false) {
        /*
        var device_id = zigbee_id;
        if(!device_id.startsWith("z2m-")){
            console.log("attempt_new_property: adding z2m- to device id");
            device_id = 'z2m-' + device_id;
        }
        */
        if (this.config.debug) {
            console.log("in attempt_new_property for property_name (name): " + property_name);
        }
        
        
        if(property_name == 'xy' || property_name == 'x' || property_name == 'y' || property_name == 'Action group' || property_name == 'Action rate'){
            if (this.config.debug) {
                console.log("attempt_new_property: skipping property: " + property_name);
            }
            return device
        }
        
        //console.log("device in attempt_new_property: ", device);
        
		try{
            //var device = this.getDevice(device_id);
            if(device){
                
                if (this.config.debug) {
        			//console.log("in attempt_new_property for device: " + device_id + " and property_name: " + property_name);
        			console.log("attempt value: " + value);
                    console.log("initial device @type:", device['@type']);
        		}

                if (this.config.debug) {
                    console.log("attempt_new_property: checking is property already exists in device: " + property_name);
                }
                var property = device.findProperty(property_name);
                
                if(!property){
                    if (this.config.debug) {
                        console.log("attempt_new_property: the property DID NOT exist yet: " + property_name);
                    }
                    
            		var type = "string";
            		if (Number.isFinite(value)) {
            			type = "number";
            		}
                    else if (typeof value === 'boolean') {
            			type = "boolean";
            		}
                    if (this.config.debug) {
                        console.log("attempt value type: ", type);
                    }

            		var desc = {
                        'name': property_name,
            			'title': this.applySentenceCase(property_name),
            			'description': this.applySentenceCase(property_name),
            			'readOnly': read_only,
            			'type': type,
                        'value': value
            		};
            
                    if(type == "number"){
                        
                        if(percentage == true){
                            desc['type'] = 'integer';
                            desc['min'] = 0;
                            desc['max'] = 100;
                            desc['multipleOf'] = 1;
                            desc['unit'] = 'percent';
                        }
                        
                        if(read_only){
                            if(device['@type'].indexOf('MultiLevelSensor') == -1){
                                device['@type'].push('MultiLevelSensor');
                                desc['@type'] = 'LevelProperty';
                            }

                        }
                    }
                    
                    
                    
            		const property = new MqttProperty(device, property_name, desc);
            		device.properties.set(property_name, property);
            		if (this.config.debug) {
            			console.log("new property should now be generated");
            		}
                    
                    // Save the values in persistent data, if they don't already exist there.
                    const zigbee_id = device.id.replace('z2m-','');
                    this.handle_persistent_value(zigbee_id,property_name,value,read_only,percentage);
                    
                }
                else{
                    if (this.config.debug) {
                        console.log("attempt_new_property: the property already existed: " + property_name);
                    }
                }
                

                
            }
            

		}
        catch (error){
            console.log("Error in attempt_new_property: " + error);
        }
        
        return device;

	}


    // Gets the persistent value, and if those don't exist, it sets the provided values as the initial persistent value
    handle_persistent_value(zigbee_id, property_name, value=0, read_only=true, percentage=false){
        //console.log("in handlePersistentValue for property: " + property_name);
        try{
            if(typeof this.persistent_data.devices_overview['z2m-' + zigbee_id] != 'undefined'){
                if(typeof this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'] != 'undefined'){
                    //console.log("- existing appendages data: ", this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages']);
                    if(typeof this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name] != 'undefined'){
                        if(typeof this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name]['value'] != 'undefined'){
                            //console.log("handle_persistent_value is returning this value from the devices_overview: ", this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name]['value']);
                            return this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name]['value'];
                        }
                    }
                    else{
                        console.log("property name was not present in appendages dictionary? Appendages: ", this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages']);
                    }
                }
            }
        }
        catch(e){
            console.log("ExposesDeviceGenerator: error in getPersistentValue: ", e);
        }
        
        try{
            if(typeof this.persistent_data.devices_overview['z2m-' + zigbee_id] == 'undefined'){
                //console.log("appendage property was not yet present in devices_overview. Adding it now.");
                this.persistent_data.devices_overview['z2m-' + zigbee_id] = {'appendages':{}, 'zigbee_id':zigbee_id, 'update':{'state':'idle'}}
            }
            if(typeof this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'] == 'undefined'){
                //console.log("appendage property was present but had no appendages dictionary. Adding it now.");
                this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'] = {};
            }
        
            //console.log("initial appendages value was missing in devices_overview, so creating it now. Value: " + value);
            this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name] = {};
            this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name]['value'] = value;
            this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name]['read_only'] = read_only;
            this.persistent_data.devices_overview['z2m-' + zigbee_id]['appendages'][property_name]['percentage'] = percentage;
            this.save_persistent_data();
        }
        catch(e){
            console.log("Error in handle_persistent_value while creating initial persistent data in devices_overview: ", e);
        }
        
        return value;
    }



    attempt_regen(device, device_id){
        if (this.config.debug) {
            console.log("in attempt_regen with device_id: " + device_id);
            //console.log("device in attempt_regen: ", device.properties);
        }
		try{
            if(typeof this.persistent_data.devices_overview[device_id] != 'undefined'){
                if(typeof this.persistent_data.devices_overview[device_id]['appendages'] != 'undefined'){
                    if (this.config.debug) {
                        console.log("regen: device existed in devices overview and has appendages data");
                    }
                    for (const property_name in this.persistent_data.devices_overview[device_id]['appendages']) {
                        try{
                            if (this.persistent_data.devices_overview[device_id]['appendages'].hasOwnProperty(property_name)) {
                                
                                const property = device.findProperty(property_name);
                                if(property){
                                    if (this.config.debug) {
                                        console.log("attempt regen is skipping, because it already found the property in device: " + property_name);
                                    }
                                }
                                else{
                                    if (this.config.debug) {
                                        console.log("attempt regen DID NOT find property in device: " + property_name);
                                    }
                                    const prop = this.persistent_data.devices_overview[device_id]['appendages'][property_name];
                                    if (this.config.debug) {
                                        console.log("regen: parsing appendages property: ", property_name);
                                        console.log("regen: parsing appendages property values: ", prop);
                                    }
                                    device = this.attempt_new_property(device, property_name, prop.value, prop.read_only, prop.percentage);
                                    //console.log("property should be regenerated");
                                }
                                
                                
                            }
                        }
                        catch(e){console.log("Error in appendages regen loop:", e)}
                    }
                }
            }
		}
        catch (error){
            console.log("Error in regeneration of appendages: " + error);
        }
        
        return device;
    }
    
    
    
    
	removeDevice(deviceId) {
        try{
    		if (this.config.debug) {
    			console.log("Removing device: " + deviceId);
    		}
    		return new Promise((resolve, reject) => {
    			const device = this.devices[deviceId]; // a.k.a. friendly_name
    			if (device) {
    				try {
                        if(deviceId.startsWith('z2m-')){
                            const zigbee_id = deviceId.replace('z2m-','');
                            console.log("Telling Z2M to remove: " + zigbee_id);
                            //this.client.publish(`${this.config.prefix}/bridge/request/device/remove`, zigbee_id);
                            this.client.publish(`${this.config.prefix}/bridge/request/device/remove`, '{"id": "' + zigbee_id + '","force":true}');
                        }
    				
                        // Delete it from persistent data
                        if(typeof this.persistent_data.devices_overview[deviceId] != 'undefined'){
                            if (this.config.debug) {
                                console.log("removing device from persistent data");
                            }
                            delete this.persistent_data.devices_overview[deviceId];
                        }
                    
                        if(typeof this.persistent_data.virtual_brightness_alternatives[deviceId] != 'undefined'){
                            if (this.config.debug) {
                                console.log("removing device from virtual brightness alternatives list.");
                            }
                            delete this.persistent_data.virtual_brightness_alternatives[deviceId];
                        }
                    
                        this.save_persistent_data();
                    
                        // Also remove it from the Gateway
                        this.handleDeviceRemoved(device);
        				resolve(device);
                    
    				} catch (error) {
    					console.log("Error removing device from Z2M network: ", error);
    				}

    			}
                else {
    				reject(`Device: ${deviceId} not found, so could not be removed.`);
    			}
    		});
        }
        catch(e){console.log("Error in removeDevice: ", e);}
		
	}



	startPairing(_timeoutSeconds) {
		if (this.config.debug) {
			console.log('in startPairing');
		}
        if(typeof this.client != 'undefined'){
    		this.client.publish(`${this.config.prefix}/bridge/request/permit_join`, '{"value": true}');

    		this.client.publish(`${this.config.prefix}/bridge/config/devices/get`);

    		setTimeout(this.stopPairingCheck.bind(this), 130000); // pairing gets two minutes.
    		//setTimeout(function(){this.stopPairingCheck();},130000); // pairing gets two minutes.
    		this.last_pairing_start_time = Date.now();
        }
		

	}


	stopPairingCheck() {
        if(typeof this.client != 'undefined'){
            this.client.publish(`${this.config.prefix}/bridge/config/devices/get`);
    		if (this.last_pairing_start_time + 120000 < Date.now()) { // check if two minutes have passed since a pairing start was called
    			if (this.config.debug) {
    				console.log("setting permitJoin back to off");
    			}
    			this.client.publish(`${this.config.prefix}/bridge/request/permit_join`, '{"value": false}'); // set permitJoin back to off
    		}
            else {
    			if (this.config.debug) {
    				console.log("not setting permitJoin back to off yet, something caused a time extension");
    			}
                setTimeout(this.stopPairingCheck.bind(this), 130000);
    		}
        }
	}


	cancelPairing() {
		if (this.config.debug) {
			console.log('in cancelPairing (but this is not used)');
		}
		//this.client.publish(`${this.config.prefix}/bridge/request/permit_join`,'{"value": false}'); // The Webthings Gateway timeout is too quick for some Zigbee devices
	}



	async unload() {
        this.z2m_started = false;
		if (this.config.debug) {
			console.log("in unload");
		}
        this.client.end(); // stop MQTT 
        this.save_persistent_data();
		await this.stop_zigbee2mqtt();
		/*
        if (this.config.debug) {
			console.log("doing a pkill of zigbee2mqtt just in case");
		}
        
		if (this.config.local_zigbee2mqtt == true) {
			// Make sure previous instances of Zigbee2mqtt are gone
			try {
				//execSync("pgrep -f 'zigbee2mqtt-adapter/zigbee2mqtt/index.js' | xargs kill -9");
				execSync("pkill 'zigbee2mqtt-adapter/zigbee2mqtt/index.js'");
				console.log("pkill done");
			} catch (error) {
				console.log("exec pkill error: " + error);
			}
		}
        */

		console.log("zigbee2mqtt should now be stopped. Goodbye.");
		return super.unload();
	}



	applySentenceCase(title) {
		//console.log("Capitalising");
		if (title.toLowerCase() == "linkquality") {
			return "Link quality";
		}
		else if (title.toLowerCase() == "data_transmission") { // Back when Candle focusesd on MySensors devices, the actual datatransmission of the devices could be turned off. That's why the property is still called this.
			return "Data collection";
		}
		title = title.replace(/_/g, ' ');
		if (typeof title == "undefined") {
			title = "Unknown";
		}
		//console.log(title);
		return title.charAt(0).toUpperCase() + title.substr(1).toLowerCase();

	}
    
    
    // save persistent data to file
    save_persistent_data(){
        console.log("in save_persistent_data");
        try{
            fs.writeFile( this.persistent_data_file_path, JSON.stringify( this.persistent_data, null, 2), "utf8", function(err, result) {
                if(err) console.log('file write error while saving persistent data: ', err);
            });
        }
        catch(e){
            console.log("error saving persistent data: ", e);
        }
    }
}


class MqttDevice extends Device {
	constructor(adapter, id, modelId, description) {
		super(adapter, id);
		this.name = description.name;
		this['@type'] = description['@type'];
		this.modelId = modelId;
		this.connected = false;
        
		for (const [name, desc] of Object.entries(description.actions || {})) {
            //console.log('in MqttDevice init, importing action: ' + name);
			this.addAction(name, desc);
		}
		for (const [name, desc] of Object.entries(description.properties || {})) {
            //console.log('in MqttDevice init, importing property: ' + name);
			const property = new MqttProperty(this, name, desc);
			this.properties.set(name, property);
		}
		for (const [name, desc] of Object.entries(description.events || {})) {
			this.addEvent(name, desc);
		}
	}

	async performAction(action) {
        //console.log("received action: ", action);
        /*
        console.log("this.id = " + this.id);
        //action.name = action.name.replace(/\-action/, '');
        var prop_to_change = action.name.replace(/\-unlock/, '');
        prop_to_change = action.name.replace(/\-lock/, '');
        console.log("action prop_to_change = " + prop_to_change);
        */
		action.start();
		this.adapter.publishMessage(`${this.id}/set`, {
			[action.property]: action.input,
		});
		action.finish();
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
		if (this.device.adapter.config.debug) {
			console.log("in setValue of property '" + this.name + "', where value = " + value + " and this.options: ");
			console.log("- this.options: " + this.options);
		}

		return new Promise((resolve, reject) => {
			super
				.setValue(value)
				.then((updatedValue) => {
					const {
						toMqtt = identity
					} = this.options;

					if (typeof this.options["type"] == "string" && this.options["title"] == "Color") { // https://github.com/EirikBirkeland/hex-to-xy
						if (this.device.adapter.config.debug) {
                            console.log("color to set: " + updatedValue);
                        }
                        if(!updatedValue.startsWith('#')){
                            updatedValue = colourNameToHex(updatedValue);
                            console.log("color name has been changed to: " + updatedValue);
                        }
                        //if(this.device.adapter.config.debug){
						//	console.log("translating HEX color to XY (cie color space)");
						//}
						//var cie_colors = HEXtoXY(updatedValue);
						//const x = cie_colors[0];
						//const y = cie_colors[1];
						//updatedValue = {"x":x, "y":y};
						updatedValue = {
							"hex": updatedValue // turns out that Zigbee2MQTT can handle HEX values as input
						};
						if (this.device.adapter.config.debug) {
							console.log("color value set to: " + updatedValue);
						}
					}

					if (typeof this.options["origin"] == "string") {
						if (this.options["origin"] == "exposes-scaled-percentage") {
							updatedValue = percentage_to_integer(updatedValue, this.options["origin_maximum"]);
							if (this.device.adapter.config.debug) {
								console.log("- exposes-scaled-percentage -> updatedValue scaled back to: " + updatedValue);
							}
						}
					}

                    

                    // Publish to Zigbee network
                    if(this.name != "data_transmission"){ // all properties except the data_transmission property
                        if (this.device.adapter.config.debug) {
                            console.log("sending '" + updatedValue + "' to Z2M via toMqtt:", {[this.options.property]: toMqtt(updatedValue),});
                        }
                        //if(this.device.adapter.config.virtual_brightness_alternative && this.name == "brightness"){
                        //    console.log("not sending manipulated brightness value back to Zigbee device");
                        //}
                        //else{
        					this.device.adapter.publishMessage(`${this.device.id}/set`, {
        						[this.options.property]: toMqtt(updatedValue),
        					});
                        //}
                    }
                    else{
                        if (this.device.adapter.config.debug) {
                            console.log("not sending value of data_transmission property to zigbee network");
                        }
                    }
                    
                    this.device.notifyPropertyChanged(this);
                    
					resolve(updatedValue);
					
				})
				.catch((err) => {
                    console.log("Error in set_value of property; ", err);
					reject(err);
				});
		});
	}

}






function loadAdapter(addonManager, manifest, _errorCallback) {
	new ZigbeeMqttAdapter(addonManager, manifest);
}


function integer_to_percentage(byte, maximum) {
	const factor = maximum / 100;
	const percentage = Math.floor(byte / factor);
	return percentage;
}


function percentage_to_integer(percentage, maximum) {
	const factor = maximum / 100;
	var byte = Math.floor(percentage * factor);
	if (byte > maximum) {
		console.log("percentage_to_integer overflowed");
		byte = maximum;
	}
	return byte;
}


function HEXtoXY(hex) { // thanks to https://stackoverflow.com/questions/20283401/php-how-to-convert-rgb-color-to-cie-1931-color-specification
	hex = hex.replace(/^#/, '');
	const aRgbHex = hex.match(/.{1,2}/g);
	var red = parseInt(aRgbHex[0], 16);
	var green = parseInt(aRgbHex[1], 16);
	var blue = parseInt(aRgbHex[2], 16);

	red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
	green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
	blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);
	var X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
	var Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
	var Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;
	var fx = X / (X + Y + Z);
	var fy = Y / (X + Y + Z);

	return [fx.toPrecision(2), fy.toPrecision(2)];
}


function XYtoHEX(x, y, bri) { // and needs brightness too
	const z = 1.0 - x - y;
	if (x == 0) {
		x = 0.00001
	};
	if (y == 0) {
		y = 0.00001
	};
	if (bri == 0) {
		bri = 1
	};
	const Y = bri / 255.0; // Brightness of lamp
	const X = (Y / y) * x;
	const Z = (Y / y) * z;
	var r = X * 1.612 - Y * 0.203 - Z * 0.302;
	var g = -X * 0.509 + Y * 1.412 + Z * 0.066;
	var b = X * 0.026 - Y * 0.072 + Z * 0.962;

	r = r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, (1.0 / 2.4)) - 0.055;
	g = g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, (1.0 / 2.4)) - 0.055;
	b = b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, (1.0 / 2.4)) - 0.055;

	const maxValue = Math.max(r, g, b);
	r /= maxValue;
	g /= maxValue;
	b /= maxValue;
	r = r * 255;
	if (r < 0) {
		r = 0
	};
	if (r > 255) {
		r = 255
	};
	g = g * 255;
	if (g < 0) {
		g = 0
	};
	if (g > 255) {
		g = 255
	};
	b = b * 255;
	if (b < 0) {
		b = 0
	};
	if (b > 255) {
		b = 255
	};

	r = Math.floor(r).toString(16);
	g = Math.floor(g).toString(16);
	b = Math.floor(b).toString(16);

	if (r.length < 2)
		r = "0" + r;
	if (g.length < 2)
		g = "0" + g;
	if (b.length < 2)
		b = "0" + b;

	return "#" + r + g + b;
}


function colourNameToHex(colour)
{
    var colours = {"alice blue":"#f0f8ff","antique white":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanched almond":"#ffebcd","blue":"#0000ff","blue violet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadet blue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflower blue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "dark blue":"#00008b","darkcyan":"#008b8b","dark golden rod":"#b8860b","darkgray":"#a9a9a9","dark green":"#006400","darkkhaki":"#bdb76b","dark magenta":"#8b008b","dark olive green":"#556b2f",
    "dark orange":"#ff8c00","dark orchid":"#9932cc","dark red":"#8b0000","dark salmon":"#e9967a","dark sea green":"#8fbc8f","dark slate blue":"#483d8b","dark slate gray":"#2f4f4f","dark turquoise":"#00ced1",
    "dark violet":"#9400d3","deep pink":"#ff1493","deep sky blue":"#00bfff","dim gray":"#696969","dodger blue":"#1e90ff",
    "firebrick":"#b22222","floral white":"#fffaf0","forest green":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","golden rod":"#daa520","gray":"#808080","green":"#008000","green yellow":"#adff2f",
    "honeydew":"#f0fff0","hot pink":"#ff69b4",
    "indian red ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
    "lavender":"#e6e6fa","lavender blush":"#fff0f5","lawn green":"#7cfc00","lemon chiffon":"#fffacd","light blue":"#add8e6","light coral":"#f08080","light cyan":"#e0ffff","light goldenrod yellow":"#fafad2",
    "light grey":"#d3d3d3","light green":"#90ee90","light pink":"#ffb6c1","light salmon":"#ffa07a","light sea green":"#20b2aa","light sky blue":"#87cefa","light slate gray":"#778899","light steel blue":"#b0c4de",
    "light yellow":"#ffffe0","lime":"#00ff00","lime green":"#32cd32","linen":"#faf0e6",
    "magenta":"#ff00ff","maroon":"#800000","medium aquamarine":"#66cdaa","medium blue":"#0000cd","medium orchid":"#ba55d3","medium purple":"#9370d8","medium sea green":"#3cb371","medium slate blue":"#7b68ee",
    "medium spring green":"#00fa9a","mediumturquoise":"#48d1cc","medium violet red":"#c71585","midnight blue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
    "navajo white":"#ffdead","navy":"#000080",
    "oldlace":"#fdf5e6","olive":"#808000","olive drab":"#6b8e23","orange":"#ffa500","orange red":"#ff4500","orchid":"#da70d6",
    "pale golden rod":"#eee8aa","pale green":"#98fb98","pale turquoise":"#afeeee","pale violet red":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powder blue":"#b0e0e6","purple":"#800080",
    "rebecca purple":"#663399","red":"#ff0000","rosy brown":"#bc8f8f","royal blue":"#4169e1",
    "saddlebrown":"#8b4513","salmon":"#fa8072","sandy brown":"#f4a460","sea green":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","sky blue":"#87ceeb","slate blue":"#6a5acd","slategray":"#708090","snow":"#fffafa","spring green":"#00ff7f","steel blue":"#4682b4",
    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
    "violet":"#ee82ee",
    "wheat":"#f5deb3","white":"#ffffff","white smoke":"#f5f5f5",
    "yellow":"#ffff00","yellow green":"#9acd32"};

    if (typeof colours[colour.toLowerCase()] != 'undefined')
        return colours[colour.toLowerCase()];

    return "#ffffff";
}


function rand_hex(n) {
    if (n <= 0) {
        return '';
    }
    var rs = '';
    try {
        rs = crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0,n);
        /* note: could do this non-blocking, but still might fail */
    }
    catch(ex) {
        /* known exception cause: depletion of entropy info for randomBytes */
        console.error('Exception generating random string: ' + ex);
        /* weaker random fallback */
        rs = '';
        var r = n % 8, q = (n-r)/8, i;
        for(i = 0; i < q; i++) {
            rs += Math.random().toString(16).slice(2);
        }
        if(r > 0){
            rs += Math.random().toString(16).slice(2,i);
        }
    }
    return "0x" + rs;
}


function generate_security_key(){
    // e.g. [7, 3, 5, 7, 9, 11, 13, 15, 0, 2, 4, 6, 8, 11, 12, 13]
    try{
        const secret = Array.from({length: 16}, () => crypto.randomInt(255));
        return secret;
    }
    catch(e){
        console.log("Error while generating cryptographic Zigbee security key: " + e);
        console.log("Fallback: generating a less secure key.");
        const secret = Array.from({length: 16}, () => Math.floor(Math.random() * 255));
        return secret;
    }
    
    
}

//module.exports = loadAdapter, MqttDevice, MqttProperty;
module.exports = loadAdapter;
