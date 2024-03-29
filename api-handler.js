'use strict';

const fs = require('fs');

const {
	APIHandler,
	APIResponse
} = require('gateway-addon');

const {
	spawn,
	exec,
	execSync,

} = require('child_process');

const manifest = require('./manifest.json');

class Zigbee2MQTTHandler extends APIHandler {
	constructor(addonManager, adapter, config) {
		super(addonManager, manifest.id);
		addonManager.addAPIHandler(this);

		this.adapter = adapter;
		this.config = config;
		this.map = "";
		this.time_delay = 1000 * 60 * 3; //time between map requests
		this.update_reset_time_delay = 1000 * 60 * 15; // 15 minutes
		this.last_map_request_time = Date.now() - this.time_delay; // pretend last map request time was 3 minutes ago
		this.last_update_request_time = 0;
	}

	async handleRequest(request) {
		if (this.config.debug) {
			console.log("* * * * * * * * * * * * API HANDLER REQUEST * * * * * * * * * * request.path: ", request.path);
			//console.log(request);
			//console.log("request.method = " + request.method);
			//console.log("request.path = " + request.path);
		}
		if (request.method !== 'POST') {
			return new APIResponse({
				status: 404
			});
		} else {
			if (request.path === '/ajax') {
				const action = request.body.action; //jsonParsed['action'];
				if (this.config.debug) {
					console.log("action = " + action);
				}

				if (action == "init") {

					// reset in case something went wrong, and enough time has passed
					if( this.last_update_request_time + this.update_reset_time_delay < Date.now() ){
						this.adapter.updating_firmware = false;
						this.adapter.update_result = {'status':'idle'};
					}

					var devices_as_list = [];
					try {
						for (const key in this.adapter.persistent_data.devices_overview) {
							if (this.adapter.persistent_data.devices_overview.hasOwnProperty(key)) {
								var device = this.adapter.persistent_data.devices_overview[key];
								//if (this.adapter.updating_firmware) {
								//	device['update_available'] = false;
								//}
								devices_as_list.push(device);
							}
						}
					} catch (error) {
						console.log(error);
					}
                    
                    // If the missing USB stick is not an issue, then pretend it was found to avoid a warning in the UI
                    var serial_port_value = this.adapter.config.serial_port;
                    if(this.adapter.config.local_zigbee2mqtt == false){
                        serial_port_value = "usb_stick_not_needed";
                    }


					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'ok',
							'devices': this.adapter.persistent_data.devices_overview,
                            'security': this.adapter.security,
                            'installed': this.adapter.z2m_installed_succesfully,
                            'started': this.adapter.z2m_state,
                            'updating_firmware': this.adapter.updating_firmware,
                            'update_result': this.adapter.update_result,
                            'debug': this.adapter.config.debug,
                            'serial': serial_port_value,
                            'usb_port_issue': this.adapter.usb_port_issue
						}),
					});

				} 
                
                
                else if (action == "update-map") {

					if (!this.adapter.waiting_for_map || this.last_map_request_time + this.time_delay < Date.now()) {
						if (this.config.debug) {
							console.log("map update allowed");
						}
						this.last_map_request_time = Date.now();
						this.adapter.waiting_for_map = true;
						//this.map = "";
						const update_topic = 'bridge/request/networkmap';
						//console.log("network map topic: " + update_topic);
						const update_message = {
							"type": "graphviz",
							"routes": false
						};
						//console.log("network map message: " + update_message);
						this.adapter.publishMessage(update_topic, update_message);
						return new APIResponse({
							status: 200,
							contentType: 'application/json',
							content: JSON.stringify({
								'status': 'A new network map has been requested. Please wait.'
							}),
						});
					} 
                    else {
						if (this.config.debug) {
							console.log("map update delayed");
						}
						this.map = 'digraph G { "Breathe in" -> "Breathe out" "Breathe out" -> "Relax"}';
						return new APIResponse({
							status: 200,
							contentType: 'application/json',
							content: JSON.stringify({
								'status': 'A new network map can only be requested once every 3 minutes.'
							}),
						});
					}


				}
                
                
                else if (action == "poll") {
                    
					var devices_as_list = [];
					try {
						for (const key in this.adapter.persistent_data.devices_overview) {
							if (this.adapter.persistent_data.devices_overview.hasOwnProperty(key)) {
								var device = this.adapter.persistent_data.devices_overview[key];
                                //if(device['update']['state'] == "updating"){
                                    
                                //}
								//if (this.adapter.updating_firmware) {
								//	device['update_available'] = false;
								//}
								devices_as_list.push(device);
							}
						}
					} catch (error) {
						console.log("Error in poll API handling: ", error);
					}
                    
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'Updating... please wait',
                            'devices':devices_as_list,
							'map': this.map,
							'updating_firmware': this.adapter.updating_firmware,
							'update_result': this.adapter.update_result,
                            'installed': this.adapter.z2m_installed_succesfully,
                            'started': this.adapter.z2m_state,
						}),
					});
				}
                
                
                else if (action == "health_check") {
                    
					const update_topic = 'bridge/request/health_check';
					//console.log("network map topic: " + update_topic);
					const update_message = {};
					//console.log("network map message: " + update_message);
					this.adapter.publishMessage(update_topic, update_message);
                    
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'Checking health',
						}),
					});
				} 
                
                
                else if (action == "save-security") {
					if (this.config.debug) {
						console.log("in save security, with pan_id:" + request.body.pan_id + " and network key:" + request.body.network_key);
					}
                    
                    if(typeof request.body.pan_id != 'undefined' && typeof request.body.network_key != 'undefined'){
                        
                        if(this.adapter.security.pan_id != request.body.pan_id){
                            this.adapter.security.pan_id = request.body.pan_id;
                            this.adapter.security.network_key = JSON.parse("[" + request.body.network_key + "]");
                            //console.log("this.adapter.security.network_key array: " + this.adapter.security.network_key);
                            
                            fs.writeFile( this.adapter.zigbee2mqtt_configuration_security_file_path, JSON.stringify( this.adapter.security ), "utf8" , (err, result) => {
                                if(err){
                                    console.log('save security: file write error:', err);
                					return new APIResponse({
                						status: 200,
                						contentType: 'application/json',
                						content: JSON.stringify({
                							'status': 'Error: security settings could not be saved.'
                						}),
                					});
                                }
                                else{
                                    console.log('Security file has been written');
                					return new APIResponse({
                						status: 200,
                						contentType: 'application/json',
                						content: JSON.stringify({
                							'status': 'Security settings were saved. If you changed them, you will need to restart the system for changes to take effect.'
                						}),
                					});
                                }
                            });
                            
                            fs.unlink( this.adapter.zigbee2mqtt_coordinator_backup_json_file_path ,function(err){
                                    if(err) return console.log(err);
                                    console.log('old backup coordinator file deleted successfully');
                            });
                            
        					return new APIResponse({
        						status: 200,
        						contentType: 'application/json',
        						content: JSON.stringify({
        							'status': 'New security values should be saved.'
        						}),
        					});
                        }
                        else{
                            console.log("seems to be the same pan_id that was already set.");
        					return new APIResponse({
        						status: 200,
        						contentType: 'application/json',
        						content: JSON.stringify({
        							'status': 'PAN_ID was the same as the one already set, so no changes were made.'
        						}),
        					});
                        }
                        
                        
                    }
                    else{
    					return new APIResponse({
    						status: 200,
    						contentType: 'application/json',
    						content: JSON.stringify({
    							'status': 'Error, no security values provided.'
    						}),
    					});
                    }

				} 
                
                
                else if (action == "re-install") {
					if (this.config.debug) {
						console.log("in re-install. Stopping and deleting Zigbee2MQTT now.");
					}
                    this.adapter.stop_zigbee2mqtt();
                    
                    /*
                    setTimeout(function () {
            			try {
                            
            				//execSync("pgrep -f 'zigbee2mqtt-adapter/zigbee2mqtt/index.js' | xargs kill -9");
            				execSync("pkill 'zigbee2mqtt-adapter/zigbee2mqtt/index.js'");
            				console.log("pkill done");
            			} catch (error) {
            				console.log("exec pkill error: " + error);
            			}
                    }, 1000)
                    */
                    
                    setTimeout(() => {
                        console.log("re-install: deleting Z2M");
						this.adapter.delete_z2m();
                        console.log("re-install: downloading Z2M");
						this.adapter.download_z2m(); // this also then starts zigbee2mqtt
                        /*
                        fs.rmdir(this.adapter.zigbee2mqtt_dir_path, { recursive: true }, (err) => {
                            if (err) {
                                console.log("ERROR, unable to delete the folder");
                            }

                            console.log(`${dir} is deleted!`);
                        });
                        */
                    
                    }, 10000);
                   
        			
                    /*
                    setTimeout(() => {
                        console.log("rebooting to re-install Zigbee2MQTT");
            			try {
            				//execSync("pgrep -f 'zigbee2mqtt-adapter/zigbee2mqtt/index.js' | xargs kill -9");
            				execSync("sudo reboot");
            			} catch (error) {
            				console.log("exec reboot error: " + error);
            			}
                    }, 60000)
                    */
                    
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'Re-install process has been started.'
						}),
					});
                    
                }
                
                
                else if (action == "check-updates") {
					if (this.config.debug) {
						console.log("API handler: in check-updates");
					}

					try {
						for (const key in this.adapter.persistent_data.devices_overview) {
							if (this.adapter.persistent_data.devices_overview.hasOwnProperty(key)) {
								var device = this.adapter.persistent_data.devices_overview[key];
                                console.log("update check look device: ", device);
								//if (this.adapter.updating_firmware) {
								//	device['update_available'] = false;
								//}

								//devices_as_list.push(device);
							}
						}
                    }
                    catch(e){
                        console.log("Error in manual update check: ",e);
                    }
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'Update check initiated.'
						}),
					});

                    /*
					if (this.adapter.updating_firmware == false) {
						this.adapter.updating_firmware = true;
						this.last_update_request_time = Date.now();
						this.adapter.update_result = 'waiting';zigbee2mqtt/bridge/request/device/ota_update/check
						const update_topic = 'bridge/request/device/ota_update/check';
						console.log("update device topic: " + update_topic);
						const update_message = {
							"id": request.body.zigbee_id
						};
						console.log("update device message: " + update_message);
						this.adapter.publishMessage(update_topic, update_message);
						return new APIResponse({
							status: 200,
							contentType: 'application/json',
							content: JSON.stringify({
								'status': 'Attempting an update of the device.'
							}),
						});
					} else {
						return new APIResponse({
							status: 200,
							contentType: 'application/json',
							content: JSON.stringify({
								'status': 'Sorry, an update is already in progress.'
							}),
						});
					}
                    */

				} 
                
                else if (action == "update-device") {
					if (this.config.debug) {
						console.log("API handler: in update device, with zigbee_id:" + request.body.zigbee_id);
					}

					if (this.adapter.updating_firmware == false) {
						this.adapter.updating_firmware = true;
						this.last_update_request_time = Date.now();
						this.adapter.update_result = {'status':'idle'};
						const update_topic = 'bridge/request/device/ota_update/update';
						console.log("update device topic: " + update_topic);
						const update_message = {
							"id": request.body.zigbee_id
						};
						console.log("update device message: " + update_message);
						this.adapter.publishMessage(update_topic, update_message);
						return new APIResponse({
							status: 200,
							contentType: 'application/json',
							content: JSON.stringify({
								'status': 'Attempting an update of the device.'
							}),
						});
					} else {
						return new APIResponse({
							status: 200,
							contentType: 'application/json',
							content: JSON.stringify({
								'status': 'error','error':'An update is already in progress.'
							}),
						});
					}

				} 
                
                
                else if (action == "delete") { // This feature is currently disabled. It allows a 'force delete' from the zigbee network
					if (this.config.debug) {
						console.log("in delete, with zigbee_id:" + request.body.zigbee_id);
					}
                    
                    /*
					const delete_topic = 'bridge/request/device/remove';
					//console.log("delete topic: " + delete_topic);
					const delete_message = {
						"id": request.body.zigbee_id,
						"force": true
					};
					//console.log("delete message: " + delete_message);
					this.adapter.publishMessage(delete_topic, delete_message);
                    */
                    this.adapter.removeDevice('z2m-' + request.body.zigbee_id)
                    .then(
                        function(value) { 
        					return new APIResponse({
        						status: 200,
        						contentType: 'application/json',
        						content: JSON.stringify({
        							'status': 'ok','messsage':'Succesfully attempted a force-remove of the device'
        						}),
        					});
                        },
                        function(error) {
        					return new APIResponse({
        						status: 200,
        						contentType: 'application/json',
        						content: JSON.stringify({
        							'status': 'error','messsage':'Failed to force-remove the device'
        						}),
        					});
                        }
                    );
                    /*
                    .then((successMessage) => {
                      // successMessage is whatever we passed in the resolve(...) function above.
                      // It doesn't have to be a string, but if it is only a succeed message, it probably will be.
                      console.log("Yay! " + successMessage)
                    });
                    */

                    //this.adapter.removeDevice('z2m-' + request.body.zigbee_id);

					
				} 
                
                else if(action == 'look_for_usb_stick'){
                    
                    var state = false;
                    try{
                        this.adapter.config.serial_port = this.adapter.look_for_usb_stick();
                        if(this.adapter.config.serial_port != null){
                            this.adapter.sendPairingPrompt("Zigbee USB stick detected");
                            state = true;
                            if(this.adapter.z2m_started == false){
                                this.adapter.run_zigbee2mqtt();
                            }
                        }
                    }
                    catch(e){
                        console.log("Error: API handler: look_for_usb_stick failed: ", e);
                    }
                    
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'state': state
						}),
					});
                    
                }
                
                
                else {
					console.log("unhandled API action: ", action);
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'incorrect action: ' + action
						}),
					});
				}


			}

		}

		return new APIResponse({
			status: 200,
			contentType: 'application/json',
			content: JSON.stringify({
				'status': 'Error: incorrect action'
			}),
		});
	}
}

module.exports = Zigbee2MQTTHandler;
