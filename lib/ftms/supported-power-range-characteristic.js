// Main Code is from FortiusANT project and modified to suit Zwack
// https://github.com/WouterJD/FortiusANT/tree/master/node
import bleno from 'bleno';
import debugFactory from 'debug';
import util from 'util';

const debugFTMS = debugFactory('ftms');

const CharacteristicUserDescription = '2901';
const SupportedPowerRange = '2AD8';

class SupportedPowerRangeCharacteristic extends  bleno.Characteristic {
  constructor() {
    debugFTMS('[SupportedPowerRangeCharacteristic] constructor');
    super({
      uuid: SupportedPowerRange,
      properties: ['read'],
      descriptors: [
        new bleno.Descriptor({
          uuid: CharacteristicUserDescription,
          value: 'Supported Power Range'
        })
      ],
    });
  }

  onReadRequest(offset, callback) {
    const buffer = Buffer.alloc(6);
    let at = 0;

    const minimumPower = 0;
    buffer.writeInt16LE(minimumPower, at);
    at += 2;

    const maximumPower = 1000;
    buffer.writeInt16LE(maximumPower, at);
    at += 2;

    const minimumIncrement = 1;
    buffer.writeUInt16LE(minimumIncrement, at);
    at += 2;

	// For Ease Of Debugging
    const finalbuffer = buffer.slice(0, at);
    const minPowerHex = buffer.slice(0,2);
    const maxPowerHex = buffer.slice(2,4);
    const incPowerHex = buffer.slice(4,6);

    const minPowerDec = finalbuffer.readInt16LE(0);
    const maxPowerDec = finalbuffer.readInt16LE(2);
    const incPowerDec = finalbuffer.readInt16LE(4);

	debugFTMS('[' + SupportedPowerRange + '][SupportedPowerRangeCharacteristic] onReadRequest - ' + util.inspect(finalbuffer) );
	debugFTMS('[' + SupportedPowerRange + '][SupportedPowerRangeCharacteristic] onReadRequest - Min [HEX]' + util.inspect(minPowerHex) + ' [Decimal:' + minPowerDec + ']');
	debugFTMS('[' + SupportedPowerRange + '][SupportedPowerRangeCharacteristic] onReadRequest - Max [HEX]' + util.inspect(maxPowerHex) + ' [Decimal:' + maxPowerDec + ']');
	debugFTMS('[' + SupportedPowerRange + '][SupportedPowerRangeCharacteristic] onReadRequest - Inc [HEX]' + util.inspect(incPowerHex) + ' [Decimal:' + incPowerDec + ']');
    callback(this.RESULT_SUCCESS, buffer);
  }
}

export default SupportedPowerRangeCharacteristic;
