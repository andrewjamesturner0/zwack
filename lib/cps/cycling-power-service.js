import bleno from 'bleno';
import CyclingPowerMeasurementCharacteristic from './cycling-power-measurement-characteristic.js';
import CyclingPowerWahooCharacteristicExtension from './cycling-power-wahoo-extension-characteristic.js';
import StaticReadCharacteristic from '../read-characteristic.js';

// https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.cycling_power.xml
class CyclingPowerService extends bleno.PrimaryService {

  constructor() {
    const powerMeasurement = new CyclingPowerMeasurementCharacteristic();
    const powerTargetSet = new CyclingPowerWahooCharacteristicExtension();
    super({
        uuid: '1818',
        characteristics: [
          powerMeasurement,
          powerTargetSet,
          new StaticReadCharacteristic('2A65', 'Cycling Power Feature', [0x08, 0, 0, 0]), // 0x08 - crank revolutions
          new StaticReadCharacteristic('2A5D', 'Sensor Location', [13])         // 13 = rear hub
        ]
    });

    this.powerMeasurement = powerMeasurement;
    this.powerTargetSet = powerTargetSet;
  }

  notify(event) {
    this.powerMeasurement.notify(event);
    return this.RESULT_SUCCESS;
  }
}

export default CyclingPowerService;
