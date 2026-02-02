import debugFactory from 'debug';
import bleno from 'bleno';
import util from 'util';

const debugCSP = debugFactory('cspw');

// Spec
//https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.cycling_power_measurement.xml
const CyclingPowerWahooExtension = 'A026E005-0A7D-4AB3-97FA-F1500F9FEB8B';
const CharacteristicUserDescription = '2901';

const RequestUnlock = 0x20;
const SetTargetPower = 0x42;

class CyclingPowerWahooCharacteristicExtension extends  bleno.Characteristic {

  constructor() {
    super({
      uuid: CyclingPowerWahooExtension,
      properties: ['write'],
      descriptors: [
        new bleno.Descriptor({
			uuid: CharacteristicUserDescription,
			value: 'Cycling Power Wahoo Extension'
		}),
      ]
    });
    this._updateValueCallback = null;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    debugCSP('[CyclingPowerWahooCharacteristicExtension] client subscribed to PM');
    this._updateValueCallback = updateValueCallback;
    return this.RESULT_SUCCESS;
  }

  onUnsubscribe() {
    debugCSP('[CyclingPowerWahooCharacteristicExtension] client unsubscribed from PM');
    this._updateValueCallback = null;
    return this.RESULT_UNLIKELY_ERROR;
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
  const code = data.readUInt8(0);
  debugCSP('[CyclingPowerWahooCharacteristicExtension] onWriteRequest: ' + util.inspect(data) + ' code:' + util.inspect(code));

  callback(this.RESULT_SUCCESS);

  switch(code) {
  	case RequestUnlock:
      debugCSP('[CyclingPowerWahooCharacteristicExtension] onWriteRequest: RequestUnlock - ' + util.inspect(data));
      break;

    case SetTargetPower:
      const targetPower = data.readInt16LE(1);
      debugCSP('[CyclingPowerWahooCharacteristicExtension] onWriteRequest: onWriteRequest: Set target power(W): ' + targetPower + 'w [' + util.inspect(data) + ']');

	  break;

	default:
	  debugCSP('[CyclingPowerWahooCharacteristicExtension] onWriteRequest: Unsupported OpCode:' + code);
	  break;
    }
  }
}

export default CyclingPowerWahooCharacteristicExtension;
