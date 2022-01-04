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
			console.log("* * * * * * * * * * * * API HANDLER REQUEST * * * * * * * * * *");
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
						this.adapter.waiting_for_update = false;
						this.adapter.update_result = 'idle';
					}

					var devices_as_list = [];
					try {
						for (const key in this.adapter.devices_overview) {
							if (this.adapter.devices_overview.hasOwnProperty(key)) {
								var device = this.adapter.devices_overview[key];
								if (this.adapter.waiting_for_update) {
									device['update_available'] = false;
								}

								devices_as_list.push(device);
							}
						}
					} catch (error) {
						console.log(error);
					}


					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'ok',
							'devices': devices_as_list,
                            'security': this.adapter.security,
                            'installed': this.adapter.z2m_installed_succesfully,
                            'debug': this.adapter.config.debug
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
					} else {
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
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'Updating... please wait',
							'map': this.map,
							'waiting_for_update': this.adapter.waiting_for_update,
							'update_result': this.adapter.update_result
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
                            console.log("this.adapter.security.network_key array: " + this.adapter.security.network_key);
                            
                            fs.writeFile( this.adapter.zigbee2mqtt_configuration_security_file_path, JSON.stringify( this.adapter.security ), "utf8" , (err, result) => {
                                if(err){
                                    console.log('file write error:', err);
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
                
                else if (action == "update-device") {
					if (this.config.debug) {
						console.log("in update device, with zigbee_id:" + request.body.zigbee_id);
					}


					if (this.adapter.waiting_for_update == false) {
						this.adapter.waiting_for_update = true;
						this.last_update_request_time = Date.now();
						this.adapter.update_result = 'waiting';
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
								'status': 'Sorry, please wait for the current update to finish.'
							}),
						});
					}

				} 
                
                
                else if (action == "delete") { // This feature is currently disabled. It allows a 'force delete' from the zigbee network
					if (this.config.debug) {
						console.log("in delete, with zigbee_id:" + request.body.zigbee_id);
					}

					const delete_topic = 'bridge/request/device/remove';
					//console.log("delete topic: " + delete_topic);
					const delete_message = {
						"id": request.body.zigbee_id,
						"force": true
					};
					//console.log("delete message: " + delete_message);
					this.adapter.publishMessage(delete_topic, delete_message);

					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'Attempted a force-remove of the device'
						}),
					});
				} 
                
                
                else {
					console.log("unhandled API action");
					return new APIResponse({
						status: 200,
						contentType: 'application/json',
						content: JSON.stringify({
							'status': 'incorrect action'
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
