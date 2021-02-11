'use strict';

const {
	APIHandler,
	APIResponse
} = require('gateway-addon');
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
							'devices': devices_as_list
						}),
					});

				} else if (action == "update-map") {

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


				} else if (action == "poll") {
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
				} else if (action == "update-device") {
					if (this.config.debug) {
						console.log("in update device, with friendly_name:" + request.body.friendly_name);
					}


					if (this.adapter.waiting_for_update == false) {
						this.adapter.waiting_for_update = true;
						this.last_update_request_time = Date.now();
						this.adapter.update_result = 'waiting';
						const update_topic = 'bridge/request/device/ota_update/update';
						console.log("update device topic: " + update_topic);
						const update_message = {
							"id": request.body.friendly_name
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


				} else if (action == "delete") {
					if (this.config.debug) {
						console.log("in delete, with friendly_name:" + request.body.friendly_name);
					}

					const delete_topic = 'bridge/request/device/remove';
					//console.log("delete topic: " + delete_topic);
					const delete_message = {
						"id": request.body.friendly_name,
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
				} else {
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
			status: 201
		});
	}
}

module.exports = Zigbee2MQTTHandler;
