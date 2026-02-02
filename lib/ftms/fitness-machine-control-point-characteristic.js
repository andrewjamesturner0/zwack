// Main Code is from FortiusANT project and modified to suit Zwack
// https://github.com/WouterJD/FortiusANT/tree/master/node
//
// Per the FTMS Specs, sending commands to FTMS server, we need to first
// Request Control - Send Hex Code 00
// then
// Set Power Target - Send Hex Code 056400 - 100w  (6400 = 100w  Little Endian
// Set Power Target - Send Hex Code 05E803 - 1000w (E803 = 1000w Little Endian)
import bleno from 'bleno';
import debugFactory from 'debug';
import util from 'util';

const debugFTMS = debugFactory('ftms');

const RequestControl = 0x00;
const Reset = 0x01;
const SetTargetPower = 0x05;
const StartOrResume = 0x07;
const StopOrPause = 0x08;
const SetIndoorBikeSimulation = 0x11; // DEC 11
const ResponseCode = 0x80;

const Success = 0x01;
const OpCodeNotSupported = 0x02;
const InvalidParameter = 0x03;
const OperationFailed = 0x04;
const ControlNotPermitted = 0x05;

const CharacteristicUserDescription = '2901';
const FitnessMachineControlPoint = '2AD9';

class FitnessMachineControlPointCharacteristic extends  bleno.Characteristic {
  constructor(messages, fmsc) {
    debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] constructor')
    super({
     uuid: FitnessMachineControlPoint,
      properties: ['write', 'indicate'],
      descriptors: [
        new bleno.Descriptor({
          uuid: CharacteristicUserDescription,
          value: 'Fitness Machine Control Point'
        })
      ]
    });

    this.messages = messages;
    this.fmsc = fmsc;
    this.indicate = null;

    this.hasControl = false;
    this.isStarted = false;
  }

  result(opcode, result) {
    const buffer = Buffer.alloc(3);
    buffer.writeUInt8(ResponseCode);
    buffer.writeUInt8(opcode, 1);
    buffer.writeUInt8(result, 2);
	debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] result response' + util.inspect(buffer));
    return buffer;
  }

  onSubscribe(maxValueSize, updateValueCallback) {
    debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onSubscribe');
    this.indicate = updateValueCallback;
    return this.RESULT_SUCCESS;
  }

  onUnsubscribe() {
    debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onUnsubscribe');
    this.indicate = null;
    return this.RESULT_UNLIKELY_ERROR;
  }

  onIndicate() {
    debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onIndicate');
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    // first byte indicates opcode
    const code = data.readUInt8(0);

    // when would it not be successful?
    callback(this.RESULT_SUCCESS);

    let response = null;

    switch(code){
      case RequestControl:
        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: RequestControl');
	      debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: RequestControl - Given control');
          this.hasControl = true;
          response = this.result(code, Success);

        break;
      case Reset:
        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Reset');
        if (this.hasControl) {
          debugFTMS('Control reset');
          this.hasControl = false;
          response = this.result(code, Success);

          // Notify all connected clients that control has been reset
          this.fmsc.notifyReset();
        }
        else {
          debugFTMS('Error: no control');
          response = this.result(code, ControlNotPermitted);
        }
        break;
      case SetTargetPower:
        if (this.hasControl) {
          const targetPower = data.readInt16LE(1);
          debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Set target power(W): ' + targetPower + 'w [' + util.inspect(data) + ']');

          response = this.result(code, Success);

          // Notify all connected clients about the new values
          this.fmsc.notifySetTargetPower(targetPower);
        }
        else {
          debugFTMS('Error: no control');
          response = this.result(code, ControlNotPermitted);
        }
        break;
      case StartOrResume:
        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Start or Resume');
        if (this.hasControl) {
          if (this.isStarted) {
	        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Start or Resume - Error: already started/resumed');
            response = this.result(code, OperationFailed);
          }
          else {
  	        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Start or Resume - started/resumed');
            this.isStarted = true;
            response = this.result(code, Success);

            // Notify all connected clients about the new state
            this.fmsc.notifyStartOrResume();
          }
        }
        else {
          debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Start or Resume - Error: No Control');
          response = this.result(code, ControlNotPermitted);
        }
        break;
      case StopOrPause:
        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Stop or Pause');
        if (this.hasControl) {
          if (this.isStarted) {
		    debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Stop or Pause - Stopped');
            this.isStarted = false;
            response = this.result(code, Success);

            // Notify all connected clients about the new state
            this.fmsc.notifyStopOrPause();
          }
          else {
            debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Stop or Pause - Error: Alry Stopped or Paused');
            response = this.result(code, OperationFailed);
          }
        }
        else {
          debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Stop or Pause - Error: No Control');
          response = this.result(code, ControlNotPermitted);
        }
        break;
      case SetIndoorBikeSimulation:
        debugFTMS('[' + FitnessMachineControlPoint + '][FitnessMachineControlPointCharacteristic] onWriteRequest: Set indoor bike simulation' );
        if (this.hasControl) {
          const windSpeed = data.readInt16LE(1) * 0.001;
          const grade = data.readInt16LE(3) * 0.01;
          const crr = data.readUInt8(5) * 0.0001;
          const cw = data.readUInt8(6) * 0.01;

          debugFTMS('Wind speed(mps): ' + windSpeed);
          debugFTMS('Grade(%): ' + grade);
          debugFTMS('crr: ' + crr);
          debugFTMS('cw(Kg/m): ' + cw);

          response = this.result(code, Success);

          // Notify all connected clients about the new values
          this.fmsc.notifySetIndoorBikeSimulation(windSpeed, grade, crr, cw);
        }
        else {
          debugFTMS('Error: no control');
          response = this.result(code, ControlNotPermitted);
        }
        break;
      default:
        debugFTMS('Unsupported OPCODE:' + code);

        const d = Buffer.from(data);
        debugFTMS('Data: ' + d);
        response = this.result(code, OpCodeNotSupported);
        break;
    }

    this.indicate(response);
  }
}

export default FitnessMachineControlPointCharacteristic;
