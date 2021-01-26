/**
 * ExposesDeviceGenerator.js - Generate devices using the Zigbee2MQTT
 * Exposes API: https://www.zigbee2mqtt.io/information/exposes
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */
class ExposesDeviceGenerator {

    constructor() {
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
    generateDevice(info) {

        if (!info.supported || !info.definition || !info.definition.exposes) {
            console.info(`Skipping device generation for ${info.friendly_name}`)
            return;
        }

				console.debug(`Device ${info.friendly_name} exposes ${JSON.stringify(info.definition.exposes)}`);

        const device = new Object();
        device['@type'] = [];
        device.properties = new Object();
        device.actions = new Object();
        device.name = info.definition.description;

        for (const expose of info.definition.exposes) {
            switch (expose.type) {
                // Generic type binary
                case 'binary':
                    if (expose.access === this.ACCESS_MASK_ACTION) {
                        device.actions[expose.name] = this.binaryPropertyToBooleanAction(expose);
                    } else {
                        device.properties[expose.name] = this.binaryPropertyToBooleanProperty(expose);
                    }
                    break;

                // Generic type numeric
                case 'numeric':
                    if (expose.access === this.ACCESS_MASK_ACTION) {
                        device.actions[expose.name] = this.numericPropertyToIntegerAction(expose);
                    } else {
                        device.properties[expose.name] = this.numericPropertyToIntegerProperty(expose);
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

                // Specific type light
                case 'light':
                    device['@type'].push('Light');
                    for (const feature of expose.features) {
                        switch (feature.name) {
                            case 'state':
                                device.properties[feature.property] = this.binaryPropertyToBooleanProperty(feature)
                                device.properties[feature.property]['@type'] = 'OnOffProperty';
                                break;
                            case 'brightness':
                                device.properties[feature.property] = this.numericPropertyToIntegerProperty(feature)
                                device.properties[feature.property]['@type'] = 'BrightnessProperty';
                                break;
                            case 'color_temp':
                                device.properties[feature.property] = this.numericPropertyToIntegerProperty(feature);
                                device.properties[feature.property]['@type'] = 'ColorTemperatureProperty';
                                break;
                        }
                    }
                    break;

                // Specific type switch
                case 'switch':
                    device['@type'].push('OnOffSwitch');
                    for (const feature of expose.features) {
                        switch (feature.name) {
                            case 'state':
                                device.properties[feature.property] = this.binaryPropertyToBooleanProperty(feature)
                                device.properties[feature.property]['@type'] = 'OnOffProperty';
                                break;
                        }
                    }
                    break;

                default:
                    console.info(`Property of type ${expose.type} not yet supported`);
                    break;
            }
        }
        return device;
    }

    /**
     * Transforms a Zigbee2MQTT binary property into a WebThings Property object of type boolean.
     */
    binaryPropertyToBooleanProperty(binary) {
        const property = new Object();
        property.type = 'boolean';
        property.description = binary.description;
        property.readOnly = this.accessToReadOnly(binary.access);
        property.fromMqtt = v => v === binary.value_on
        property.toMqtt = v => (v ? binary.value_on : binary.value_off)
        return property;
    }

    /**
     * Transforms a Zigbee2MQTT numeric property into a WebThings Property object of type integer.
     */
    numericPropertyToIntegerProperty(numeric) {
        const property = new Object();
        property.type = 'integer';
        property.description = numeric.description;
        property.readOnly = this.accessToReadOnly(numeric.access);
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
        property.description = enumeration.description;
        property.readOnly = this.accessToReadOnly(enumeration.access);
        property.enum = enumeration.values;
        return property;
    }

    /**
     * Transforms a Zigbee2MQTT text property into a WebThings Property object of type string.
     */
    textPropertyToStringProperty(text) {
        const property = new Object();
        property.type = 'string';
        property.description = text.description;
        return property;
    }

    /**
    * Transforms a Zigbee2MQTT binary property, which you can only set but not get, into a WebThings Action
    * with a input of of type boolean.
    */
    binaryPropertyToBooleanAction(binary) {
        const action = new Object();
        action.title = binary.title;
        action.description = binary.description;
        action.input = this.binaryPropertyToBooleanProperty(binary);
        return action;
    }

    /**
     * Transforms a Zigbee2MQTT enum property, which you can only set but not get, into a WebThings Action
     * with a input of of type string.
     */
    enumPropertyToStringAction(enumeration) {
        const action = new Object();
        action.title = enumeration.title;
        action.description = enumeration.description;
        action.input = this.enumPropertyToStringProperty(enumeration);
        return action;
    }

    /**
     * Transforms a Zigbee2MQTT numeric property, which you can only set but not get, into a WebThings Action
     * with a input of of type integer.
     */
    numericPropertyToIntegerAction(numeric) {
        const action = new Object();
        action.title = numeric.title;
        action.description = numeric.description;
        action.input = this.numericPropertyToIntegerProperty(numeric);
        return action;
    }

    /**
     * Transforms a Zigbee2MQTT text property, which you can only set but not get, into a WebThings Action
     * with a input of of type string.
     */
    textPropertyToStringAction(text) {
        const action = new Object();
        action.title = text.title;
        action.description = text.description;
        action.input = this.textPropertyToStringProperty(enumeration);
        return action;
    }

    /**
     * Transforms a Zigbee2MQTT access flag into the readOnly field of a WebThings Property object.
     */
    accessToReadOnly(accessFlag) {
        if (accessFlag & this.ACCESS_BIT_SET)
            return false;
        return true;
    }

}

module.exports = ExposesDeviceGenerator;