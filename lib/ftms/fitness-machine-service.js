// Main Code is from FortiusANT project and modified to suit Zwack
// https://github.com/WouterJD/FortiusANT/tree/master/node
import bleno from 'bleno';
import debugFactory from 'debug';
import FitnessMachineFeatureCharacteristic from './fitness-machine-feature-characteristic.js';
import IndoorBikeDataCharacteristic from './fitness-machine-indoor-bike-data-characteristic.js';
import FitnessMachineControlPointCharacteristic from './fitness-machine-control-point-characteristic.js';
import SupportedPowerRangeCharacteristic from './supported-power-range-characteristic.js';
import FitnessMachineStatusCharacteristic from './fitness-machine-status-characteristic.js';

const debugFTMS = debugFactory('ftms');

const FitnessMachine = '1826'

class FitnessMachineService extends bleno.PrimaryService {
  constructor(messages) {
    debugFTMS('[FitnessMachineService] constructor');
    const fmfc = new FitnessMachineFeatureCharacteristic();
    const ibdc = new IndoorBikeDataCharacteristic();
    const fmsc = new FitnessMachineStatusCharacteristic();
    const fmcpc = new FitnessMachineControlPointCharacteristic(messages, fmsc);
    const sprc = new SupportedPowerRangeCharacteristic();
    super({
      uuid: FitnessMachine,
      characteristics: [
        fmfc,
        ibdc,
        fmsc,
        fmcpc,
        sprc
      ]
    });

    this.fmfc = fmfc;
    this.ibdc = ibdc;
    this.fmsc = fmsc;
    this.fmcpc = fmcpc;
    this.sprc = sprc;
  }

  notify(event) {
    debugFTMS('[' + FitnessMachine + '][FitnessMachineService] notify')
    this.ibdc.notify(event);
    return this.RESULT_SUCCESS;
  }
}

export default FitnessMachineService;
