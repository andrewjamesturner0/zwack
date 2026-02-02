import debugFactory from 'debug';
import bleno from 'bleno';
import util from 'util';

const debugCSP = debugFactory('csp');

// Spec
//https://developer.bluetooth.org/gatt/characteristics/Pages/CharacteristicViewer.aspx?u=org.bluetooth.characteristic.cycling_power_measurement.xml

class CyclingPowerMeasurementCharacteristic extends  bleno.Characteristic {

  constructor() {
    super({
      uuid: '2A63',
      value: null,
      properties: ['notify'],
      descriptors: [
        new bleno.Descriptor({
					uuid: '2901',
					value: 'Cycling Power Measurement'
				}),
        new bleno.Descriptor({
          // Client Characteristic Configuration
          uuid: '2902',
          value: Buffer.alloc(2)
        }),
        new bleno.Descriptor({
          // Server Characteristic Configuration
          uuid: '2903',
          value: Buffer.alloc(2)
        })
      ]
    });
    this._updateValueCallback = null;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    debugCSP('[CyclingPowerMeasurementCharacteristic] client subscribed to PM');
    this._updateValueCallback = updateValueCallback;
    return this.RESULT_SUCCESS;
  }

  onUnsubscribe() {
    debugCSP('[CyclingPowerMeasurementCharacteristic] client unsubscribed from PM');
    this._updateValueCallback = null;
    return this.RESULT_UNLIKELY_ERROR;
  }

  notify(event) {
    if (!('watts' in event) && !('rev_count' in event)) {
      // ignore events with no power and no crank data
      return this.RESULT_SUCCESS;
    }
    const buffer = Buffer.alloc(14);
    let offset = 0;
    // flags
    // 00000001 - 1   - 0x01 - Pedal Power Balance Present
    // 00000010 - 2   - 0x02 - Pedal Power Balance Reference
    // 00000100 - 4   - 0x04 - Accumulated Torque Present
    // 00001000 - 8   - 0x08 - Accumulated Torque Source
    // 00010000 - 16  - 0x10 - Wheel Revolution Data Present
    // 00100000 - 32  - 0x20 - Crank Revolution Data Present
    // 01000000 - 64  - 0x40 - Extreme Force Magnitudes Present
    // 10000000 - 128 - 0x80 - Extreme Torque Magnitudes Present
	if (('rev_count' in event) && ('wheel_count' in event)) {
	  buffer.writeUInt16LE(0x30, offset);
	} else if (('rev_count' in event) && !('wheel_count' in event)) {
	  buffer.writeUInt16LE(0x20, offset);
	} else {
	  buffer.writeUInt16LE(0x00, offset);
	}

    if ('watts' in event) {
      const watts = event.watts;
      offset += 2
      buffer.writeInt16LE(watts, offset);
    }

  	// Speed
    if ('wheel_count' in event) {
      offset += 2
      event.wheel_count = event.wheel_count % 65536;

      buffer.writeUInt32LE(event.wheel_count, offset);

      const wheel_time = (event.wheel_count * event.spd_int) % 65536;
      offset += 4
      buffer.writeUInt16LE(wheel_time, offset);
    }

  	// Cadence
    if ('rev_count' in event) {
      offset += 2
      event.rev_count = event.rev_count % 65536;

      buffer.writeUInt16LE(event.rev_count, offset);

      offset += 2
      buffer.writeUInt16LE(event.cad_time, offset);
    }

  	debugCSP('CPMC watt:' + event.watts + ' cad:' + event.cadence + ' spd:' + event.powerMeterSpeed + ' rev_count:' + event.rev_count + ' cad_time:' + event.cad_time + ' wheel_count:' + event.wheel_count + ' wheel_time:' + wheel_time + ' Msg:' + util.inspect(buffer));

    if (this._updateValueCallback) {
      this._updateValueCallback(buffer);
    }
    return this.RESULT_SUCCESS;
  }
}

export default CyclingPowerMeasurementCharacteristic;
