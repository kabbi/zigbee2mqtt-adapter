(function() {
	class zigbee2mqtt extends window.Extension {
	    constructor() {
	      	super('zigbee2mqtt-adapter');
      		
			this.addMenuEntry('Zigbee');

	    	this.content = '';

            //console.log(window.API);

            /*
	        window.API.getThings()
            .then((body) => {
				
                //console.log("THINGS: ", body);
                
				//document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = body.status;
			    
	        }).catch((e) => {
	  			console.log("Error sending update map request: ", e);
	        });
            */

            this.debug = false;
			this.asked_for_map = false;
			this.updating_firmware = false;
            this.updating_z2m = false;
			this.previous_map_data = "";
            this.all_things = {};
            this.title_lookup_table = {};
			
			this.busy_doing_poll = false;
			
			this.serial_port_path = null;
			this.missing_usb_stick = null;
			
			this.serial_port_name_el = null;
			this.find_usb_stick_container_el = null;
			
			this.page_visible = true;
			document.addEventListener("visibilitychange", () => {
			  if (document.hidden) {
				  if(this.debug){
					  console.log("zigbee2mqtt debug: page became hidden");
				  }
				  this.page_visible = false;
			  } else {
				  if(this.debug){
					  console.log("zigbee2mqtt debug: page became visible");
				  }
				  this.page_visible = true;
			  }
			});
			
			fetch(`/extensions/${this.id}/views/content.html`)
	        .then((res) => res.text())
	        .then((text) => {
				//console.log("fetched html:");
				//console.log(text);
	         	this.content = text;
				
                if( window.location.pathname == "/extensions/zigbee2mqtt-adapter" ){
	  		  		this.show();
	  		  	}
	        })
	        .catch((err) => console.error('zigbee2mqtt: failed to fetch content:', err));
	    }



	  show() {
			//console.log("in show");
			//console.log("this.content:");
			//console.log(this.content);
			
            //console.log("this.debug: " + this.debug);
            /*
			try{
				if(window.zigbee2mqtt_interval){
					clearInterval(window.zigbee2mqtt_interval);
				}
			}
			catch(e){
				//console.log("no interval to clear?: " + e);
			}
			*/
            
			if(this.content == ''){
				if(this.debug){
					console.log("zigbee2mqtt: show: content was empty");
				}
				return;
			}
            this.view.innerHTML = this.content;
            
            
            try{
        	    API.getThings().then((things) => {
			
        			this.all_things = things;
        			for (let key in things){
                        
        				try{
					
        					var thing_title = 'unknown';
        					if( things[key].hasOwnProperty('title') ){
        						thing_title = things[key]['title'];
        					}
        					else if( things[key].hasOwnProperty('label') ){
        						thing_title = things[key]['label'];
        					}
					
        					//console.log("thing_title = " + thing_title);
					
        					var thing_id = things[key]['href'].substr(things[key]['href'].lastIndexOf('/') + 1);
                            
                            this.title_lookup_table[thing_id] = thing_title;
                            
                        }
            			catch(e){
            				//console.log("no interval to clear?: " + e);
            			}
                    }
                    
                    //console.log("this.all_things: ", this.all_things);
                    //console.log("this.title_lookup_table: ", this.title_lookup_table);
                    
                    this.request_devices_list();
                });
            }
			catch(err){
				if(this.debug){
					console.error("zigbee2mqtt: caught error calling API.getThings(): ", err);
				}
                this.request_devices_list();
			}
            
            
			
			
			

			const list = this.view.querySelector('#extension-zigbee2mqtt-adapter-list');
		
			//const pre = document.getElementById('extension-zigbee2mqtt-adapter-response-data');
			
			
			



			// Attach click event to update map button
			this.view.querySelector('#extension-zigbee2mqtt-adapter-update-map-button').addEventListener('click', () => {
				//console.log("clicked on update map button");
				this.view.querySelector('#extension-zigbee2mqtt-adapter-graphviz-container').innerHTML = '<div class="extension-zigbee2mqtt-adapter-spinner"><div></div><div></div><div></div><div></div></div>';
				this.view.querySelector('#extension-zigbee2mqtt-adapter-update-map-button').disabled = true;
				
				this.asked_for_map = true;
				//console.log("this.asked_for_map is now: " + this.asked_for_map);
				
		        window.API.postJson(
		         "/extensions/zigbee2mqtt-adapter/api/ajax",
					{"action":"update-map"}

		        ).then((body) => {
					if(this.debug){
                        console.log("zigbee2mqtt debug: update-map response: ", body);
                    }
					//document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = body.status;
				    
		        }).catch((err) => {
		  			if(this.debug){
						console.error("zigbee2mqtt debug: caught error sending update map request: ", err);
					}
		        });
			});


            


            // Save new network security values
            this.view.querySelector('#extension-zigbee2mqtt-adapter-save-security-button').addEventListener('click', (event) => {
                //console.log("save zigbee security button clicked");
                const new_pan_id = this.view.querySelector('#extension-zigbee2mqtt-adapter-security-pan-id').value;
                const new_network_key = this.view.querySelector('#extension-zigbee2mqtt-adapter-security-network-key').value;
                //console.log(new_pan_id,new_network_key);
                
                if(new_pan_id == "" || new_network_key == ""){
                    this.flash_message("security values cannot be empty");
                    return;
                }
                if( confirm("Are you sure you want to set these security values?") ){
                    
    		        window.API.postJson(
    		         "/extensions/zigbee2mqtt-adapter/api/ajax",
    					{"action":"save-security","pan_id":new_pan_id,"network_key":new_network_key}

    		        ).then((body) => {
                        //console.log("new values have been saved");
                        this.flash_message("The security values were saved");
    					//console.log(body);
    					//document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = body.status;

    		        }).catch((err) => {
    		  			if(this.debug){
							console.error("zigbee2mqtt debug: caught error sending security values: ", err);
						}
    		        });
                    
                }
                
            });

            
            
            // Reinstall button
            this.view.querySelector('#extension-zigbee2mqtt-adapter-reinstall-button').addEventListener('click', () => {

                if( confirm("Are you absolutely sure you want to re-install Zigbee2MQTT? Only proceed if you understand the risks!") ){
                    
    		        window.API.postJson(
    		         "/extensions/zigbee2mqtt-adapter/api/ajax",
    					{"action":"re-install"}

    		        ).then((body) => {
						const content_container_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-content-container');
		                if(content_container_el){
		                    content_container_el.innerHTML = '<h3 id="extension-zigbee2mqtt-adapter-title"><img id="extension-zigbee2mqtt-adapter-main-page-icon" src="/extensions/zigbee2mqtt-adapter/images/menu-icon.svg">Zigbee2MQTT</h3><br/><br/><h4 style="text-align:center">Please wait...</h4>';
                        }
                        window.setTimeout(() => {
                            //console.log("refreshing page so that 'still installing' message is shown");
                            window.location.reload(false);
                        }, 40000);
                        
    		        }).catch((err) => {
    		  			if(this.debug){
							console.error("zigbee2mqtt debug: caught error sending security values: ", err);
						}
    		        });
                    
                }
                
            });


			const find_radio_wizard_start_button_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-button');
            if(find_radio_wizard_start_button_el){
				find_radio_wizard_start_button_el.addEventListener('click', () => {
	            	this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-container').classList.remove('extension-zigbee2mqtt-adapter-hidden');
					this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-success').classList.add('extension-zigbee2mqtt-adapter-hidden');
					this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-step2').classList.remove('extension-zigbee2mqtt-adapter-hidden');
					this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-step2').classList.add('extension-zigbee2mqtt-adapter-hidden');
					this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-failed').classList.add('extension-zigbee2mqtt-adapter-hidden');
	            });
            }
			
            // Add USB stick BEFORE button
			const add_radio_before_button_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-add-radio-before-button');
			if(add_radio_before_button_el){
	            add_radio_before_button_el.addEventListener('click', () => {

	                add_radio_before_button_el.classList.add('extension-zigbee2mqtt-adapter-hidden');
                
			        window.API.postJson(
			         "/extensions/zigbee2mqtt-adapter/api/ajax",
						{"action":"find_usb_stick_before"}

			        ).then((body) => {
	                    if(this.debug){
							console.log("zigbee2mqtt debug: find_usb_stick_before response: ", body);
						}
	                    if(body['state'] == true){
	                        //console.log("USB stick was detected!");
	                        this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-step2').classList.remove('extension-zigbee2mqtt-adapter-hidden');
	                    }
						add_radio_before_button_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
                    
			        }).catch((err) => {
						this.flash_message("Connection error");
			  			if(this.debug){
							console.log("zigbee2mqtt debug: caught error in find_usb_stick_before request: ", err);
						}
						add_radio_before_button_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
			        });
                
	            });
			}
            
			
			
            // Add USB stick AFTER button
			const add_radio_after_button_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-add-radio-after-button');
            if(add_radio_after_button_el){
				add_radio_after_button_el.addEventListener('click', () => {

	                add_radio_after_button_el.classList.add('extension-zigbee2mqtt-adapter-hidden');
					this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-failed').classList.add('extension-zigbee2mqtt-adapter-hidden');
                
			        window.API.postJson(
			         "/extensions/zigbee2mqtt-adapter/api/ajax",
						{"action":"find_usb_stick_after"}

			        ).then((body) => {
	                    if(this.debug){
							console.log("zigbee2mqtt debug: find_usb_stick_after response: ", body);
						}
	                    if(body['state'] == true){
	                        if(this.debug){
								console.log("zigbee2mqtt debug: USB stick was succesfully detected");
							}
							this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-step1').classList.add('extension-zigbee2mqtt-adapter-hidden');
	                        this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-step2').classList.add('extension-zigbee2mqtt-adapter-hidden');
							this.view.querySelector('#extension-zigbee2mqtt-adapter-find-zigbee-radio-success').classList.remove('extension-zigbee2mqtt-adapter-hidden');
	                    }
						add_radio_after_button_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
                    
			        }).catch((err) => {
						this.flash_message("Connection error");
			  			if(this.debug){
							console.log("zigbee2mqtt debug: caught error in find_usb_stick_after request: ", err);
						}
						add_radio_after_button_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
			        });
                
	            });
            }
			

            

            // Scan for USB stick button
			const start_usb_stick_wizard_button_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-look-for-usb-stick-button');
            if(start_usb_stick_wizard_button_el){
				start_usb_stick_wizard_button_el.addEventListener('click', () => {

					start_usb_stick_wizard_button_el.classList.add('extension-zigbee2mqtt-adapter-hidden');
                
			        window.API.postJson(
			         "/extensions/zigbee2mqtt-adapter/api/ajax",
						{"action":"look_for_usb_stick"}

			        ).then((body) => {
	                    //console.log("look_for_usb_stick response: ", body);
	                    if(body['state'] == true){
	                        //console.log("USB stick was detected!");
	                        this.view.querySelector('#extension-zigbee2mqtt-adapter-serial-hint').style.display = 'none';
	                        window.location.reload(false);
	                    }
	                    else{
	                        start_usb_stick_wizard_button_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
	                    }
                    
			        }).catch((err) => {
			  			if(this.debug){
							console.error("zigbee2mqtt adapter: caught error in look_for_usb_stick request: ", err);
						}
	                    start_usb_stick_wizard_button_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
			        });
                
	            });
            }
			
            


            // Do health check button
			const health_check_button_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-health-check-button');
            health_check_button_el.addEventListener('click', () => {
				
                health_check_button_el.style.display = 'none';
                
		        window.API.postJson(
		         "/extensions/zigbee2mqtt-adapter/api/ajax",
					{"action":"health_check"}

		        ).then((body) => {
                    if(this.debug){
						console.log("zigbee2MQTT debug: health check response: ", body);
                    }
                    
		        }).catch((err) => {
		  			if(this.debug){
						console.log("zigbee2MQTT debug: caught error doing health check request: ", err);
					}
                    health_check_button_el.style.display = 'inline-block';
		        });
                
            });
            


			if(typeof window.zigbee2mqtt_interval == 'undefined' || window.zigbee2mqtt_interval == null){
				window.zigbee2mqtt_interval = setInterval( () => {
					if(this.debug){
	                    console.log("zigbee2MQTT debug:  at interval");
						console.log("this.busy_doing_poll, this.page_visible, window.location.pathname: ", this.busy_doing_poll, this.page_visible, window.location.pathname);
	                }
					try{
						if(this.busy_doing_poll == false && this.page_visible && window.location.pathname == "/extensions/zigbee2mqtt-adapter"){ //  && this.asked_for_map || this.updating_firmware || this.updating_z2m
							if(this.debug){
	                            console.log("zigbee2MQTT debug: calling poll");
	                        }
							this.busy_doing_poll = true;
						
						  	window.API.postJson(`/extensions/${this.id}/api/ajax`,
								{"action":"poll"}
							).then((body) => {
								if(this.debug){
	                                console.log("zigbee2MQTT debug: received poll response: ", body);
	                            }
								this.parse_body(body);
								this.busy_doing_poll = false;
							}).catch((err) => {
								if(this.debug){
									console.error("zigbee2MQTT debug: caught error calling poll: ", err);
								}
								this.busy_doing_poll = false;
							});
						
						}
					}
					catch(err){
	                    if(this.debug){
	                        console.error("zigbee2MQTT debug: caught polling error: ", err);
	                    }
						this.busy_doing_poll = false;
	                }
				
				}, 3000);
			}
			
			

			// TABS

			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-things').addEventListener('click', (event) => {
				//console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-things'];
				this.request_devices_list();
			});
			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-map').addEventListener('click', (event) => {
				//console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-map'];
			});
			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-security').addEventListener('click', (event) => {
				//console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-security'];
				
			  	window.API.postJson(`/extensions/${this.id}/api/ajax`,
					{"action":"get_security"}
				).then((body) => {
					if(this.debug){
                        console.log("zigbee2MQTT debug: received get_security response: ", body);
                    }
					this.parse_body(body);
				}).catch((err) => {
					if(this.debug){
						console.error("zigbee2MQTT debug: caught error calling get_security: ", err);
					}
				});
			});
			document.getElementById('extension-zigbee2mqtt-adapter-tab-button-tutorial').addEventListener('click', (event) => {
				//console.log(event);
				document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-tutorial'];
			});
			

		}
		
	
		
		hide(){
			//console.log("in hide");
			
			try{
                if(document.getElementById('extension-zigbee2mqtt-adapter-menu-item').classList.contains('selected') == false){
                    //clearInterval(window.zigbee2mqtt_interval);
                    this.view.innerHTML = "";
                }
			}
            catch(err){
                if(this.debug){
					console.log("Zigbee2mqtt addon: caught error in hide: ", err);
				}
            }
            
		}
		
		
		
		
	
    
	    //
        //  /INIT request
        //
        
		request_devices_list(){
            //console.log("in request_devices_list");
	        window.API.postJson(
	          '/extensions/zigbee2mqtt-adapter/api/ajax',
						{"action": "init"}
	        ).then((body) => {
				this.parse_body(body);
                

	        }).catch((e) => {
	  			//console.log("Error sending init request: " + e.toString());
				const content_container_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-content-container');
                if(content_container_el){
                    content_container_el.innerHTML = '<div style="text-align:center"><h1>The Zigbee2Mqtt addon did not respond (yet)</h1><p>It might just be a temporary connection error. Try refreshing the page in a few seconds.</p></div>';
                    setTimeout(function(){
                        window.location.reload(true);
                    }, 10000);
                }
                
				//document.getElementById('extension-zigbee2mqtt-adapter-response-data').innerText = "Error sending init request: " + e.toString();
	        });
		}
	
	
	
	
		parse_body(body){
			
			// poll
			
            if(typeof body.debug != 'undefined'){
                this.debug = body.debug;
                if(this.debug){
					const debug_warning_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-debug-warning');
					if(debug_warning_el){
						debug_warning_el.style.display = 'block';
					}
                }
            }
			
			if(this.debug){
				console.log("Zigbee2MQTT: parse_body:  body: ", body);
			}
			
            if(typeof body.security != 'undefined'){
                //console.log("security values were present in init data. pan_id: " + body.security.pan_id);
				const pan_id_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-security-pan-id');
				if(pan_id_el){
	                pan_id_el.value = body.security.pan_id;
	                this.view.querySelector('#extension-zigbee2mqtt-adapter-security-network-key').value = body.security.network_key;
				}
			}
			
			if(typeof body.serial_port_path == 'string' && typeof body.radio_serial_port == 'string'){
				if(this.debug){
					console.log("zigbee2mqtt debug: parse_body: body.radio_serial_port: ", body.radio_serial_port);
				}
				this.serial_port_path = body.serial_port_path;
				
				this.serial_port_name_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-zigbee-radio-serial-port');
				if(this.serial_port_name_el){
					this.serial_port_name_el.textContent = body.radio_serial_port + ' (' + body.serial_port_path + ')';
				}
			}
			
			if(typeof body.missing_usb_stick == 'boolean'){
				if(this.debug){
					console.log("zigbee2mqtt debug: parse_body:  missing_usb_stick: ", body.missing_usb_stick);
				}
				this.missing_usb_stick = body.missing_usb_stick;
				
				this.find_usb_stick_container_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-zigbee-radio-container');
				if(this.find_usb_stick_container_el){
					if(this.missing_usb_stick){
						this.find_usb_stick_container_el.classList.remove('extension-zigbee2mqtt-adapter-hidden');
					}
					else{
						this.find_usb_stick_container_el.classList.add('extension-zigbee2mqtt-adapter-hidden');
					}
				}
				else{
					console.error("this.find_usb_stick_container_el?", this.find_usb_stick_container_el);
				}
			}
			
			
			
			
			
			if(this.asked_for_map){
				if(typeof body['map'] == 'string' && body['map'] != this.previous_map_data && body['map'] != ""){
					this.previous_map_data = body['map'];
					//console.log("Received new map data!");
					//console.log(body['map']);
					const graph_container_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-graphviz-container');
			      	if(graph_container_el){
						// Generate the Visualization of the Graph into "svg".
				      	if(body['map'] != ""){
							const svg = Viz(body['map'], "svg");
					      	graph_container_el.innerHTML = svg;
				      	}
						
						// If we received the actual map, stop requesting the map data
						if(body['map'] != 'digraph G { "Breathe in" -> "Breathe out" "Breathe out" -> "Relax"}'){
							this.asked_for_map = false;
							this.view.querySelector('#extension-zigbee2mqtt-adapter-update-map-button').disabled = false;
						}else{
							//console.log("relax");
						}
			      	}
					
				
					
				}
			}
			
			if(this.updating_firmware){
				if(typeof body['updating_firmware'] == 'boolean' && body['updating_firmware'] == false){ // this occurs when Z2M sends a message to /bridge/response/device/ota_update/update, which signals a big change in the status of the firmware update progress. E,g, that it finished.
					
					if(body['update_result']['status'] == 'ok'){
						this.flash_message("Firmware updated succesfully");
					}
					else if(body['update_result']['status'] == 'error'){
                        if(this.debug){
							console.error("Firmware update failed! The error was: " + body['update_result']['error']);
						}
						this.flash_message("The firmware update failed: " + body['update_result']['error']);
					}
                    else if(body['update_result']['status'] == 'idle'){
                        
                    }
					
					this.updating_firmware = false;
                    this.request_devices_list(); // also then regenerates the devices list so the update progress indicator is shown.
					
				}
				else if(body['updating_firmware'] == true){ // messages while updating
					//console.log("not ok response while getting items list");
                    if(body['update_result']['status'] == 'error'){
					    if(this.debug){
                            console.error("z2m: error while already updating firmware: ", body['update_result']['error']); // likely the message that an update is already in progress
                        }
                    }
                    if(body['update_result']['status'] == 'idle'){
                        if(this.debug){
                            //console.log("update result status was still idle"); // this means the update is still in progress.
                        }
                    }
				}
                //this.request_devices_list(); // also then regenerates the devices list so the update progress indicator is shown.
                if(typeof body['devices'] != 'undefined'){
                	this.update_progress_bar(body['devices']);
                }
				
			}
			
            if(this.updating_z2m){
                //console.log("updating z2m?");
                if(typeof body.installed == 'boolean' && typeof body.started == 'boolean'){
	                if(body.installed && !body.started){
	                    if(this.debug){
							console.log("z2m installed, but not started yet");
						}
	                }
	                this.request_devices_list();
	                if(body.started){
	                    if(this.debug){
							console.log("Z2M moved from installing to started");
						}
	                    this.updating_z2m = false;
	                }
                }
            }
			
			
			
			
			
			
			// init
			
            const list2 = this.view.querySelector('#extension-zigbee2mqtt-adapter-list');

            if(body.installed == false){
                //console.log("STILL INSTALLING");
		        this.updating_z2m = true;
                
				if(list2){
                    list2.innerHTML = '<div style="margin:4rem auto;padding:2rem;max-width:40rem;text-align:center; background-color:rgba(0,0,0,.1);border-radius:10px"><h2>Still installing...</h2><br/><div class="extension-zigbee2mqtt-adapter-spinner"><div></div><div></div><div></div><div></div></div><br/><p>It takes about 30 minutes for Zigbee2MQTT to be fully downloaded and installed.</p><p>Come back a little later. If this message is gone, that means the intallation has finished.</p><p style="font-style:italic">Do not power-off or restart this controller until installation is complete!</p></div>';
				    return;
				}
                else{
                    this.flash_message("The Zigbee2MQTT addon is still installing itself. Please wait about 30 minutes before rebooting the system.");
                }
            }/*
			else if(this.missing_usb_stick == true){
				
				
			}
            else if(body.serial == null || (typeof body.serial == 'string' && body.serial == '')){
				const serial_hint_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-serial-hint');
                if(serial_hint_el){
                	serial_hint_el.style.display = 'block';
                }
            }
			*/
            else if(typeof body.usb_port_issue == 'boolean' && body.usb_port_issue != false){
				const usb_port_issue_el = this.view.querySelector('#extension-zigbee2mqtt-adapter-usb-port-issue-hint');
				if(usb_port_issue_el){
					usb_port_issue_el.style.display = 'block';
				}
            }
			/*
            else if(list2 && this.missing_usb_stick == false){
				
				if(body.started == false){
                    list2.innerHTML = '<div style="margin:4rem auto;padding:2rem;max-width:40rem;text-align:center; background-color:rgba(0,0,0,.1);border-radius:10px"><h2>Zigbee2MQTT has not started (yet).</h2><br/><div class="extension-zigbee2mqtt-adapter-spinner"><div></div><div></div><div></div><div></div></div><br/><p>It may be that it is still starting up. If this message is still here after two minutes, then something is probably wrong. In that case, try rebooting your controller.</p><p>Also make sure no other Zigbee addons are running.</p></div>';
				    return;
				}
				else{
                    list2.innerHTML = "";
                    //console.log("installed and running, so will show zigbee devices list. Calling regenerate_items()");
                    this.regenerate_items(body.devices);
				}
            }
            else{
                
            }
			*/
			
			if(typeof body.devices != 'undefined' && Array.isArray(body.devices)){
				this.regenerate_items(body.devices);
			}
			
			
			
		}
	
	
	
	
	
	
	
	
	
		//
		//  REGENERATE ITEMS
		//
	
		regenerate_items(items){
			try {
				//console.log("regenerating list");
				//console.log(items);
		
				//const pre = document.getElementById('extension-zigbee2mqtt-adapter-response-data');
				const list = this.view.querySelector('#extension-zigbee2mqtt-adapter-list');
				const original = this.view.querySelector('#extension-zigbee2mqtt-adapter-original-item');
			
				if(!list){
				    return;
				}
				list.innerHTML = "";
		
				// Loop over all items
				for( var item in items ){
					//console.log("items[item]['zigbee_id'] = " + items[item]['zigbee_id'] );
                    //console.log(item); // device_id
                    //console.log(items[item]);
                    
                    if(item == 'appendages'){
                        //console.log("appendages spotted");
                        continue;
                    }
                    
					var clone = original.cloneNode(true);
					clone.removeAttribute('id');
					
					try{
                        
                        
						//console.log("items[item]['model_id'] = " + items[item]['model_id']);
						if(typeof items[item]['vendor'] != "undefined"){
							var icon_name = items[item]['vendor'].toString();
                            //console.log("vendor name: " + icon_name);
							if(icon_name.toLowerCase() == "ikea"){
								icon_name = "IKEA";
							}
							else if(icon_name.toLowerCase() == "ge"){
								icon_name = "GE";
							}
							else if(icon_name.toLowerCase().includes("xiaomi")){
								icon_name = "MI";
							}
							else if(icon_name.toLowerCase().includes("bitron")){
								icon_name = "Bitron";
							}
							else if(icon_name.toLowerCase().includes("tuya")){
								icon_name = "tuya";
							}
							else if(icon_name.toLowerCase().includes("yale")){
								icon_name = "Yale";
							}
							else if(icon_name.toLowerCase().includes("gledopto")){
								icon_name = "GLEDOPTO";
							}
							else if(icon_name.toLowerCase().includes("philips")){
								icon_name = "PHILIPS";
							}
							else if(icon_name.toLowerCase().includes("osram")){
								icon_name = "OSRAM";
							}
							else if(icon_name.toLowerCase().includes("lidl")){
								icon_name = "LIDL";
							}
							else if(icon_name.toLowerCase().includes("legrand")){
								icon_name = "legrand";
							}
							else if(icon_name.toLowerCase().includes("innr")){
								icon_name = "innr";
							}
							else if(icon_name.toLowerCase().includes("immax")){
								icon_name = "Immax";
							}
							else if(icon_name.toLowerCase().includes("hornbach")){
								icon_name = "HORNBACH";
							}
							else if(icon_name.toLowerCase().includes("smart") && icon_name.toLowerCase().includes("smart")){
								icon_name = "ECOSMART";
							}
							else if(icon_name.toLowerCase().includes("develco")){
								icon_name = "DEVELCO";
							}
							else if(icon_name.toLowerCase().includes("centralite")){
								icon_name = "Centralite";
							}
							else if(icon_name.toLowerCase().includes("aurora")){
								icon_name = "AURORA";
							}
							else{
                                //console.log("No nice icon for this brand yet");
								//icon_name = 'Unknown';
							}
						
							var s = document.createElement("div");
							s.textContent = icon_name;
							const class_name = 'extension-zigbee2mqtt-adapter-icon-' + icon_name.toLowerCase().replace(/ /g, '-');
							s.classList.add(class_name);                   
							clone.querySelectorAll('.extension-zigbee2mqtt-adapter-icon' )[0].appendChild(s);
						}

					}
					catch(err){
						if(this.debug){
							console.error("zigbee2mqtt debug: caught error adding icon: ", err);
						}
					}	
					
					
					try{	
						
                        
                        // Create big title + description link
						var a = document.createElement("a");
						//s.classList.add('extension-zigbee2mqtt-adapter-description'); 
						a.setAttribute("href", "/things/z2m-" + items[item]['zigbee_id']);
                        
                        // Add title if it could be found
                        try{
                            if( typeof this.title_lookup_table[ 'z2m-' + items[item]['zigbee_id'] ] != 'undefined' ){
                                var title_span = document.createElement("span");
                                title_span.classList.add('extension-zigbee2mqtt-adapter-item-title');
                            
                                var title_text = document.createTextNode(this.title_lookup_table[ 'z2m-' + items[item]['zigbee_id'] ]);
                                title_span.appendChild(title_text);
                                a.appendChild(title_span);
                            }
                            else{
                                //console.log("not in lookup table: ", items[item]['zigbee_id']);
                            }
                        }
                        catch(e){
                            //console.log("Error getting thing title: ", e);
                        }
                        
                        var desc_span = document.createElement("span");
                        desc_span.classList.add('extension-zigbee2mqtt-adapter-item-description');
                    
                        var desc_text = document.createTextNode( items[item]['description'] );
                        desc_span.appendChild(desc_text);
                        //clone.querySelectorAll('.extension-zigbee2mqtt-adapter-description' )[0].appendChild(title_span);
                        a.appendChild(desc_span);
                        
						                                           
						clone.querySelectorAll('.extension-zigbee2mqtt-adapter-description' )[0].appendChild(a);

                        
                        // Add MAC address link
						var s = document.createElement("a");
						//s.classList.add('extension-zigbee2mqtt-adapter-zigbee-id');  
						s.setAttribute("href", "/things/z2m-" + items[item]['zigbee_id']);              
						var t = document.createTextNode( items[item]['zigbee_id'] );
						s.appendChild(t);                                   
						clone.querySelectorAll('.extension-zigbee2mqtt-adapter-zigbee-id' )[0].appendChild(s);
						
                        // Add firmware version
						if(typeof items[item]['software_build_id'] != "undefined"){
							var s = document.createElement("span");
							//s.classList.add('extension-zigbee2mqtt-adapter-zigbee-id');             
							var t = document.createTextNode( "v. " +  items[item]['software_build_id'] );
							s.appendChild(t);                                   
							clone.querySelectorAll('.extension-zigbee2mqtt-adapter-version' )[0].appendChild(s);
						}

					}
					catch(err){
						if(this.debug){
							console.error("zigbee2MQTT debug: caught error handling Zigbee2MQTT device data: ", err);
						}
					}
						
					// Click on first firmware update button
					const show_update_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-item-update-button')[0];
					//console.log("show_update_button = ");
					//console.log(show_update_button);
					if(items[item]['update']['state'] == 'available'){
						show_update_button.disabled = false;
					}
					show_update_button.addEventListener('click', (event) => {
						//console.log("clicked on show update button. zigbee_id:" + items[item]['zigbee_id']);
						var target = event.currentTarget;
						var parent3 = target.parentElement.parentElement.parentElement;
						//console.log(parent3);
						parent3.classList.add("extension-zigbee2mqtt-adapter-update");
					});
					
					
					const read_about_risks_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-read-about-risks')[0];
					read_about_risks_button.addEventListener('click', (event) => {
						document.getElementById('extension-zigbee2mqtt-adapter-content').classList = ['extension-zigbee2mqtt-adapter-show-tab-tutorial'];
					});
					
					
					const cancel_update_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-overlay-cancel-update-button')[0];
					cancel_update_button.addEventListener('click', (event) => {
						//console.log("cancel update button has been clicked");
						var target = event.currentTarget;
						var parent3 = target.parentElement.parentElement.parentElement;
						parent3.classList.remove("extension-zigbee2mqtt-adapter-update");
					});
					
					
					
					
					
					// Click on start firmware update button
					const start_update_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-overlay-start-update-button')[0];
                    start_update_button.dataset.zigbee_id = items[item]['zigbee_id'];
					start_update_button.addEventListener('click', (event) => {
						//console.log("clicked on start update button. Event:", event);
						//console.log("- zigbee_id:" + items[item]['zigbee_id']);
                        //console.log("data attribute: ", event.target.dataset);
                        //console.log("data attribute: ", event.target.dataset.zigbee_id);
                        
						var target = event.currentTarget;
						var parent3 = target.parentElement.parentElement.parentElement;
						parent3.classList.remove("extension-zigbee2mqtt-adapter-update");
						parent3.classList.add("extension-zigbee2mqtt-adapter-updating");
						
						//setTimeout(() => hideBtn(0), 1000);
						
						//setTimeout(function(){ 
						//	parent3.classList.remove("updating");
						//}, 600000); // after 10 minutes, remove updating styling no matter what
						
						
						// Disable all update buttons if one has been clicked
						var update_buttons = document.getElementsByClassName("extension-zigbee2mqtt-adapter-item-update-button");
						for(var i = 0; i < update_buttons.length; i++){
							update_buttons[i].disabled = true;
						}
						this.flash_message("Please wait at least 10 minutes before you start another update");
						
						
						// Send update request to backend
						window.API.postJson(
							`/extensions/${this.id}/api/ajax`,
							{'action':'update-device','zigbee_id':event.target.dataset.zigbee_id}
						).then((body) => { 
                            if(this.debug){
							    //console.log("Update item reaction: ");
							    //console.log(body);
							    this.flash_message("update firmware response: " + body['update']);
                            }
							this.updating_firmware = true;

						}).catch((err) => {
							if(this.debug){
                                console.error("zigbee2mqtt debug: caught error while requesting update start: ", err);
                            }
						});
					
				  	});
					
					
					// Force-delete device from zigbee network feature. Unfinished, may just be confusing.
					// Add delete button click event
					const delete_button = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-item-delete-button')[0];
					delete_button.addEventListener('click', (event) => {
                        if(this.debug){
                            //console.log("delete button clicked");
                        }
                        if(confirm("Are you sure you want to remove this device?")){
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
    							if(this.debug){
                                    console.log("delete zigbee item reaction: ", body);
                                }
                                if(body['status'] == 'ok'){
                                    parent3.classList.add(".extension-zigbee2mqtt-adapter-hidden");
                                }
                                
    							//}

    						}).catch((err) => {
    							//console.log("zigbee2mqt error in delete items handler: " + e.toString());
    							if(this.debug){
                                    console.error("zigbee2mqt: caught error in delete items handler: ", err);
                                }
    						});
                        }
						
				  	});
					
					
                    // makes it easier to target each item in the list by giving it a unique class
                    clone.classList.add('extension-zigbee2mqtt-adapter-item-' + items[item]['zigbee_id']);
                    
                    // show firmware update status
                    if( typeof items[item]['update'] != 'undefined' ){
                        if(items[item]['update']['state'] == "updating"){
                            clone.classList.add('extension-zigbee2mqtt-adapter-updating');
                            const clone_progress_bar = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-update-progress-bar')[0];
                            clone_progress_bar.style.width = items[item]['update']['progress'] + "%";
                            const clone_progress_bar_percentage = clone.querySelectorAll('.extension-zigbee2mqtt-adapter-update-progress-bar-percentage')[0];
                            clone_progress_bar_percentage.innerText = items[item]['update']['progress'] + "%";
                            this.updating_firmware = true;
    					}
                    }
				
					list.append(clone);
				} // end of for loop
			
                if(list.innerHTML == ""){
                    list.innerHTML = '<div style="margin:10rem auto;padding:2rem;max-width:40rem;text-align:center; background-color:rgba(0,0,0,.1);border-radius:10px"><h2>No Zigbee devices paired yet</h2><p>Go to the Things page and click on the (+) button if you want to connect a new Zigbee device.</p></div>';
                }
                
                if(this.updating_firmware){
					// Disable all update buttons an update is in progress
					var update_buttons = document.getElementsByClassName("extension-zigbee2mqtt-adapter-item-update-button");
					for(var i = 0; i < update_buttons.length; i++)
					{
						update_buttons[i].disabled = true;
					}
                }
			
			}
			catch (err) {
				if(this.debug){
					console.error("zigbee2mqtt debug: caught error while generating items: ", err);
				}
			}
			

			
		}
        
        // Only updates the progressbar, but leaves the other items in the list as they are.
        update_progress_bar(items){
			const list = document.getElementById('extension-zigbee2mqtt-adapter-list');
			const original = document.getElementById('extension-zigbee2mqtt-adapter-original-item');
		
			if(typeof list == 'undefined'){
                //console.log("Error, Zigbee2MQTT main devices list was undefined");
			    return;
			}
	
			// Loop over all items
			for( var item in items ){
                if( typeof items[item]['update'] != 'undefined' ){
                    if( typeof items[item]['update']['state'] != 'undefined' ){
                        if(items[item]['update']['state'] == 'updating'){
                            const clone_progress_bar = list.querySelectorAll('.extension-zigbee2mqtt-adapter-item-' + items[item]['zigbee_id'] + " .extension-zigbee2mqtt-adapter-update-progress-bar")[0];
                            clone_progress_bar.style.width = items[item]['update']['progress'] + "%";
                            const clone_progress_bar_percentage = list.querySelectorAll('.extension-zigbee2mqtt-adapter-item-' + items[item]['zigbee_id'] + " .extension-zigbee2mqtt-adapter-update-progress-bar-percentage")[0];
                            clone_progress_bar_percentage.innerText = items[item]['update']['progress'] + "%";
    					}
                    }
                }  
            }
        }
		
		
		flash_message(message){
			if(typeof message == 'string' && message.length){
				let flash_message_el = document.getElementById('extension-candleappstore-flash-message-container');
				if(flash_message_el == null){
					flash_message_el = document.createElement('div');
					flash_message_el.setAttribute('id','extension-candleappstore-flash-message-container');
					document.body.appendChild(flash_message_el);
				}
				if(flash_message_el){
					flash_message_el.innerHTML = '<h3>' + message + '</h3>';
					setTimeout(() => {
						flash_message_el.innerHTML = '';
					},3000);
				}
				else{
					alert(message);
				}
			}
		}
        
        
	}

	new zigbee2mqtt();
	
})();
