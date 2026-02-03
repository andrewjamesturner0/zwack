import bleno from 'bleno';
import { EventEmitter } from 'events';
import debugFactory from 'debug';
import minimist from 'minimist';
import DeviceInformationService from './dis/device-information-service.js';
import CyclingPowerService from './cps/cycling-power-service.js';
import RSCService from './rsc/rsc-service.js';
import FTMSService from './ftms/fitness-machine-service.js';

const debugBLE = debugFactory('ble');
const debugRSC = debugFactory('rsc');
const debugCSP = debugFactory('csp');
const debugFTMS = debugFactory('ftms');

const args = minimist(process.argv.slice(2));

let containsFTMS = false;
let containsRSC = false;
let containsCSP = false;
const servicesOfferedArray = ['180A']; // Device Information Service is offered by default

if ( args.variable !== undefined ) {
  containsFTMS = args.variable.includes('ftms');
  containsRSC  = args.variable.includes('rsc');
  containsCSP  = args.variable.includes('csp');

  // Selectively build the array of Services which we offer/broadcast
  if ( containsFTMS ) { servicesOfferedArray.push('1826') }
  if ( containsCSP ) { servicesOfferedArray.push('1818') }
  if ( containsRSC ) { servicesOfferedArray.push('1814') }
}

class ZwackBLE extends EventEmitter {

	constructor(options) {
		super();

		this.name = options.name || "Zwack";
		process.env['BLENO_DEVICE_NAME'] = this.name;

		this.csp = new CyclingPowerService();
		this.dis = new DeviceInformationService(options);
		this.rsc = new RSCService();
		this.ftms = new FTMSService();

		this.last_timestamp = 0;
		this.rev_count = 0;

		const self = this;

		bleno.on('stateChange', (state) => {
			debugBLE(`[${this.name} stateChange] new state: ${state}`);

			self.emit('stateChange', state);

			if (state === 'poweredOn') {

				bleno.startAdvertising(self.name, servicesOfferedArray);

			} else {

				debugBLE('Stopping...');
				bleno.stopAdvertising();

			}
		});

		// Check if bleno is already powered on (event may have fired before listener was set up)
		if (bleno.state === 'poweredOn') {
			debugBLE(`[${this.name}] bleno already poweredOn, starting advertising`);
			bleno.startAdvertising(self.name, servicesOfferedArray);
		}

		bleno.on('advertisingStart', (error) => {
			debugBLE(`[${this.name} advertisingStart] ${(error ? 'error ' + error : 'success')}`);
			self.emit('advertisingStart', error);

			if (!error) {
				bleno.setServices([
					self.dis,
					self.csp,
					self.rsc,
					self.ftms
				],
				(error) => {
					debugBLE(`[${this.name} setServices] ${(error ? 'error ' + error : 'success')}`);
				});
			}
		});

		bleno.on('advertisingStartError', () => {
			debugBLE(`[${this.name} advertisingStartError] advertising stopped`);
			self.emit('advertisingStartError');
		});

		bleno.on('advertisingStop', error => {
			debugBLE(`[${this.name} advertisingStop] ${(error ? 'error ' + error : 'success')}`);
			self.emit('advertisingStop');
		});

		bleno.on('servicesSet', error => {
			debugBLE(`[${this.name} servicesSet] ${ (error) ? 'error ' + error : 'success'}`);

		});

		bleno.on('accept', (clientAddress) => {
			debugBLE(`[${this.name} accept] Client: ${clientAddress}`);
			self.emit('accept', clientAddress);
			bleno.updateRssi();
		});

		bleno.on('rssiUpdate', (rssi) => {
			debugBLE(`[${this.name} rssiUpdate]: ${rssi}`);
		});
	}

	notifyCSP(event) {
		debugCSP(`[${this.name} notifyCSP] ${JSON.stringify(event)}`);

		this.csp.notify(event);

		if (!('watts' in event) && !('heart_rate' in event)) {

			debugCSP("[" + this.name +" notify] unrecognized event: %j", event);

		} else {

			if ('rev_count' in event) {
				this.rev_count = event.rev_count;
			}
			this.last_timestamp = Date.now();

		}
	}

	notifyFTMS(event) {
		debugFTMS(`[${this.name} notifyFTMS] ${JSON.stringify(event)}`);

		this.ftms.notify(event);

		if (!('watts' in event) && !('heart_rate' in event)) {

			debugFTMS("[" + this.name +" notify] unrecognized event: %j", event);

		} else {

			if ('rev_count' in event) {
				this.rev_count = event.rev_count;
			}
			this.last_timestamp = Date.now();

		}
	}

	notifyRSC(event) {
		debugRSC(`[${this.name} notifyRSC] ${JSON.stringify(event)}`);

		this.rsc.notify(event);

		if ( !( ('speed' in event) && ('cadence' in event)) ) {
			debugRSC("[" + this.name +" notifyCSP] unrecognized event: %j", event);
		}
	}

	ping() {
		const TIMEOUT = 4000;
		const self = this;

		setTimeout(() => {
			// send a zero event if we don't hear for 4 seconds (15 rpm)
			if (Date.now() - self.last_timestamp > TIMEOUT) {
				self.notifyCSP({
					'heart_rate': 0,
					'watts': 0,
					'rev_count': self.rev_count
				})
			}
			this.ping();
		}, TIMEOUT);
	}
}

export default ZwackBLE;
