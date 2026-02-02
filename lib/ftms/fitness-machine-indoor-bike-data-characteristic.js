// Main Code is from FortiusANT project and modified to suit Zwack
// https://github.com/WouterJD/FortiusANT/tree/master/node
import bleno from 'bleno';
import debugFactory from 'debug';
import util from 'util';

const debugFTMS = debugFactory('ftms');

const CharacteristicUserDescription = '2901';
const IndoorBikeData = '2AD2';

function bit(nr) {
  return (1 << nr);
}

const InstantaneousCadencePresent = bit(2);
const InstantaneousPowerPresent = bit(6);
const HeartRatePresent = bit(9);

class IndoorBikeDataCharacteristic extends  bleno.Characteristic {
  constructor() {
    debugFTMS('[IndoorBikeDataCharacteristic] constructor')
    super({
      uuid: IndoorBikeData,
      properties: ['notify'],
      descriptors: [
        new bleno.Descriptor({
          uuid: CharacteristicUserDescription,
          value: 'Indoor Bike Data'
        })
      ]
    });
    this.updateValueCallback = null;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    debugFTMS('[IndoorBikeDataCharacteristic] onSubscribe');
    this.updateValueCallback = updateValueCallback;
    return this.RESULT_SUCCESS;
  }

  onUnsubscribe() {
    debugFTMS('[IndoorBikeDataCharacteristic] onUnsubscribe');
    this.updateValueCallback = null;
    return this.RESULT_UNLIKELY_ERROR;
  }

  notify(event) {
    debugFTMS('[' + IndoorBikeData + '][IndoorBikeDataCharacteristic] notify');

    let flags = 0;
    let offset = 0;
    const buffer = Buffer.alloc(30);

    offset += 2;
    const flagField = buffer.slice(0, offset);

    // Instantaneous speed, always 0 ATM
    offset += 2;

    if ('cadence' in event) {
      flags |= InstantaneousCadencePresent;
      // cadence is in 0.5rpm resolution but is supplied in 1rpm resolution, multiply by 2 for ble.
      const cadence = event.cadence * 2
      debugFTMS('[' + IndoorBikeData + '][IndoorBikeDataCharacteristic] cadence(rpm): ' + cadence + ' (' + event.cadence + ')');
      buffer.writeUInt16LE(cadence, offset);
      offset += 2;
    }

    if ('watts' in event) {
      flags |= InstantaneousPowerPresent;
      const watts = event.watts;
      debugFTMS('[' + IndoorBikeData + '][IndoorBikeDataCharacteristic] power(W): ' + watts);
      buffer.writeInt16LE(watts, offset);
      offset += 2;
    }

    // Write the flags
    flagField.writeUInt16LE(flags);

    const finalbuffer = buffer.slice(0, offset);
   	debugFTMS('[' + IndoorBikeData + '][IndoorBikeDataCharacteristic] '  + util.inspect(finalbuffer));
    if (this.updateValueCallback) {
      this.updateValueCallback(finalbuffer);
    }

    return this.RESULT_SUCCESS;
  }
}

export default IndoorBikeDataCharacteristic;
