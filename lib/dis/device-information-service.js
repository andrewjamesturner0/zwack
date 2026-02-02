import bleno from 'bleno';
import DIS from './dis.js';
import StaticReadCharacteristic from '../read-characteristic.js';

class DeviceInformationService extends bleno.PrimaryService {
  constructor(bleDevice) {
    const info = new DIS(bleDevice);

    super({
      uuid: '180A',
      characteristics: [
        new StaticReadCharacteristic('2A23', 'System Id', info.systemId),
        new StaticReadCharacteristic('2A24', 'Model Number', info.modelNumber),
        new StaticReadCharacteristic('2A25', 'Serial Number', info.serialNumber),
        new StaticReadCharacteristic('2A26', 'Firmware Revision', info.firmwareRevision),
        new StaticReadCharacteristic('2A27', 'Hardware Revision', info.hardwareRevision),
        new StaticReadCharacteristic('2A28', 'Software Revision', info.softwareRevision),
        new StaticReadCharacteristic('2A29', 'Manufacturer Name', info.manufacturerName)
      ]
    });

    this.info = info;
  }
}

export default DeviceInformationService;
