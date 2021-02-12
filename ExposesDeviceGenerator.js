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
	
	
	
	// Finds all the potential property names first, so that later manipulating logic can use that foresight.
	pre_parse_device(exposes_info, property_names_list){
		try{
			for (var k in exposes_info)
			{
				if (typeof exposes_info[k] == "object" && exposes_info[k] !== null){
					if( typeof exposes_info[k]["access"] != "undefined" ){
						if(typeof exposes_info[k]['name'] != "undefined"){
							if( exposes_info[k]['name'] != "x" && exposes_info[k]['name'] != "y"){ // Skip the color fragments
								if( !(exposes_info[k]['name'] in property_names_list) ){
									property_names_list.push(exposes_info[k]['name']); 
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
	
	
	
	parse_device(exposes_info, new_device, property_names_list){
		//console.log(" ");
		//console.log("+ + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + + +");
		//console.log(exposes_info);
		//console.log(new_device);
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
								new_device['@type'].push('ColorControl');
								const composite_expose = {
									'access':7,
									'property':'color',
									'description': exposes_info['description'],
									'name':'color',
									'type':'text'
								}
								//console.log(composite_expose);
								new_device = this.parse_property(composite_expose, new_device, property_names_list);

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
						new_device['@type'].push('Light');
					}
					else if(exposes_info['type'] == "switch"){
						if(this.config.debug){
							console.log("it's a switch");
						}
						new_device['@type'].push('OnOffSwitch');
					}
					else if(exposes_info['type'] == "lock"){
						if(this.config.debug){
							console.log("it's a lock");
						}
						new_device['@type'].push('Lock');
					}
					else if(exposes_info['type'] == "climate"){
						if(this.config.debug){
							console.log("it's a thermostat");
						}
						new_device['@type'].push('Thermostat');
					}
				
				
				}
			}
		
		
			for (var k in exposes_info){
				if (typeof exposes_info[k] == "object" && exposes_info[k] !== null){

					if( typeof exposes_info[k]["access"] != "undefined" ){
						if(typeof exposes_info[k]['name'] != "undefined"){
							if( exposes_info[k]['name'] != "x" && exposes_info[k]['name'] != "y"){ // Skip the color fragments
								new_device = this.parse_property(exposes_info[k], new_device, property_names_list);
							}
						}
					}
					else if(k != "values"){
						//console.log(".. diving deeper ..");
						new_device = this.parse_device(exposes_info[k], new_device, property_names_list);
					}
					
				} // end of object check
			} // end of for loop
			
		}
		catch (error){
			console.log("Error in device pre-parsing: " + error)
		}
		
		return new_device;
	}
	
	
	
	parse_property(expose, device, property_names_list){
		//console.log("+");
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
    					device.actions[expose.name] = this.binaryPropertyToBooleanAction(expose);
    				} else {
    					device.properties[expose.name] = this.binaryPropertyToBooleanProperty(expose);
    				}
    				break;
			
				
				// Generic type numeric - integer variant
				case 'numeric':
    				if (expose.access === this.ACCESS_MASK_ACTION) {
    					device.actions[expose.name] = this.numericPropertyToIntegerAction(expose);
    				} else {
    					device.properties[expose.name] = this.numericPropertyToIntegerProperty(expose);
    				}
    				break;
				
				
				case 'float':
    				if (expose.access === this.ACCESS_MASK_ACTION) {
    					device.actions[expose.name] = this.numericPropertyToFloatAction(expose);
    				} else {
    					device.properties[expose.name] = this.numericPropertyToFloatProperty(expose);
    				}
    				break;
			
			
				// Generic type enum
				case 'enum':					
    				if (expose.access === this.ACCESS_MASK_ACTION) {
    					device.actions[expose.name] = this.enumPropertyToStringAction(expose);
    				} else {
    					device.properties[expose.name] = this.enumPropertyToStringProperty(expose);
    				}
    				break;
			
			
				// Generic type text
				case 'text':
    				if (expose.access === this.ACCESS_MASK_ACTION) {
    					device.actions[expose.name] = this.textPropertyToStringAction(expose);
    				} else {
    					device.properties[expose.name] = this.textPropertyToStringProperty(expose);
    				}
    				break;
			
			}
			
			if(typeof expose['name'] != "undefined"){
				if( expose.name.endsWith("state") ){
					//console.log("expose.name ends with state, so adding onOfProperty @type");
					if(expose.access == 1){
						device.properties[expose.name]['@type'] = 'PushedProperty';
					}else{
						device.properties[expose.name]['@type'] = 'OnOffProperty';
					}
					
				}
				else if(expose.name.endsWith("brightness") ){
					device.properties[expose.name]['@type'] = 'BrightnessProperty';
				}
				else if(expose.name == "color_temp"){
					device.properties[expose.name]['@type'] = 'ColorTemperatureProperty';
				}
				else if(expose.name == "color_xy" || expose.name == "color_hs"){
					device.properties[expose.name]['@type'] = 'ColorProperty';
				}
				else if(expose.name == "occupied_heating_setpoint" || expose.name == "occupied_cooling_setpoint"){
					device.properties[expose.name]['@type'] = 'TargetTemperatureProperty';
				}
				else if(expose.name == "local_temperature"){
					device.properties[expose.name]['@type'] = 'TemperatureProperty';
				}
				else if(expose.name == "occupancy"){
					device.properties[expose.name]['@type'] = 'MotionProperty';
					if(device['@type'].indexOf("MotionSensor") == -1){
						device['@type'].push('MotionSensor');
					}
					
				}
				
			}
			else{
				console.log("WARNING, NO NAME!!");
			}
			
			
			// Capability upgrade based on the value_on property
			if(typeof expose['value_on'] != "undefined"){
				if( expose['value_on'] == "LOCK" || expose['value_on'] == "UNLOCK"){
					device.properties[expose.name]['@type'] = 'LockedProperty'; 
				}	
			}
			
			
			// Check if an extra boolean property could be generated from the enum values.
			if(expose['type'] == "enum" && expose.access == 1){ // For now, only read-only enum properties (access type 1) with 'on' and 'off' in them will get an extra OnOffProperty
				if(!('state' in property_names_list)){
					var on_off_count = 0;
					for (var i = 0; i < expose.values.length; i++) {
					    if( expose.values[i].toLowerCase() == "on" || expose.values[i].toLowerCase() == "off"){
					    	on_off_count++;
					    }
					}
					if(on_off_count == 2){
						const extra_on_off_expose = {
							'access':expose.access,
							'property':'power state',
							'description': expose.description,
							'name':'power state',
							'type':'binary'
						}
						//if(expose.access == 1){
						device['@type'].push('PushButton'); // for read-only binary properties
						//}
						//else{
						//	device['@type'].push('OnOffSwitch');
						//}
						property_names_list.push('power state'); // Remember that a state property now does exist, so as not to generate even more.
						device = this.parse_property(extra_on_off_expose, device, property_names_list); // Create extra OnOffProperty
					}
				} // End of property_names_list check

				
			}
			
			
		}
		else{
			console.log("Weird, expose['type'] did not exist");
		}
		
		return device;
	}
	
	
	
	
	
	/**
	* Generate a WebThings device definition based on the provided
	* Zigbee2MQTT device definition, i.e. the Exposes API as described in
	* https://www.zigbee2mqtt.io/information/exposes
	*/
	
	generateDevice(info) {
		
		
		if (!info.supported || !info.definition || !info.definition.exposes) {
			return;
		}
		
		var device = new Object();
		device['@type'] = [];
		device.properties = new Object();
		device.actions = new Object();
		
		try{
			if(this.config.debug){
				console.log(" ");
				console.log(" ");
				console.debug('Device', info.friendly_name, 'exposes', JSON.stringify(info.definition.exposes));
			}
			
			device.name = info.definition.description;
		
			//console.log(device);
		
			var property_names_list = this.pre_parse_device(info.definition.exposes,[]);
			if(this.config.debug){
				console.log("property_names_list = ");
				console.log(property_names_list);
			}
			device = this.parse_device(info.definition.exposes, device, property_names_list);
		
			//console.log("= = = = = = = = = = = = = = = = = = = = = = = = = = = = = = ");
			//console.log("new_device is now:");
			//console.log(device);
			
	  }
	  catch (error){
	  	console.log("Error in generateDevice: " + error);
	  }
		
		return device;
		
		
		
		
	}
	
	/**
	* Transforms a Zigbee2MQTT binary property into a WebThings Property object of type boolean.
	*/
	binaryPropertyToBooleanProperty(binary) {
		const property = new Object();
		property.type = 'boolean';
		property.title = this.applySentenceCase(binary.name); // attempt to avoid the `on/off` property title
		property.description = binary.description;
		property.readOnly = this.accessToReadOnly(binary.access);
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
		///console.log("CAPitalising");
		if(title.toLowerCase() == "linkquality"){
			return "Link quality";
		}
		if(title.toLowerCase() == "power state"){ // handle the extra state property that is generated from enum.
			return "State";
		}
		
		
		
		title = title.replace(/_/g, ' '); // replace _ with space
		
		if(typeof title == "undefined"){
			title = "Unknown";
		}
		return title.charAt(0).toUpperCase() + title.substr(1).toLowerCase();
		
	}
	
}

module.exports = ExposesDeviceGenerator;
