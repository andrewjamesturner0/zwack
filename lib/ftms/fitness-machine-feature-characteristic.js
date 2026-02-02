// Main Code is from FortiusANT project and modified to suit Zwack
// https://github.com/WouterJD/FortiusANT/tree/master/node
import bleno from 'bleno';
import debugFactory from 'debug';

const debugFTMS = debugFactory('ftms');

function bit(nr) {
  return (1 << nr);
}

const CadenceSupported = bit(1);
const HeartRateMeasurementSupported = bit(10);
const PowerMeasurementSupported = bit(14);

const PowerTargetSettingSupported = bit(3);
const IndoorBikeSimulationParametersSupported = bit(13);

const CharacteristicUserDescription = '2901';
const FitnessMachineFeature = '2ACC';

class FitnessMachineFeatureCharacteristic extends  bleno.Characteristic {
  constructor() {
    debugFTMS('[' + FitnessMachineFeature + '][FitnessMachineFeatureCharacteristic] constructor');
    super({
      uuid: FitnessMachineFeature,
      properties: ['read'],
      descriptors: [
        new bleno.Descriptor({
          uuid: CharacteristicUserDescription,
          value: 'Fitness Machine Feature'
        })
      ],
    });
  }

  onReadRequest(offset, callback) {
    debugFTMS('[' + FitnessMachineFeature + '][FitnessMachineFeatureCharacteristic] onReadRequest');
    const flags = Buffer.alloc(8);
    flags.writeUInt32LE(CadenceSupported | PowerMeasurementSupported);
    flags.writeUInt32LE(IndoorBikeSimulationParametersSupported | PowerTargetSettingSupported, 4);
    callback(this.RESULT_SUCCESS, flags);
  }
}

export default FitnessMachineFeatureCharacteristic;
