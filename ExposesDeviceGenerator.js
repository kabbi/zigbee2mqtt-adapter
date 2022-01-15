/**
* ExposesDeviceGenerator.js - Generate devices using the Zigbee2MQTT
* Exposes API: https://www.zigbee2mqtt.io/information/exposes
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.*
*/

class ExposesDeviceGenerator {
	
	constructor(adapter, config) {
		
		this.adapter = adapter;
		this.config = config;
		
		// Zigbee2MQTT access bit to read a property via the published state of the object
		this.ACCESS_BIT_STATE = 1;
		// Zigbee2MQTT access bit to set a property via /SET
		this.ACCESS_BIT_SET = 2;
		// Zigbee2MQTT access bit to read a property via /GET
		this.ACCESS_BIT_GET = 4;
		
		// The Zigbee2MQTT access mask for which we are going to generate Actions instead of Properties
		this.ACCESS_MASK_ACTION = this.ACCESS_BIT_SET;
	}
	
	
    
    
	
	/**
	* Generate a WebThings device definition based on the provided
	* Zigbee2MQTT device definition, i.e. the Exposes API as described in
	* https://www.zigbee2mqtt.io/information/exposes
	*/
	
	generateDevice(info, zigbee_id) {
        try{
            if(info == null){
                console.log("Error, no exposes data (info was null)");
    			return;
            }
            
    		if (!info.supported || !info.definition || !info.definition.exposes) {
                console.log("Error, missing exposes data, cannot generate device: ", info);
    			return;
    		}
        
    		var device = new Object();
    		device['@type'] = [];
            device.zigbee_id = zigbee_id;
    		device.properties = new Object();
    		device.actions = new Object();
		
		
			if(this.config.debug){
				console.log(" ");
				console.log(" ");
				console.debug('Device', info.friendly_name, 'exposes', JSON.stringify(info.definition.exposes));
			}
			
			device.name = info.definition.description;
		
			//console.log(device);
		
			var property_names_list = this.pre_parse_device(info.definition.exposes,[]);
			if(this.config.debug){
				console.log("Exposes: generateDevice: property_names_list = ", property_names_list);
			}
            
            
            
            
			device = this.parse_device(info.definition.exposes, device, property_names_list);
		
			//console.log("= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = ");
			//console.log("device is now:");
			//console.log(device);
        }
        catch (error){
	  	    console.error("Error in generateDevice: " + error);
            console.debug('Device', info.friendly_name, 'exposes', JSON.stringify(info.definition.exposes));
        }
		
	    return device;
	}
    
    
	
	// Finds all the potential property names first, so that later manipulating logic can use that foresight. Returns a list of property names.
	pre_parse_device(exposes_info, property_names_list){
		try{
			for (var k in exposes_info)
			{
				if (typeof exposes_info[k] == "object" && exposes_info[k] !== null){
					if( typeof exposes_info[k]["access"] != "undefined" ){
						if(typeof exposes_info[k]['name'] != "undefined"){
							if( exposes_info[k]['name'] != "x" && exposes_info[k]['name'] != "y"){ // Skip the color fragments
								if( !(exposes_info[k]['name'] in property_names_list) ){
									property_names_list.push(exposes_info[k]['name'].toLowerCase()); // TODO: check if toLowerCase is a good idea. So far Z2M exposes names are all lowercaser already.
								}
							}
						}
					}
					property_names_list = this.pre_parse_device(exposes_info[k], property_names_list);
				
				}
			}
		}
		catch (error){
			console.log("Error in device pre-parsing: " + error)
		}
		
		return property_names_list;
	}
	
    
    
	// note: this method is recursive, it calls itself internallty to parse deeper complex structures
	parse_device(exposes_info, device, property_names_list){
		//console.log(" ");
		
        if(typeof device == 'undefined'){
            console.log("ERROR: ExposesGenerator: device was undefined in parse_device");
        }
        
        if(typeof device['@type'] == 'undefined'){
            console.log("ERROR: ExposesGenerator: device @TYPE was undefined in parse_device");
        }
        
        
        if(this.config.debug){
            console.log("+ + + + + + + + + + + + + parse_device + + + + + + + + + + + + + + + + + + + + + + + +");
	        console.log("exposes_info: ", exposes_info);
        }
		//console.log(device);
		try{
			
			if(typeof exposes_info['features'] != "undefined"){
				//console.log("features spotted");
			
				if(typeof exposes_info['type'] != "undefined"){
					//console.log("type also spotted. Type = " + exposes_info['type']);
					if(exposes_info['type'] == "composite"){
						//console.log("it's a composite");
						if(typeof exposes_info['property'] != "undefined"){
							if(exposes_info['property'] == "color"){
								if(this.config.debug){
									console.log("composite color property spotted. Will create extra color property");
								}
								device['@type'].push('ColorControl');
								const composite_expose = {
									'access':7,
									'property':'color',
									'description': exposes_info['description'],
									'name':'color',
									'type':'text'
								}
								//console.log(composite_expose);
								device = this.parse_property(composite_expose, device, property_names_list);

							}
							/*
							else{
								// This will attemps to expose each fragment as a property.
								// Improve human-readable name
								for(var fragment in exposes_info){
									if(typeof exposes_info[fragment]["name"] != "undefined"){
										exposes_info[fragment]["name"] = exposes_info['property'] + " " + exposes_info[fragment]["name"];
									}
							
								}
							}
							*/

						}
					}
					else if(exposes_info['type'] == "light"){
						if(this.config.debug){
							console.log("it's a lamp");
						}
						device['@type'].push('Light');
					}
					else if(exposes_info['type'] == "switch"){
						if(this.config.debug){
							console.log("it's a switch");
						}
						device['@type'].push('OnOffSwitch');
					}
					else if(exposes_info['type'] == "lock"){
						if(this.config.debug){
							console.log("it's a lock");
						}
						device['@type'].push('Lock');
					}
					else if(exposes_info['type'] == "climate"){
						if(this.config.debug){
							console.log("it's a thermostat");
						}
						device['@type'].push('Thermostat');
					}
				
				
				}
			}
		
        
		}
		catch (error){
			console.log("Error in first part of parse_device: " + error);
		}
        
        
        
        try{
			for (var k in exposes_info){
                //console.log("__________");
                //console.log("k = ", k, exposes_info[k]);
                
				if (typeof exposes_info[k] == "object" && exposes_info[k] !== null){
                    
                    // If we spot an access property at this level, then we are at the level of useful property data.
					if( typeof exposes_info[k]["access"] != "undefined" ){
                        //console.log("access data spotted at current level");
						if(typeof exposes_info[k]['name'] != "undefined"){
							if( exposes_info[k]['name'] != "x" && exposes_info[k]['name'] != "y" && exposes_info[k]['name'] != "Action group" && exposes_info[k]['name'] != "Action rate"){ // Skip the color fragments
								device = this.parse_property(exposes_info[k], device, property_names_list);
                            }
                            else{
                                console.log("skipping an exposed property: " + exposes_info[k]['name'] );
                            }
						}
                        else{
                            //console.log("Weird, at useful property level, but name of property was not defined");
                        }
					}
					//else if(k != "values"){
                    else { //if(typeof exposes_info[k]["access"] == "object"){
                    	console.log(".. diving deeper ..:", exposes_info[k]);
                        //console.log(".. .. .. .. .. .. ..");
						device = this.parse_device(exposes_info[k], device, property_names_list);
					}
					
				} // end of object check
                else{
                    //console.log("WEIRD in exposes generator: exposes_info[k] was not object?:", exposes_info[k]);
                    //console.log("..");
                }
			} // end of for loop
			
		}
		catch (error){
			console.log("Error in second part of parse_device: " + error);
		}
        
		console.log(".");
        console.log("final device: ", device);
        console.log(".");
        console.log(".");
        console.log(".");
        
		return device;
	}
	
	
    
    
    
	
	parse_property(expose, device, property_names_list){
		if(this.config.debug){
            console.log("+ (parse_property)");
        }
        /*
        if(typeof expose['name'] != "undefined"){
            if( expose['name'] == 'Action group' || expose['name'] == 'Action rate'){
                console.log("");
                return device;
            }
        }
        */
        
        try{
    		if(typeof expose['type'] != "undefined"){
			
    			// Decide between float and integer
    			if(expose['type'] == "numeric"){
    				/*
    				if(typeof expose["value_max"] != "undefined"){
    					if(expose["value_max"] != 255 && expose["value_max"] != 254 && expose["value_max"] != 100){
    						expose.type = "float";
    					}
    				}
    				*/
    				if(typeof expose["value_step"] != "undefined"){
    					if( expose["value_step"] != 1){
    						expose.type = "float";
    					}
    				}
    				if(typeof expose["name"] != "undefined"){
    					if( expose["name"] == "local_temperature"){
    						expose.type = "float";
    					}
						
    				}
				
    			}
			
    			switch (expose.type) {
    				// Generic type binary
    				case 'binary':
        				if (expose.access === this.ACCESS_MASK_ACTION) {
        					device.actions[expose.property] = this.binaryPropertyToBooleanAction(expose);
        				} else {
        					device.properties[expose.property] = this.binaryPropertyToBooleanProperty(expose);
        				}
        				break;
			
				
    				// Generic type numeric - integer variant
    				case 'numeric':
        				if (expose.access === this.ACCESS_MASK_ACTION) {
        					device.actions[expose.property] = this.numericPropertyToIntegerAction(expose);
        				} else {
        					device.properties[expose.property] = this.numericPropertyToIntegerProperty(expose);
        				}
        				break;
				
				
    				case 'float':
        				if (expose.access === this.ACCESS_MASK_ACTION) {
        					device.actions[expose.property] = this.numericPropertyToFloatAction(expose);
        				} else {
        					device.properties[expose.property] = this.numericPropertyToFloatProperty(expose);
        				}
        				break;
			
			
    				// Generic type enum
    				case 'enum':					
        				if (expose.access === this.ACCESS_MASK_ACTION) {
        					device.actions[expose.property] = this.enumPropertyToStringAction(expose);
        				} else {
        					device.properties[expose.property] = this.enumPropertyToStringProperty(expose);
        				}
        				break;
			
			
    				// Generic type text
    				case 'text':
        				if (expose.access === this.ACCESS_MASK_ACTION) {
        					device.actions[expose.property] = this.textPropertyToStringAction(expose);
        				} else {
        					device.properties[expose.property] = this.textPropertyToStringProperty(expose);
        				}
        				break;
			
    			}
			
                
                // Add initial value if available (artificially added for properties derived from actions, using the value from devices_overview)
                // TODO wait, no, this doesn't set the initial value. the set_value on the eventual property still has to be called.
                if(typeof expose['value'] != "undefined"){
                    
                    if(this.config.debug){
                        console.log("there was value in the expose data, adding it to property: " + expose['value']);
                    }
                    device.properties[expose.property]['value'] = expose['value'];
                    
                }
                
                if(typeof expose['property'] != "undefined"){
                    console.log("expose['property']: " + expose['property']);
                    device.properties[expose.property]['property'] = expose['property'];
                }
                
                
                // Add unit if available
                if(typeof expose['unit'] != "undefined"){
                    device.properties[expose.property]['unit'] = expose['unit'];
                    
                    if( expose['unit'] == 'mV' || expose['unit'] == 'lqi'){
                        //console.log("spotted lqi");
                        //device.properties[expose.property]['unit'] = 'volt';
                        device.properties[expose.property]['multipleOf'] = 1;
                        //device.properties[expose.property]['value'] = expose['value'] / 1000;
                    }
                    else if( expose['unit'] == '°C' ){
                        device.properties[expose.property]['unit'] = 'degree celsius';
                        device.properties[expose.property]['multipleOf'] = 0.1;
                    }
                    else if( expose['unit'] == 'V' ){
                        device.properties[expose.property]['unit'] = 'volt';
                        device.properties[expose.property]['multipleOf'] = 0.1;
                        
                    }
                    else if( expose['unit'] == 'A' ){
                        device.properties[expose.property]['unit'] = 'ampere';
                        device.properties[expose.property]['multipleOf'] = 0.01;
                        
                    }
                    else if( expose['unit'] == '%' ){
                        device.properties[expose.property]['unit'] = 'percent';
                        device.properties[expose.property]['multipleOf'] = 1;
                        
                    }
                        
                }
                
                if( expose['name'] == 'humidity' ){
                    device.properties[expose.property]['unit'] = 'percent';
                    device.properties[expose.property]['multipleOf'] = 0.1;
                }
                
                
                
                
                
            
                // add capabilities information
    			if(typeof expose['name'] != "undefined"){
                    console.log("expose.name = " + expose.name);
                    
                    try{
        				if( expose.name.endsWith("state") ){
        					//console.log("expose.name ends with state, so adding onOfProperty @type");
                            //console.log("device['@type'] = ", device['@type']);
                            //console.log( device['@type'].indexOf('Lock') );
        					if(device['@type'].includes("Lock")){
                                //console.log("IS LOCK");
                                if(expose.access == 1){
            						device.properties[expose.property]['@type'] = 'LockedProperty'; // read-only
            					}else{
                                    //console.log("IS ACTIONABLE LOCK");
            						device.properties[expose.property]['@type'] = 'OnOffProperty';
                                    /*
                                    // Experiment to add actions to a lock, as the spec prefers. However, actions are (currently) not compatible with Voco voice control, so I abandoned this for now. Also had trouble receiving the action.
                                    try{
                                        // Add actions for the lock
                                		var lock_action = new Object();
                                		lock_action.title = 'Lock now';
                                		lock_action.description = 'Lock the locking mechanism';
                                		//lock_action.input = this.binaryPropertyToBooleanProperty(binary);
                                        lock_action.input = 'ON';
                                        lock_action['@type'] = 'LockAction';
                                        //lock_action.expose = expose.name;
                                		device.actions[expose.name + '-lock'] = lock_action;
                            
                                		var unlock_action = new Object();
                                		unlock_action.title = 'Unlock now';
                                		unlock_action.description = 'Unlock the locking mechanism';
                                        unlock_action.input = 'OFF';
                                		//unlock_action.input = this.binaryPropertyToBooleanProperty(binary);
                                        unlock_action['@type'] = 'UnlockAction';
                                        //unlock_action.expose = expose.name;
                                		device.actions[expose.name + '-unlock'] = unlock_action;
                                    }
                                    catch(e){
                                        console.log(e);
                                    }
                                    */
                            
                                    //console.log("device.actions:", device.actions);
                            
                            
                                    /*
                                    this.add_action('lock', {
                                        '@type': 'LockAction',
                                        'title': 'Lock',
                                        'description': 'Lock the locking mechanism',
                                    })
                                    this.add_action('unlock', {
                                        '@type': 'UnlockAction',
                                        'title': 'Unlock',
                                        'description': 'Unlock the locking mechanism',
                                    })
                                    */
                            
            					}
                            }
                            else{
                                //console.log("IS NOT LOCK");
                                if(expose.access == 1){
            						device.properties[expose.property]['@type'] = 'PushedProperty';
            					}else{
            						device.properties[expose.property]['@type'] = 'OnOffProperty';
            					}
                            }

        				}
        				else if(expose.name.endsWith("brightness") ){
        					device.properties[expose.property]['@type'] = 'BrightnessProperty';
        				}
        				else if(expose.name == "cube_side" || expose.name == "angle" || expose.name == "illuminance_lux"){
        					device.properties[expose.property]['@type'] = 'LevelProperty';
        					if(device['@type'].indexOf("MultiLevelSensor") == -1){
        						device['@type'].push('MultiLevelSensor');
        					}
        				}
        				else if(expose.name == "color_temp"){
        					device.properties[expose.property]['@type'] = 'ColorTemperatureProperty';
        					if(device['@type'].indexOf("Light") == -1){ // && device['@type'].length == 0
        						device['@type'].push('Light');
        					}
        				}
        				else if(expose.name == "color_xy" || expose.name == "color_hs"){
        					device.properties[expose.property]['@type'] = 'ColorProperty';
        					if(device['@type'].indexOf("Light") == -1){
        						device['@type'].push('Light');
        					}
        				}
        				else if(expose.name == "occupied_heating_setpoint" || expose.name == "occupied_cooling_setpoint" || expose.name == "comfort_temperature" || expose.name == "eco_temperature"){
        					device.properties[expose.property]['@type'] = 'TargetTemperatureProperty';
        					if(device['@type'].indexOf("Thermostat") == -1){
        						device['@type'].push('Thermostat');
        					}
        				}
        				else if(expose.name == "local_temperature" || expose.name == "temperature" || expose.name == "cpu_temperature"){
        					device.properties[expose.property]['@type'] = 'TemperatureProperty';
        					if(device['@type'].indexOf("TemperatureSensor") == -1){
        						device['@type'].push('TemperatureSensor');
        					}
        				}
        				else if(expose.name == "humidity" || expose.name == "soil_moisture"){
        					device.properties[expose.property]['@type'] = 'HumidityProperty';
        					if(device['@type'].indexOf("HumiditySensor") == -1){
        						device['@type'].push('HumiditySensor');
        					}
        				}
        				else if(expose.name == "pressure"){
        					device.properties[expose.property]['@type'] = 'BarometricPressureProperty';
        					if(device['@type'].indexOf("BarometricPressureSensor") == -1){
        						device['@type'].push('BarometricPressureSensor');
        					}
        				}
        				else if(expose.name == "presence" || expose.name == "occupancy" || expose.name == "vibration"){
        					device.properties[expose.property]['@type'] = 'MotionProperty';
        					if(device['@type'].indexOf("MotionSensor") == -1){
        						device['@type'].push('MotionSensor');
                                //device['@type'] = ['MotionSensor'];
        					}
        				}
        				else if( expose.name == "contact"){
        					device.properties[expose.property]['@type'] = 'OpenProperty';
        					if(device['@type'].indexOf("DoorSensor") == -1){ // && device['@type'].length == 0){
        						device['@type'].push('DoorSensor');
        					}
        				}
        				else if(expose.name == "alarm" || expose.name == "sos" || expose.name == "carbon_monoxide" || expose.name == "gas"){
        					device.properties[expose.property]['@type'] = 'AlarmProperty';
        					if(device['@type'].indexOf("Alarm") == -1){
        						device['@type'].push('Alarm');
        					}
        				}
                        /*
        				else if(expose.name == "lock"){
        					device.properties[expose.property]['@type'] = 'LockedProperty';
        					if(device['@type'].indexOf("Lock") == -1){
        						device['@type'].push('Lock');
        					}
        				}
                        */
        				else if(expose.name == "smoke"){
        					device.properties[expose.property]['@type'] = 'SmokeProperty';
        					if(device['@type'].indexOf("SmokeSensor") == -1){
        						device['@type'].push('SmokeSensor');
        					}
        				}
        				else if(expose.name == "switch"){
        					device.properties[expose.property]['@type'] = 'BooleanProperty';
        					if(device['@type'].indexOf("BinarySensor") == -1){
        						device['@type'].push('BinarySensor');
        					}
        				}
        				else if(expose.name == "water_leak"){
        					device.properties[expose.property]['@type'] = 'LeakProperty';
        					if(device['@type'].indexOf("LeakSensor") == -1){
        						device['@type'].push('LeakSensor');
        					}
        				}
        				else if(expose.name == "power"){
        					device.properties[expose.property]['@type'] = 'InstantaneousPowerProperty';
        					if(device['@type'].indexOf("EnergyMonitor") == -1){
        						device['@type'].push('EnergyMonitor');
        					}
        				}
        				else if(expose.name == "voltage"){
        					device.properties[expose.property]['@type'] = 'VoltageProperty';
        					if(device['@type'].indexOf("EnergyMonitor") == -1){
        						device['@type'].push('EnergyMonitor');
        					}
        				}
        				else if(expose.name == "current"){
        					device.properties[expose.property]['@type'] = 'CurrentProperty';
        					if(device['@type'].indexOf("EnergyMonitor") == -1){
        						device['@type'].push('EnergyMonitor');
        					}
        				}
        				else if(expose.name == "co2" || expose.name == "eco2" || expose.name == "voc"){
        					device.properties[expose.property]['@type'] = 'ConcentrationProperty';
        					if(device['@type'].indexOf("AirQualitySensor") == -1){
        						device['@type'].push('AirQualitySensor');
        					}
        				}
        				else if(expose.name == "pm10" || expose.name == "pm25" || expose.name == "hcho"){
        					device.properties[expose.property]['@type'] = 'DensityProperty';
        					if(device['@type'].indexOf("AirQualitySensor") == -1){
        						device['@type'].push('AirQualitySensor');
        					}
        				}
                    }
                    catch(e){
                        console.log("error in parse_device while trying to add capabilities: ", e);
                    }
    			}
			
			
    			// Capability upgrade based on the value_on property. // TODO: superfluous? When did this happen?
    			/*
                if(typeof expose['value_on'] != "undefined"){
                    if(this.config.debug){
                        console.log("value_on was defined: " + expose['value_on']);
                    }
    				if( expose['value_on'] == "LOCK" || expose['value_on'] == "UNLOCK"){
    					device.properties[expose.property]['@type'] = 'LockedProperty'; 
    				}	
    			}
                */
			
                /*
                if( expose.name == "contact" ){
                    console.log(">");
                    console.log("->");
                    console.log("--> contact");
                    if(typeof device.properties[expose.property] != 'undefined'){
                        console.log("--->", device.properties[expose.property]);
                        if(typeof device.properties[expose.property]['value_off'] != 'undefined' && typeof device.properties[expose.property]['value_on'] != 'undefined'){
                            console.log("----> FLIPPING?");
                            //const old_off = device.properties[expose.property]['value_off'];
                            //device.properties[expose.property]['value_off'] = device.properties[expose.property]['value_on'];
                            //device.properties[expose.property]['value_on'] = old_off;
                    
                        }
                    }
                }
                */
            
            
            
    			//
                //  ADD EXTRA GENERATED PROPERTIES BASED ON READ-ONLY ACTIONS
                //
            
    			// Check if an extra boolean property could be generated from the enum values.
    			if(expose['type'] == "enum" && expose.access == 1){ // For now, only read-only enum properties (access type 1) with 'on' and 'off' in them will get an extra OnOffProperty
    				//var already_added_extra_state = false; // to avoid adding both an extra toggle and an extra power_state property
                    
                    
                    var add_push_button = false;
                    var add_brightness = false;
                    
                    // Has brightness up, but not brightness down? This seems too indicate a push button, at least for IKEA.
                    if(expose.values.indexOf('brightness_move_up') !== -1 && expose.values.indexOf('brightness_move_down') === -1){
                        add_push_button = true;
                        
                        if(this.config.debug){
                            console.log("exposesDeviceGenerator spotted a brightness_stop in an action property enum list, and no pre-existing brightness property");
                        }
                        var fake_exposes_info = {'access': 1, 
                                                    'name':'pushed',
                                                    'property':'pushed',
                                                    'description': 'momentary push button (generated from actions data)',
                                                    'type': 'binary',
                                                    'value_off': false, 
                                                    'value_on': true
                                                    };
                    
                         // This should always be false:
                        fake_exposes_info['value'] = this.adapter.handle_persistent_value(device.zigbee_id,expose.values[i].toLowerCase(),false,true,false); // zigbee_id, property_name, value, read-only, percentage
                                        
                        property_names_list.push('pushed');
                        device = this.parse_property(fake_exposes_info, device, property_names_list);
    
                        // add capability if there isn't one already
                        if( device['@type'].indexOf('PushButton') == -1){ // In this case it's unfortunate that the WebThings Gateway can only handle one capability per type.
                            device['@type'].push('PushButton');
                        }
                        device.properties['pushed']['@type'] = 'PushedProperty';
                        device.properties['pushed'].origin = "exposes-generated-from-action";
                    }
                    else if(  (expose.values.indexOf('brightness_step_up') !== -1 || expose.values.indexOf('brightness_move_up') !== -1) && (expose.values.indexOf('brightness_step_down') !== -1 || expose.values.indexOf('brightness_move_down') !== -1) && expose.values.indexOf('brightness_stop') !== -1){
                        add_brightness == true;
                    }
                    
                    
                    
                    
                    
                    
                    
                    if( property_names_list.indexOf('toggle') == -1 && property_names_list.indexOf('state') == -1 ){
    					var on_off_count = 0;
    					for (var i = 0; i < expose.values.length; i++) {
    					    if( expose.values[i].toLowerCase() == "on" || expose.values[i].toLowerCase() == "off"){
    					    	on_off_count++;
    					    }
    					}
    					if(on_off_count == 2){
                            if(this.config.debug){
                                console.log("exposesDeviceGenerator spotted a on and off combo in an action property enum list, and no pre-existing toggle property");
                            }
    						var fake_exposes_info = {
    							'access':1,
    							'property':'toggle',
    							'description': 'extra read-only on-off property (generated from actions data)',
    							'type':'binary',
                                'value_on':'on',
                                'value_off':'off',
    						}
                        
                            if( add_push_button == true){
                                fake_exposes_info['name'] == 'pushed';
                                fake_exposes_info['property'] == 'pushed';
                            }
                            else{
                                fake_exposes_info['name'] == 'toggle';
                                fake_exposes_info['property'] == 'toggle';
                            }
                        

                            const initial_value = this.adapter.handle_persistent_value(device.zigbee_id,'toggle',false,true,false); // zigbee_id, property_name, value, read-only, percentage
                            if(initial_value != null){
                                fake_exposes_info['value'] = initial_value;
                            }
                        
                        
    						//if(expose.access == 1){
    						//device['@type'].push('PushButton'); // for read-only binary properties
    						//}
    						//else{
    						//	device['@type'].push('OnOffSwitch');
    						//}
                        
    						property_names_list.push('toggle'); // Remember that a state property now does exist, so as not to generate even more.
    						device = this.parse_property(fake_exposes_info, device, property_names_list); // Create extra OnOffProperty
                            // add capability if there isn't one already
                            if( device['@type'].indexOf('BinarySensor') == -1){
                                device['@type'].push('BinarySensor');
                                device.properties['toggle']['@type'] = 'BooleanProperty';
                                
                            }
                            device.properties['toggle'].origin = "exposes-generated-from-action";
                            //already_added_extra_state = true;
    					}
    				} // End of property_names_list check


    				for (var i = 0; i < expose.values.length; i++) {
    				    try{
                            if( expose.values[i].toLowerCase() == "toggle" && property_names_list.indexOf('toggle') == -1 && property_names_list.indexOf('state') == -1){
                                if(this.config.debug){
                                    console.log("exposesDeviceGenerator spotted a toggle in an action property enum list, and no pre-existing toggle property");
                                }
                                var fake_exposes_info = {'access': 1, 
                                                            'name':'toggle',
                                                            'property':'toggle',
                                                            'description': 'extra read-only toggle property (generated from actions data)',
                                                            'type': 'binary', 
                                                            'value_off': false, 
                                                            'value_on': true
                                                            };

                                const initial_value = this.adapter.handle_persistent_value(device.zigbee_id,'toggle',false,true,false); // zigbee_id, property_name, value, read-only, percentage
                                if(initial_value != null){
                                    fake_exposes_info['value'] = initial_value;
                                }
                        
                                property_names_list.push('toggle');
                        
                                device = this.parse_property(fake_exposes_info, device, property_names_list);
                        
                                // add capability if there isn't one already
                                if( device['@type'].indexOf('BinarySensor') == -1){
                                    device['@type'].push('BinarySensor');
                                    device.properties['toggle']['@type'] = 'BooleanProperty';
                                }
        				    }
                            else if( expose.values[i].toLowerCase() == "brightness_stop" && property_names_list.indexOf('brightness') == -1){
                                if(this.config.debug){
                                    console.log("exposesDeviceGenerator spotted a brightness_stop in an action property enum list, and no pre-existing brightness property");
                                }
                                var fake_exposes_info = {'access': 1, 
                                                            'name':'brightness',
                                                            'property':'brightness',
                                                            'description': 'read-only brightness property (generated from actions data)',
                                                            'type': 'numeric', 
                                                            'value_max': 100, 
                                                            'value_min': 0,
                                                            'value_step':1
                                                            };
                                                    
                                const initial_value = this.adapter.handle_persistent_value(device.zigbee_id,'brightness',0,true,true); // zigbee_id, property_name, value, read-only, percentage
                                if(initial_value != null){
                                    fake_exposes_info['value'] = initial_value;
                                }
                                                    
                                property_names_list.push('brightness');
                                device = this.parse_property(fake_exposes_info, device, property_names_list);
                
                                // add capability if there isn't one already
                                if( device['@type'].indexOf('MultiLevelSensor') == -1){
                                    device['@type'].push('MultiLevelSensor');
                                    device.properties['brightness']['@type'] = 'LevelProperty';
                                }
                                device.properties['toggle'].origin = "exposes-generated-from-action";
        				    }
                            
                            else if( expose.values[i].toLowerCase() == "arrow_right_click" || expose.values[i].toLowerCase() == "arrow_left_click"){
                                if(this.config.debug){
                                    console.log("exposesDeviceGenerator spotted a brightness_stop in an action property enum list, and no pre-existing brightness property");
                                }
                                var fake_exposes_info = {'access': 1, 
                                                            'name':expose.values[i].toLowerCase(),
                                                            'property':expose.values[i].toLowerCase(),
                                                            'description': 'momentary push button (generated from actions data)',
                                                            'type': 'binary',
                                                            'value_off': false, 
                                                            'value_on': true
                                                            };
                                
                                 // This should always be false:
                                fake_exposes_info['value'] = this.adapter.handle_persistent_value(device.zigbee_id,expose.values[i].toLowerCase(),false,true,false); // zigbee_id, property_name, value, read-only, percentage
                                /*
                                const initial_value = this.adapter.handle_persistent_value(device.zigbee_id,'brightness',false,true,false); // zigbee_id, property_name, value, read-only, percentage
                                if(initial_value != null){
                                    fake_exposes_info['value'] = initial_value;
                                }
                                */
                                                    
                                property_names_list.push(expose.values[i].toLowerCase());
                                device = this.parse_property(fake_exposes_info, device, property_names_list);
                
                                // add capability if there isn't one already
                                if( device['@type'].indexOf('PushButton') == -1){ // In this case it's unfortunate that the WebThings Gateway can only handle one capability per type.
                                    device['@type'].push('PushButton');
                                }
                                device.properties[expose.values[i].toLowerCase()]['@type'] = 'PushedProperty';
                                device.properties['toggle'].origin = "exposes-generated-from-action";
        				    }
                            
                        }
                        catch(e){
                            console.log("error in parse_device while looping in actions enum: ", e);
                        }
                        
                        
    				}
				
    			}
			
			
    		}
    		else{
    			console.log("Weird, expose['type'] did not exist");
    		}
        }
        catch(e){
            console.log("error in parse_device: ", e);
        }
		
		return device;
	}
	
	

	
    

	
    
    
	/**
	* Transforms a Zigbee2MQTT binary property into a WebThings Property object of type boolean.
	*/
	binaryPropertyToBooleanProperty(binary) {
        if(this.config.debug){
            console.log("binaryPropertyToBooleanProperty binary: ",binary);
            //console.log("binary.value_on = ", binary.value_on);
        }
        
        if(typeof binary.value_on == 'undefined'){
            console.log("Warning, ExposesGenerator: binary.value_on was undefined in binaryPropertyToBooleanProperty");
            binary.value_on = true;
            binary.value_off = false;
        }
        //else if(binary.name == 'contact'){
            //console.log("----> switching contact around. Before value_off;", binary.value_off);
            //const old_off = binary.value_off;
            //binary.value_off = binary.value_on;
            //binary.value_on = old_off;
            //console.log("------> ", binary.value_off);
        //}
        
		const property = new Object();
		property.type = 'boolean';
		property.title = this.applySentenceCase(binary.name); // attempt to avoid the `on/off` property title
		property.description = binary.description;
		property.readOnly = this.accessToReadOnly(binary.access);
        property.property = binary.property;
        /*
        if(binary.name == 'contact'){
            console.log("----> switching contact fromMqtt and toMqtt around2.");
		    property.fromMqtt = (v) => v === false;//binary.value_off;
		    property.toMqtt = (v) => (v ? false : true);
        }
        else{
		    property.fromMqtt = (v) => v === binary.value_on;
		    property.toMqtt = (v) => (v ? binary.value_on : binary.value_off);
        }
        */
	    property.fromMqtt = (v) => v === binary.value_on;
	    property.toMqtt = (v) => (v ? binary.value_on : binary.value_off);
		return property;
	}
	
	/**
	* Transforms a Zigbee2MQTT numeric property into a WebThings Property object of type integer.
	*/
	numericPropertyToIntegerProperty(numeric) {
		const property = new Object();
		property.type = 'integer';
		property.title = this.applySentenceCase(numeric.name);
		property.description = numeric.description;
		property.readOnly = this.accessToReadOnly(numeric.access);
        property.property = numeric.property;
		
		if(numeric.name == 'brightness'){
			if(typeof numeric.value_max != 'undefined'){
				property.unit = "%";
				property.origin = "exposes-scaled-percentage";
				property.origin_maximum = numeric.value_max;
				property.maximum = 100;
			}
		}
		else{
			property.unit = numeric.unit;
			property.origin = "exposes";
			property.maximum = numeric.value_max;
		}
		
		property.minimum = numeric.value_min;
		//property.unit = numeric.unit;
		property.multipleOf = 1;
		return property;
	}
	
	/**
	* Transforms a Zigbee2MQTT numeric property into a WebThings Property object of type float.
	*/
	numericPropertyToFloatProperty(numeric) {
		const property = new Object();
		property.type = 'number';
		property.title = this.applySentenceCase(numeric.name); // attempt to modify the name of the property
		property.description = numeric.description;
		property.readOnly = this.accessToReadOnly(numeric.access);
		if(!property.readOnly && typeof numeric.value_step == "undefined"){ // if this a variable the user can set, limit it to 2 decimals (otherwise default in gateway is 3).
			numeric.value_step = 0.01;
		}
		property.minimum = numeric.value_min;
		property.maximum = numeric.value_max;
		property.unit = numeric.unit;
		property.multipleOf = numeric.value_step;
        property.property = numeric.property;
		return property;
	}
	
	/**
	* Transforms a Zigbee2MQTT enum property into a WebThings Property object of type integer.
	*/
	enumPropertyToStringProperty(enumeration) {
		const property = new Object();
		property.type = 'string';
		property.title = this.applySentenceCase(enumeration.name);
		property.description = enumeration.description;
		property.readOnly = this.accessToReadOnly(enumeration.access);
		property.enum = enumeration.values;
        property.property = enumeration.property;
		//console.log("typeof enumeration.values = " + typeof enumeration.values);
		//console.log(enumeration.values);
		return property;
	}
	
	/**
	* Transforms a Zigbee2MQTT text property into a WebThings Property object of type string.
	*/
	textPropertyToStringProperty(text) {
		const property = new Object();
		property.type = 'string';
		property.title = this.applySentenceCase(text.name);
		property.description = text.description;
        property.property = text.property;
		return property;
	}
	
	/**
	* Transforms a Zigbee2MQTT binary property, which you can only set but not get, into a WebThings
	* Action with a input of of type boolean.
	*/
	binaryPropertyToBooleanAction(binary) {
		const action = new Object();
		action.title = this.applySentenceCase(binary.name);
		action.description = binary.description;
		action.input = this.binaryPropertyToBooleanProperty(binary);
        action.property = binary.property;
		return action;
	}
	
	/**
	* Transforms a Zigbee2MQTT binary property, which you can only set but not get, into a WebThings
	* Action with a input of of type boolean.
	*/
	binaryPropertyToLockAction(binary) {
		const action = new Object();
		action.title = this.applySentenceCase(binary.name);
		action.description = binary.description;
		action.input = this.binaryPropertyToBooleanProperty(binary);
        action.property = binary.property;
        action['@type'] = 'LockAction';
		return action;
	}
    
	/**
	* Transforms a Zigbee2MQTT enum property, which you can only set but not get, into a WebThings
	* Action with a input of of type string.
	*/
	enumPropertyToStringAction(enumeration) {
		const action = new Object();
		action.title = this.applySentenceCase(enumeration.name);
		action.description = enumeration.description;
		action.input = this.enumPropertyToStringProperty(enumeration);
        action.property = binary.property;
		return action;
	}
	
	/**
	* Transforms a Zigbee2MQTT numeric property, which you can only set but not get, into a WebThings
	* Action with a input of of type integer.
	*/
	numericPropertyToIntegerAction(numeric) {
		const action = new Object();
		action.title = this.applySentenceCase(numeric.name);
		action.description = numeric.description;
		action.input = this.numericPropertyToIntegerProperty(numeric);
        action.property = binary.property;
		return action;
	}
	
	numericPropertyToFloatAction(numeric) { // would this ever be used?? Do actions with floats even exist? Or are these indexes in a list of options?
		const action = new Object();
		action.title = this.applySentenceCase(numeric.name);
		action.description = numeric.description;
		action.input = this.numericPropertyToFloatProperty(numeric);
		return action;
	}
	
	/**
	* Transforms a Zigbee2MQTT text property, which you can only set but not get, into a WebThings
	* Action with a input of of type string.
	*/
	textPropertyToStringAction(text) {
		const action = new Object();
		action.title = this.applySentenceCase(text.name);
		action.description = text.description;
		action.input = this.textPropertyToStringProperty(text);
        action.property = binary.property;
		return action;
	}
	
	/**
	* Transforms a Zigbee2MQTT access flag into the readOnly field of a WebThings Property object.
	*/
	accessToReadOnly(accessFlag) {
		if (accessFlag & this.ACCESS_BIT_SET) { // actions are not read-only.
			return false;
		}
		if (accessFlag & accessFlag == 7) { // type 7 properties are not read-only. 
			return false;
		}
		return true; // So far I've only seen type 1 as read-only.
	}
	
	
	applySentenceCase(title) {
        
		if(typeof title == "undefined"){
			title = "Unknown";
		}
        
		///console.log("CAPitalising");
		if(title.toLowerCase() == "linkquality"){
			return "Link quality";
		}
		if(title.toLowerCase() == "power state"){ // handle the extra state property that is generated from enum.
			return "Power state";
		}
		
		
		
		title = title.replace(/_/g, ' '); // replace _ with space
		

		return title.charAt(0).toUpperCase() + title.substr(1).toLowerCase();
		
	}
	
}

module.exports = ExposesDeviceGenerator;
