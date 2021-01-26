const mqtt = require('mqtt');
const installAddon = require('./index');

const manager = {
  addAdapter() {},
  emit(event, data) {
    console.log('>', event, data ? data.value : data);
  },
  handleDeviceAdded(device) {
    console.log('+', device.id);
  },
	getGatewayVersion(){
		return 1;
	},
	getUserProfile(){
		return {}
	},
	getPreferences(){
		return {}
	}
};
const manifest = {
  moziot: {
    config: {
      mqtt: 'mqtt://localhost',
      prefix: 'zigbee2mqtt',
			serial_port:'/dev/ttyACM0',
			permit_join:true,
    },
  },
};

installAddon(manager, manifest);
