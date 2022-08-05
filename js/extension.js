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

			fetch(`/extensions/${this.id}/views/content.html`)
	        .then((res) => res.text())
	        .then((text) => {
				//console.log("fetched html:");
				//console.log(text);
	         	this.content = text;
	  		 	  
                    if( document.location.href.endsWith("extensions/zigbee2mqtt-adapter") ){
					    //console.log(document.location.href);
	  		  		    this.show();
	  		  	    }
	        })
	        .catch((e) => console.error('Failed to fetch content:', e));
	    }



	  show() {
			//console.log("in show");
			//console.log("this.content:");
			//console.log(this.content);
			
            //console.log("this.debug: " + this.debug);
            
			try{
				clearInterval(window.zigbee2mqtt_interval);
			}
			catch(e){
				//console.log("no interval to clear?: " + e);
			}
            
            const main_view = document.getElementById('extension-zigbee2mqtt-adapter-view');
            
			//console.log("main view: ", main_view);
			if(this.content == ''){
				console.log("show: content was empty");
				//main_view.innerHTML = "<h1>Error loading, try reloading the page</h1>";

				return;
			}
            main_view.innerHTML = this.content;
            
            //console.log("main view: ", main_view);
            
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
			catch(e){
				console.log("Error calling API.getThings(): " + e);
                this.request_devices_list();
			}
            
            
			
			
			

			const list = document.getElementById('extension-zigbee2mqtt-adapter-list');
		
			const pre = document.getElementById('extension-zigbee2mqtt-adapter-response-data');
			
			
			



			// Attach click event to update map button
			document.getElementById('extension-zigbee2mqtt-adapter-update-map-button').addEventListener('click', (event) => {
				//console.log("clicked on update map button");
				document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = '<div class="extension-zigbee2mqtt-adapter-spinner"><div></div><div></div><div></div><div></div></div>';
				document.getElementById('extension-zigbee2mqtt-adapter-update-map-button').disabled = true;
				
				this.asked_for_map = true;
				//console.log("this.asked_for_map is now: " + this.asked_for_map);
				
		        window.API.postJson(
		         "/extensions/zigbee2mqtt-adapter/api/ajax",
					{"action":"update-map"}

		        ).then((body) => {
					if(this.debug){
                        console.log("update-map response: ", body);
                    }
					//document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = body.status;
				    
		        }).catch((e) => {
		  			console.log("Error sending update map request: ", e);
		        });
			});


            


            // Save new network security values
            document.getElementById('extension-zigbee2mqtt-adapter-save-security-button').addEventListener('click', (event) => {
                //console.log("save zigbee security button clicked");
                const new_pan_id = document.getElementById("extension-zigbee2mqtt-adapter-security-pan-id").value;
                const new_network_key = document.getElementById("extension-zigbee2mqtt-adapter-security-network-key").value;
                //console.log(new_pan_id,new_network_key);
                
                if(new_pan_id == "" || new_network_key == ""){
                    alert("security values cannot be empty");
                    return;
                }
                if( confirm("Are you sure you want to set these security values?") ){
                    
    		        window.API.postJson(
    		         "/extensions/zigbee2mqtt-adapter/api/ajax",
    					{"action":"save-security","pan_id":new_pan_id,"network_key":new_network_key}

    		        ).then((body) => {
                        //console.log("new values have been saved");
                        alert("The security values were saved");
    					//console.log(body);
    					//document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = body.status;

    		        }).catch((e) => {
    		  				//console.log("Error sending security values: " + e.toString());
    		        });
                    
                }
                
            });

            
            
            // Reinstall button
            document.getElementById('extension-zigbee2mqtt-adapter-reinstall-button').addEventListener('click', (event) => {
                //console.log("re-install button clicked");
                //console.log(new_pan_id,new_network_key);
                
                if( confirm("Are you absolutely sure you want to re-install Zigbee2MQTT? Only proceed if you understand the risks!") ){
                    
    		        window.API.postJson(
    		         "/extensions/zigbee2mqtt-adapter/api/ajax",
    					{"action":"re-install"}

    		        ).then((body) => {
                        document.getElementById('extension-zigbee2mqtt-adapter-content-container').innerHTML = '<h3 id="extension-zigbee2mqtt-adapter-title"><img id="extension-zigbee2mqtt-adapter-main-page-icon" src="/extensions/zigbee2mqtt-adapter/images/menu-icon.svg">Zigbee2MQTT</h3><br/><br/><h4 style="text-align:center">Please wait...</h4>';
                        
                        window.setTimeout(() => {
                            //console.log("refreshing page so that 'still installing' message is shown");
                            window.location.reload(false);
                        }, 40000);
                        
    		        }).catch((e) => {
    		  			//console.log("Error sending security values: " + e.toString());
    		        });
                    
                }
                
            });


            

            // Scan for USB stick button
            document.getElementById('extension-zigbee2mqtt-adapter-look-for-usb-stick-button').addEventListener('click', (event) => {
                //console.log("re-install button clicked");
                //console.log(new_pan_id,new_network_key);
                
                document.getElementById('extension-zigbee2mqtt-adapter-look-for-usb-stick-button').style.display = 'none';
                
                
		        window.API.postJson(
		         "/extensions/zigbee2mqtt-adapter/api/ajax",
					{"action":"look_for_usb_stick"}

		        ).then((body) => {
                    //console.log("look_for_usb_stick response: ", body);
                    if(body['state'] == true){
                        //console.log("USB stick was detected!");
                        document.getElementById('extension-zigbee2mqtt-adapter-serial-hint').style.display = 'none';
                        window.location.reload(false);
                    }
                    else{
                        document.getElementById('extension-zigbee2mqtt-adapter-look-for-usb-stick-button').style.display = 'inline-block';
                    }
                    
		        }).catch((e) => {
		  			console.log("Error is look_for_usb_stick request: " + e);
                    document.getElementById('extension-zigbee2mqtt-adapter-look-for-usb-stick-button').style.display = 'inline-block';
		        });
                
            });
            


		
		    //setTimeout(() => alert('Hello'), 1000);
			window.zigbee2mqtt_interval = setInterval( () => {
				if(this.debug){
                    //console.log("tick");
                }
				try{
					if( this.asked_for_map || this.updating_firmware || this.updating_z2m){
						if(this.debug){
                            //console.log("asked for map, firmware update, or updating z2m was true");
                        }
						
					  	window.API.postJson(`/extensions/${this.id}/api/ajax`,
						{"action":"poll"}
                        
					        ).then((body) => {
								if(this.debug){
                                    console.log("received poll response:");
								    console.log(body);
                                }
                                
								if(this.asked_for_map){
									if(body['map'] != this.previous_map_data && body['map'] != ""){
										this.previous_map_data = body['map'];
										//console.log("Received new map data!");
										//console.log(body['map']);
									
								      	// Generate the Visualization of the Graph into "svg".
								      	if(body['map'] != ""){
											const svg = Viz(body['map'], "svg");
									      	document.getElementById("extension-zigbee2mqtt-adapter-graphviz-container").innerHTML = svg;
								      	}
									
										// If we received the actual map, stop requesting the map data
										if(body['map'] != 'digraph G { "Breathe in" -> "Breathe out" "Breathe out" -> "Relax"}'){
											this.asked_for_map = false;
											pre.innerText = "";
											document.getElementById('extension-zigbee2mqtt-adapter-update-map-button').disabled = false;
										}else{
											//console.log("relax");
										}
									}
									else{
										//console.log("not ok response while getting items list");
										if(this.debug){
                                            pre.innerText = body['status'];
                                        }
									}
								}
								
                                // Check for progress on the firmware update
                                if(this.debug){
                                    //console.log("this.updating_firmware = " + this.updating_firmware);
                                }
								if(this.updating_firmware){
									if(body['updating_firmware'] == false){ // this occurs when Z2M sends a message to /bridge/response/device/ota_update/update, which signals a big change in the status of the firmware update progress. E,g, that it finished.
										
										if(body['update_result']['status'] == 'ok'){
											pre.innerText = "Firmware updated succesfully";
                                            //alert("Firmware was updated succesfully");
										}
										else if(body['update_result']['status'] == 'error'){
                                            alert("Firmware update failed! The error was: " + body['update_result']['error']);
											pre.innerText = "The firmware update failed: " + body['update_result']['error'];
										}
                                        else if(body['update_result']['status'] == 'idle'){
                                            pre.innerText = "";
                                        }
										
										this.updating_firmware = false;
                                        this.request_devices_list(); // also then regenerates the devices list so the update progress indicator is shown.
										
									}
									else if(body['updating_firmware'] == true){ // messages while updating
										//console.log("not ok response while getting items list");
                                        if(body['update_result']['status'] == 'error'){
										    if(this.debug){
                                                pre.innerText = body['update_result']['error']; // likely the message that an update is already in progress
                                            }
                                        }
                                        if(body['update_result']['status'] == 'idle'){
                                            if(this.debug){
                                                //console.log("update result status was still idle"); // this means the update is still in progress.
                                            }
                                        }
									}
                                    //this.request_devices_list(); // also then regenerates the devices list so the update progress indicator is shown.
                                    this.update_progress_bar(body['devices']);
								}
								
                                if(this.updating_z2m){
                                    //console.log("updating z2m?");
                                    
                                    if(body.installed && !body.started){
                                        //console.log("installed, but not started yet");
                                    }
                                    this.request_devices_list();
                                    if(body.started){
                                        //console.log("Z2M moved from installing to started");
                                        this.updating_z2m = false;
                                    }
                                    
                                }
                                

					        }).catch((e) => {
					  			//console.log("Error getting timer items: " + e.toString());
								//console.log("Error while waiting for map/firmware update: ", e);
								pre.innerText = "Connection error";
					        });	
					}
					else{
						//console.log("this.asked_for_map was not true");
						//pre.innerText = "Not waiting for map.";
					}
				}
				catch(e){
                    if(this.debug){
                        console.log("Zigbee2MQTT polling error: ", e);
                    }
                }
				
			}, 3000);
			

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
                    clearInterval(window.zigbee2mqtt_interval);
                    this.view.innerHTML = "";
                }
			}
            catch(e){
                console.log("Zigbee2mqtt addin: error in hide(): ", e);
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
				//console.log("Zigbee2MQTT: init response received: ", body);
				//console.log(body.devices);
                const list2 = document.getElementById('extension-zigbee2mqtt-adapter-list');
                //console.log("list2:",list2);
                
                if(body.installed == false){
                    //console.log("STILL INSTALLING");
			        this.updating_z2m = true;
                    
    				if(typeof list2 != 'undefined'){
                        list2.innerHTML = '<div style="margin:4rem auto;padding:2rem;max-width:40rem;text-align:center; background-color:rgba(0,0,0,.1);border-radius:10px"><h2>Still installing...</h2><br/><div class="extension-zigbee2mqtt-adapter-spinner"><div></div><div></div><div></div><div></div></div><br/><p>It takes about 30 minutes for Zigbee2MQTT to be fully downloaded and installed.</p><p>Come back a little later. If this message is gone, that means the intallation has finished.</p><p style="font-style:italic">Do not power-off or restart this controller until installation is complete!</p></div>';
    				    return;
    				}
                    else{
                        alert("The Zigbee2MQTT addon is still installing itself. Please wait about 30 minutes before rebooting the system.");
                    }
                }
                else if(body.serial == null){
                    document.getElementById('extension-zigbee2mqtt-adapter-serial-hint').style.display = 'block';
                }
                else if(body.usb_port_issue != false){
                    document.getElementById('extension-zigbee2mqtt-adapter-usb-port-issue-hint').style.display = 'block';
                }
                else if(body.started == false){
    				if(typeof list2 != 'undefined'){
                        list2.innerHTML = '<div style="margin:4rem auto;padding:2rem;max-width:40rem;text-align:center; background-color:rgba(0,0,0,.1);border-radius:10px"><h2>Zigbee2MQTT has not started (yet).</h2><br/><div class="extension-zigbee2mqtt-adapter-spinner"><div></div><div></div><div></div><div></div></div><br/><p>It may be that it is still starting up. If this message is still here after two minutes, then something is probably wrong. In that case, try rebooting your controller.</p><p>Also make sure no other Zigbee addons are running.</p></div>';
    				    return;
    				}
                }
                else{
                    if(typeof list2 != 'undefined'){
                        list2.innerHTML = "";
                        //console.log("installed and running, so will show zigbee devices list. Calling regenerate_items()");
                        this.regenerate_items(body.devices);
                    }
                    else{
                        //console.log("Zigbee2MQTT: the target element no longer exists. User has likely switched to another page.");
                    }
                }
                /*
                if(typeof body.serial != 'undefined'){
                    //console.log("body.serial was not undefined. It was: " + body.serial);
                    if(body.serial == null && body.installed == true){
                        console.log('no USB stick detected?');
                        
                    }
                }
                */
                
                if(typeof body.security != 'undefined'){
                    //console.log("security values were present in init data. pan_id: " + body.security.pan_id);
                    document.getElementById('extension-zigbee2mqtt-adapter-security-pan-id').value = body.security.pan_id;
                    document.getElementById('extension-zigbee2mqtt-adapter-security-network-key').value = body.security.network_key;
                }
				
				
                if(typeof body.debug != 'undefined'){
                    this.debug = body.debug;
                    if(body.debug){
                        document.getElementById('extension-zigbee2mqtt-adapter-debug-warning').style.display = 'block';
                    }
                }
                

	        }).catch((e) => {
	  			//console.log("Error sending init request: " + e.toString());
                if(document.getElementById('extension-zigbee2mqtt-adapter-content-container') != null){
                    document.getElementById('extension-zigbee2mqtt-adapter-content-container').innerHTML = '<div style="text-align:center"><h1>The Zigbee2Mqtt addon did not respond (yet)</h1><p>It might just be a temporary connection error. Try refreshing the page in a few seconds.</p></div>';
                }
                
				//document.getElementById('extension-zigbee2mqtt-adapter-response-data').innerText = "Error sending init request: " + e.toString();
	        });
		}
	
	
		//
		//  REGENERATE ITEMS
		//
	
		regenerate_items(items){
			try {
				//console.log("regenerating list");
				//console.log(items);
		
				const pre = document.getElementById('extension-zigbee2mqtt-adapter-response-data');
				const list = document.getElementById('extension-zigbee2mqtt-adapter-list');
				const original = document.getElementById('extension-zigbee2mqtt-adapter-original-item');
			
				if(typeof list == 'undefined'){
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
							var t = document.createTextNode( icon_name );
							icon_name = icon_name.toLowerCase().replace(/ /g, '-');
							const class_name = 'extension-zigbee2mqtt-adapter-icon-' + icon_name;
							
							s.appendChild(t);
							s.classList.add(class_name);                   
							clone.querySelectorAll('.extension-zigbee2mqtt-adapter-icon' )[0].appendChild(s);
						}

					}
					catch(e){
						//console.log("error adding icon: " + e);
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
					catch(e){
						//console.log("error handling Zigbee2MQTT device data: " + e);
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
						for(var i = 0; i < update_buttons.length; i++)
						{
							update_buttons[i].disabled = true;
						}
						//pre.innerText = "Please wait 10 minutes before you start another update!";
						
						
						// Send update request to backend
						window.API.postJson(
							`/extensions/${this.id}/api/ajax`,
							{'action':'update-device','zigbee_id':event.target.dataset.zigbee_id}
						).then((body) => { 
                            if(this.debug){
							    //console.log("Update item reaction: ");
							    //console.log(body);
							    pre.innerText = "update firmware response: " + body['update'];
                            }
							this.updating_firmware = true;

						}).catch((e) => {
							if(this.debug){
                                //console.log("zigbee2mqtt: postJson error while requesting update start");
                                pre.innerText = e.toString();
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
    							    //console.log(body); 
    							    //if( body['state'] != true ){
    							    //pre.innerText = body['message'];
                                }
                                if(body['status'] == 'ok'){
                                    parent3.classList.add(".extension-zigbee2mqtt-adapter-hidden");
                                }
                                
    							//}

    						}).catch((e) => {
    							//console.log("zigbee2mqt error in delete items handler: " + e.toString());
    							if(this.debug){
                                    pre.innerText = e.toString();
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
					//console.log("error creating reading list items: " + e); // pass exception object to error handler
				}
				*/
			
			}
			catch (e) {
				// statements to handle any exceptions
				//console.log("error while generating items: " + e); // pass exception object to error handler
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
        
        
	}

	new zigbee2mqtt();
	
})();
