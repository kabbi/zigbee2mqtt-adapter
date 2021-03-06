(function() {
	class zigbee2mqtt extends window.Extension {
		constructor() {
			super('zigbee2mqtt-adapter');

			this.addMenuEntry('Zigbee 2 MQTT');

			this.content = 'Error loading content';

			this.asked_for_map = false;
			this.asked_for_update = false;
			this.previous_map_data = '';

			fetch(`/extensions/${this.id}/views/content.html`)
				.then((res) => res.text())
				.then((text) => {
					// console.log("fetched html:");
					// console.log(text);
					this.content = text;
					if (document.location.href.endsWith('zigbee2mqtt-adapter')) {
					// console.log(document.location.href);
						this.show();
					}
				})
				.catch((e) => console.error('Failed to fetch content:', e));
		}


		show() {
			// console.log("in show");
			// console.log("this.content:");
			// console.log(this.content);

			try {
				clearInterval(window.zigbee2mqtt_interval);
			} catch (e) {
				console.log(`no interval to clear?: ${e}`);
			}


			// console.log("main view:");
			// console.log(main_view);
			if (this.content == '' || this.content == 'Error loading content') {
				// console.log("show: content was empty");
				this.content = 'Loading error (fetched HTML was empty)';
				return;
			}

			const main_view = document.getElementById('extension-zigbee2mqtt-adapter-view');
			main_view.innerHTML = this.content;

			document.getElementById('extension-zigbee2mqtt-adapter-list');

			const pre = document.getElementById('extension-zigbee2mqtt-adapter-response-data');


			// adding a slight delay so that everything is loaded properly
			// setTimeout(function(){

			/*
			try{
				console.log("VIZ =");
				console.log(Viz);

				const welcome_viz = 'digraph G { "Welcome" -> "To" "To" -> "Web" "To" -> "Zigbee2MQTT!"}';

			document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = Viz(welcome_viz, "svg");
			}
			catch (error){
				console.log("Graphviz error: " + error );
			}
			*/

			this.request_devices_list();

			// }, 3000);


			// Attach click event to update map button
			document.getElementById('extension-zigbee2mqtt-adapter-update-map-button').addEventListener('click', () => {
				// console.log("clicked on update map button");
				document.getElementById('extension-zigbee2mqtt-adapter-graphviz-container')
					.innerHTML = '<img class="extension-zigbee2mqtt-adapter-spinner" src="/extensions/zigbee2mqtt-adapter/images/spinner.gif">';
				document.getElementById('extension-zigbee2mqtt-adapter-update-map-button').disabled = true;

				this.asked_for_map = true;
				console.log(`this.asked_for_map is now: ${this.asked_for_map}`);

				window.API.postJson(
					'/extensions/zigbee2mqtt-adapter/api/ajax',
					{action: 'update-map'}

				).then(() => {
					// console.log(body);
					// document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = body.status;

				}).catch((e) => {
					console.log(`Error sending update map request: ${e.toString()}`);
				});
			});


			window.zigbee2mqtt_interval = setInterval(function() {
				// console.log("tick");
				try {
					if (this.asked_for_map || this.asked_for_update) {
						// console.log("asked for map was true");

						window.API.postJson(`/extensions/${this.id}/api/ajax`,
																										{action: 'poll'}

						).then((body) => {
							// console.log("received poll response");
							console.log(body);
							if (this.asked_for_map) {
								if (body.map != this.previous_map_data && body.map != '') {
									this.previous_map_data = body.map;
									// console.log("Received new map data!");
									// console.log(body['map']);

									// Generate the Visualization of the Graph into "svg".
									if (body.map != '') {
										// eslint-disable-next-line no-undef
										const svg = Viz(body.map, 'svg');
										document.getElementById('extension-zigbee2mqtt-adapter-graphviz-container').innerHTML = svg;
									}

									// If we received the actual map, stop requesting the map data
									if (body.map != 'digraph G { "Breathe in" -> "Breathe out" "Breathe out" -> "Relax"}') {
										this.asked_for_map = false;
										pre.innerText = '';
										document.getElementById('extension-zigbee2mqtt-adapter-update-map-button').disabled = false;
									} else {
										console.log('relax');
									}
								} else {
									// console.log("not ok response while getting items list");
									pre.innerText = body.status;
								}
							}

							if (this.asked_for_update) {
								if (body.waiting_for_update == false) {
									if (body.update_result == true) {
										pre.innerText = 'Updated succesfully!';
									} else {
										pre.innerText = 'Update failed!';
									}

									this.asked_for_update = false;
									this.request_devices_list();
								} else {
									// console.log("not ok response while getting items list");
									pre.innerText = body.status;
								}
							}
						}).catch((e) => {
							// console.log("Error getting timer items: " + e.toString());
							console.log(`Error while waiting for map: ${e}`);
							pre.innerText = 'Connection error';
						});
					} else {
						// console.log("this.asked_for_map was not true");
						// pre.innerText = "Not waiting for map.";
					}
				} catch (e) {
					`Zigbee2MQTT polling error: ${console.log(e)}`;
				}
			}.bind(this), 3000);


			// TABS

			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-things').addEventListener('click', () => {
				// console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-things'];
				this.request_devices_list();
			});
			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-map').addEventListener('click', () => {
				// console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-map'];
			});
			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-tutorial').addEventListener('click', () => {
				// console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-tutorial'];
			});
		}


		hide() {
			// console.log("in hide");
			clearInterval(window.zigbee2mqtt_interval);
			this.view.innerHTML = '';
		}


		request_devices_list() {
			window.API.postJson(
				'/extensions/zigbee2mqtt-adapter/api/ajax',
				{action: 'init'}
			).then((body) => {
				// console.log("init response received");
				// console.log(body);
				// console.log(body.devices);
				this.regenerate_items(body.devices);
			}).catch((e) => {
				console.log(`Error sending init request: ${e.toString()}`);
				// document.getElementById('extension-zigbee2mqtt-adapter-response-data').innerText = "Error sending init request: " + e.toString();
			});
		}


		//
		//  REGENERATE ITEMS
		//

		regenerate_items(items) {
			try {
				// console.log("regenerating");
				// console.log(items);

				const pre = document.getElementById('extension-zigbee2mqtt-adapter-response-data');
				const list = document.getElementById('extension-zigbee2mqtt-adapter-list');
				const original = document.getElementById('extension-zigbee2mqtt-adapter-original-item');


				list.innerHTML = '';

				// Loop over all items
				for (const item in items) {
					// console.log(items[item]);
					const clone = original.cloneNode(true);
					clone.removeAttribute('id');

					try {
						// console.log("items[item]['model_id'] = " + items[item]['model_id']);
						if (typeof items[item].vendor != 'undefined') {
							let icon_name = items[item].vendor.toString();
							if (icon_name.toLowerCase() == 'ikea') {
								icon_name = 'IKEA';
							} else if (icon_name.toLowerCase() == 'ge') {
								icon_name = 'GE';
							} else if (icon_name.toLowerCase().includes('xiaomi')) {
								icon_name = 'MI';
							} else if (icon_name.toLowerCase().includes('bitron')) {
								icon_name = 'Bitron';
							} else if (icon_name.toLowerCase().includes('tuya')) {
								icon_name = 'tuya';
							} else if (icon_name.toLowerCase().includes('yale')) {
								icon_name = 'Yale';
							} else if (icon_name.toLowerCase().includes('gledopto')) {
								icon_name = 'GLEDOPTO';
							} else if (icon_name.toLowerCase().includes('philips')) {
								icon_name = 'PHILIPS';
							} else if (icon_name.toLowerCase().includes('osram')) {
								icon_name = 'OSRAM';
							} else if (icon_name.toLowerCase().includes('lidl')) {
								icon_name = 'LIDL';
							} else if (icon_name.toLowerCase().includes('legrand')) {
								icon_name = 'legrand';
							} else if (icon_name.toLowerCase().includes('innr')) {
								icon_name = 'innr';
							} else if (icon_name.toLowerCase().includes('immax')) {
								icon_name = 'Immax';
							} else if (icon_name.toLowerCase().includes('hornbach')) {
								icon_name = 'HORNBACH';
							} else if (icon_name.toLowerCase().includes('smart') && icon_name.toLowerCase().includes('smart')) {
								icon_name = 'ECOSMART';
							} else if (icon_name.toLowerCase().includes('develco')) {
								icon_name = 'DEVELCO';
							} else if (icon_name.toLowerCase().includes('centralite')) {
								icon_name = 'Centralite';
							} else if (icon_name.toLowerCase().includes('aurora')) {
								icon_name = 'AURORA';
							} else {
								icon_name = '';
							}

							const s = document.createElement('div');
							const t = document.createTextNode(icon_name);
							icon_name = icon_name.toLowerCase().replace(/ /g, '-');
							const class_name = `extension-zigbee2mqtt-adapter-icon-${icon_name}`;

							s.appendChild(t);
							s.classList.add(class_name);
							clone.querySelectorAll('.extension-zigbee2mqtt-adapter-icon')[0].appendChild(s);
						}
					} catch (e) {
						console.log(`error adding icon: ${e}`);
					}


					try {
						const a = document.createElement('a');
						// s.classList.add('extension-zigbee2mqtt-adapter-description');
						a.setAttribute('href', `/things/z2m-${items[item].zigbee_id}`);
						const t = document.createTextNode(items[item].description);
						a.appendChild(t);
						clone.querySelectorAll('.extension-zigbee2mqtt-adapter-description')[0].appendChild(a);


						const s = document.createElement('a');
						// s.classList.add('extension-zigbee2mqtt-adapter-zigbee-id');
						s.setAttribute('href', `/things/z2m-${items[item].zigbee_id}`);
						const tt = document.createTextNode(items[item].zigbee_id);
						s.appendChild(tt);
						clone.querySelectorAll('.extension-zigbee2mqtt-adapter-zigbee-id')[0].appendChild(s);

						if (typeof items[item].software_build_id != 'undefined') {
							const s = document.createElement('span');
							// s.classList.add('extension-zigbee2mqtt-adapter-zigbee-id');
							const t = document.createTextNode(`v. ${items[item].software_build_id}`);
							s.appendChild(t);
							clone.querySelectorAll('.extension-zigbee2mqtt-adapter-version')[0].appendChild(s);
						}
					} catch (e) {
						console.log(`error handling Zigbee2MQTT device data: ${e}`);
					}


					const show_update_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-item-update-button')[0];
					// console.log("show_update_button = ");
					// console.log(show_update_button);
					if (items[item].update_available) {
						show_update_button.disabled = false;
					} else {
						// console.log("no update available for this device");
						// show_update_button.disabled = false; // For debugging
					}
					show_update_button.addEventListener('click', (event) => {
						// console.log("clicked on show update button");
						const target = event.currentTarget;
						const parent3 = target.parentElement.parentElement.parentElement;
						// console.log(parent3);
						parent3.classList.add('update');
					});


					const read_about_risks_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-read-about-risks')[0];
					read_about_risks_button.addEventListener('click', () => {
						document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-tutorial'];
					});


					const cancel_update_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-overlay-cancel-update-button')[0];
					cancel_update_button.addEventListener('click', (event) => {
						// console.log("cancel update button has been clicked");
						const target = event.currentTarget;
						const parent3 = target.parentElement.parentElement.parentElement;
						parent3.classList.remove('update');
					});


					const start_update_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-overlay-start-update-button')[0];
					start_update_button.addEventListener('click', (event) => {
						// console.log("clicked on start update button");

						const target = event.currentTarget;
						const parent3 = target.parentElement.parentElement.parentElement;
						parent3.classList.remove('update');
						parent3.classList.add('updating');

						// setTimeout(() => hideBtn(0), 1000);

						setTimeout(function() {
							parent3.classList.remove('updating');
						}, 500000);


						// Disable all update buttons if one has been clicked
						const update_buttons = document.getElementsByClassName('extension-zigbee2mqtt-adapter-item-update-button');
						for (let i = 0; i < update_buttons.length; i++) {
							update_buttons[i].disabled = true;
						}
						pre.innerText = 'Please wait 10 minutes before you start another update!';


						// Send update request to backend
						window.API.postJson(
							`/extensions/${this.id}/api/ajax`,
							{action: 'update-device', zigbee_id: items[item].zigbee_id}
						).then((body) => {
							console.log('Update item reaction: ');
							console.log(body);
							pre.innerText = body.update;
							this.asked_for_update = true;
						}).catch((e) => {
							console.log('zigbee2mqtt: postJson error while requesting update start');
							pre.innerText = e.toString();
						});
					});


					/*
					// Force-delete device from zigbee network feature. Unfinished, may just be confusing.
					// Add delete button click event
					const delete_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-item-delete-button')[0];
					delete_button.addEventListener('click', (event) => {
						var target = event.currentTarget;
						var parent3 = target.parentElement.parentElement.parentElement;
						parent3.classList.add("delete");
						var parent4 = parent3.parentElement;
						parent4.removeChild(parent3);

						// Send new values to backend
						window.API.postJson(
							`/extensions/${this.id}/api/ajax`,
							{'action':'delete','zigbee_id':items[item]['zigbee_id']}
						).then((body) => {
							//console.log("delete item reaction: ");
							//console.log(body);
							//if( body['state'] != true ){
							pre.innerText = body['update'];
							//}

						}).catch((e) => {
							console.log("zigbee2mqt error in delete items handler: " + e.toString());
							pre.innerText = e.toString();
						});


					});
					*/

					// clone.classList.add('extension-zigbee2mqtt-type-' + type);
					// clone.querySelectorAll('.extension-zigbee2mqtt-type' )[0].classList.add('extension-zigbee2mqtt-icon-' + type);

					// clone.querySelectorAll('.extension-zigbee2mqtt-adapter-model-id' )[0].innerHTML = item;


					list.append(clone);
				} // end of for loop

				/*
				try{
					const reading_list = document.getElementsByClassName('extension-zigbee2mqtt-adapter-read-about-risks');
					for( var link in reading_list ){
						const element = reading_list[link]
						element.addEventListener('click', (event) => {
							//console.log(event);
							document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-tutorial'];
						});
					}
				}
				catch (e) {
					// statements to handle any exceptions
					console.log("error creating reading list items: " + e); // pass exception object to error handler
				}
				*/
			} catch (e) {
				// statements to handle any exceptions
				console.log(`error while generating items: ${e}`); // pass exception object to error handler
			}
		}
	}

	new zigbee2mqtt();
})();


