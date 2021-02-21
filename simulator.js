const installAddon = require('./index');

const manager = {
	addAdapter() {},
	emit(event, data) {
		console.log('>', event, data ? data.value : data);
	},
	handleDeviceAdded(device) {
		console.log('+', device.id);
	},
	getGatewayVersion() {
		return 1;
	},
	getUserProfile() {
		return {};
	},
	getPreferences() {
		return {};
	},
	sendPropertyChangedNotification() {
		return {};
	},
};
const manifest = {
	moziot: {
		config: {
			mqtt: 'mqtt://localhost',
			prefix: 'zigbee2mqtt',
			// serial_port: '/dev/serial/by-id/usb-Texas_Instruments_TI_CC2531_USB_CDC___0X00124B0018E25CE3-if00',
			serial_port: '/dev/ttyAMA0',
			auto_update: true,
			debug: true,
		},
	},
};

installAddon(manager, manifest);
