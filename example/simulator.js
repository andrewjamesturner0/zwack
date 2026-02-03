import ZwackBLE from '../lib/zwack-ble-sensor.js';
import readline from 'readline';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

let containsFTMS = false;
let containsRSC = false;
let containsCSP = false;
let containsSPD = false;
let containsPWR = false;
let containsCAD = false;

if ( args.variable === undefined ) {
  console.error("Error: variable parameter is required eg: npm run simulator -- --variable=ftms");
  process.exit(1);
} else {
  containsFTMS = args.variable.includes('ftms');
  containsRSC  = args.variable.includes('rsc');
  containsCSP  = args.variable.includes('csp');
  containsSPD  = args.variable.includes('speed');
  containsPWR  = args.variable.includes('power');
  containsCAD  = args.variable.includes('cadence');
}

// default parameters
let cadence = 90;
let power = 100;
let powerMeterSpeed = 18;  // kmh
const powerMeterSpeedUnit = 2048;	 // Last Event time expressed in Unit of 1/2048 second
let runningCadence = 180;
let runningSpeed = 10;  // 6:00 minute mile
let noiseEnabled = true;
const POWER_NOISE_PERCENT = 0.10;    // ±10% max variation
const CADENCE_NOISE_PERCENT = 0.04;  // ±4% max variation
const sensorName = 'Zwack';

let incr = 10;
const runningIncr = 0.5;
let stroke_count = 0;
let wheel_count = 0;
const wheel_circumference = 2096 // milimeter
const notificationInterval = 1000;
let watts = power;

let prevCadTime = 0;
let prevCadInt = 0;

/**
 * Generate a random value from a Gaussian (normal) distribution
 * using the Box-Muller transform.
 */
function gaussianRandom(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const zwackBLE = new ZwackBLE({
  name: sensorName,
  modelNumber: 'ZW-101',
  serialNumber: '1'
});

process.stdin.on('keypress', (str, key) => {
  if (key.name === 'x' || key.name == 'q' || ( key.ctrl && key.name == 'c' ) ) {
    process.exit(); // eslint-disable-line no-process-exit
  } else if (key.name === 'l') {
    listKeys();
  } else {
    let factor, runFactor;
    if( key.shift ) {
      factor = incr;
      runFactor = runningIncr;
    }
    else {
      factor = -incr;
      runFactor = -runningIncr;
    }

    switch(key.name) {
      case 'c':
        cadence += factor;
        if( cadence < 0 ) {
          cadence = 0;
        }
        if( cadence > 200 ) {
          cadence = 200;
        }
	break;
      case 'p':
        power += factor;
        if( power < 0 ) {
          power = 0;
        }
        if( power > 2500 ) {
          power = 2500;
        }
	break;
      case 'r':
        noiseEnabled = !noiseEnabled;
	break;
      case 's':
        runningSpeed += runFactor;
        if( runningSpeed < 0 ) {
          runningSpeed = 0;
        }

        powerMeterSpeed += runFactor;
        if( powerMeterSpeed < 0 ) {
          powerMeterSpeed = 0;
        }
	break;
      case 'd':
        runningCadence += runFactor;
        if( runningCadence < 0 ) {
          runningCadence = 0;
        }
	break;
      case 'i':
        incr += Math.abs(factor)/factor;
        if( incr < 1 ) {
          incr = 1;
        }
	break;
      default:
        listKeys();
    }
    listParams();
  }
});

// Simulate Cycling Power - Broadcasting Power ONLY
const notifyPowerCSP = function() {
  watts = noiseEnabled ? Math.max(0, Math.floor(gaussianRandom(power, power * POWER_NOISE_PERCENT / 3))) : power;

  try {
    zwackBLE.notifyCSP({'watts': watts});
  }
  catch( e ) {
    console.error(e);
  }

  setTimeout(notifyPowerCSP, notificationInterval);
};

// Simulate FTMS Smart Trainer - Broadcasting Power and Cadence
const notifyPowerFTMS = function() {
  watts = noiseEnabled ? Math.max(0, Math.floor(gaussianRandom(power, power * POWER_NOISE_PERCENT / 3))) : power;
  const cadenceWithNoise = noiseEnabled ? Math.max(0, Math.floor(gaussianRandom(cadence, cadence * CADENCE_NOISE_PERCENT / 3))) : cadence;

  try {
    zwackBLE.notifyFTMS({'watts': watts, 'cadence': cadenceWithNoise});
  }
  catch( e ) {
    console.error(e);
  }

  setTimeout(notifyPowerFTMS, notificationInterval);
};

// Simulate Cycling Power - Broadcasting Power and Cadence
const notifyCadenceCSP = function() {
  stroke_count += 1;
  if( cadence <= 0) {
    cadence = 0;
    setTimeout(notifyCadenceCSP, notificationInterval);
    return;
  }
  try {
    zwackBLE.notifyCSP({'watts': watts, 'rev_count': stroke_count });
  }
  catch( e ) {
    console.error(e);
  }

  const cadenceForInterval = noiseEnabled ? Math.max(1, gaussianRandom(cadence, cadence * CADENCE_NOISE_PERCENT / 3)) : cadence;
  setTimeout(notifyCadenceCSP, 60 * 1000 / Math.max(1, cadenceForInterval));
};


// Simulate Cycling Power - Broadcasting Power and Cadence & Speed
// This setup is NOT ideal. Cadence and Speed changes will be erratic
//   - takes ~2 sec to stabilize and be reflected in output
const notifyCPCS = function() {
  // https://www.hackster.io/neal_markham/ble-bicycle-speed-sensor-f60b80
  const spd_int = Math.round((wheel_circumference * powerMeterSpeedUnit * 60 * 60) / (1000 * 1000 * powerMeterSpeed));
  watts = noiseEnabled ? Math.max(0, Math.floor(gaussianRandom(power, power * POWER_NOISE_PERCENT / 3))) : power;

  const cad_int = Math.round(60 * 1024/( cadence));
  const now = Date.now();
  let cad_time = 0;


  wheel_count += 1;
  if ( powerMeterSpeed <= 0 ) {
  	powerMeterSpeed = 0;
    setTimeout(notifyCPCS, notificationInterval);
    return;
  }


  if ( cad_int != prevCadInt ) {
    cad_time = (stroke_count * cad_int) % 65536;
    const deltaCadTime = cad_time - prevCadTime;
    const ratioCadTime = deltaCadTime / cad_int
	  if ( ratioCadTime > 1 )  {
		stroke_count = stroke_count + Math.round(ratioCadTime);
		cad_time = (cad_time + cad_int) % 65536;
		prevCadTime = cad_time;
	  }
  } else {
    stroke_count += 1;
    cad_time = (stroke_count * cad_int) % 65536;
  }

  prevCadTime = cad_time;
  prevCadInt = cad_int;

  if( cadence <= 0) {
    cadence = 0;
    setTimeout(notifyCPCS, notificationInterval);
    return;
  }

  try {
    zwackBLE.notifyCSP({'watts': watts, 'rev_count': stroke_count, 'wheel_count': wheel_count, 'spd_int': spd_int, 'cad_int': cad_int, 'cad_time': cad_time, 'cadence': cadence, 'powerMeterSpeed': powerMeterSpeed});
  }
  catch( e ) {
    console.error(e);
  }

  setTimeout(notifyCPCS, notificationInterval);
};

// Simulate Running Speed and Cadence - Broadcasting Speed and Cadence
const notifyRSC = function() {
  try {
    zwackBLE.notifyRSC({
      'speed': noiseEnabled ? toMs(Math.max(0, gaussianRandom(runningSpeed, runningSpeed * CADENCE_NOISE_PERCENT / 3))) : toMs(runningSpeed),
      'cadence': noiseEnabled ? Math.min(255, Math.max(0, Math.floor(gaussianRandom(runningCadence, runningCadence * CADENCE_NOISE_PERCENT / 3)))) : runningCadence
    });
  }
  catch( e ) {
    console.error(e);
  }

  setTimeout(notifyRSC, notificationInterval);
};

function listParams() {
  console.log(`\nBLE Sensor parameters:`);
  console.log(`\nCycling:`)
  console.log(`    Cadence: ${cadence} RPM`);
  console.log(`      Power: ${power} W`);
  console.log(`      Speed: ${powerMeterSpeed} km/h`);

  console.log('\nRunning:');

  console.log(`    Speed: ${runningSpeed} m/h, Pace: ${speedToPace(runningSpeed)} min/mi`);
  console.log(`    Cadence: ${Math.floor(runningCadence)} steps/min`);

  console.log(`\nNoise: ${noiseEnabled ? 'ON' : 'OFF'}`);
  console.log(`Increment: ${incr}`);
  console.log('\n');
}

function listKeys() {
  console.log(`\nList of Available Keys`);
  console.log('c/C - Decrease/Increase cycling cadence');
  console.log('p/P - Decrease/Increase cycling power');

  console.log('s/S - Decrease/Increase running speed');
  console.log('d/D - Decrease/Increase running cadence');

  console.log('\nr - Toggle sensor noise on/off');
  console.log('i/I - Decrease/Increase parameter increment');
  console.log('x/q - Exit');
  console.log();
}

function speedToPace(speed) {
  if( speed === 0 ) {
    return '00:00';
  }
  const t = 60 / speed;
  const minutes = Math.floor(t);
  const seconds = Math.floor((t - minutes) * 60);
  return minutes.toString().padStart(2,'0') + ':' + seconds.toString().padStart(2,'0');
}

function toMs(speed) {
  return (speed * 1.60934) / 3.6;
}

// Main
console.log(`[ZWack] Faking test data for sensor: ${sensorName}`);
console.log(`[ZWack]  Advertising these services: ${args.variable}`);


listKeys();
listParams();

// Comment or Uncomment each line depending on what is needed
if ( containsCSP && containsPWR && !containsCAD && !containsSPD ) { notifyPowerCSP(); }	// Simulate Cycling Power Service - Broadcasting Power ONLY
if ( containsCSP && containsPWR &&  containsCAD && !containsSPD ) { notifyCadenceCSP(); }	// Simulate Cycling Power Service  - Broadcasting Power and Cadence
if ( containsCSP && containsPWR &&  containsCAD &&  containsSPD ) { notifyCPCS(); }			// Simulate Cycling Power Service - Broadcasting Power and Cadence and Speed
if ( containsFTMS ) { notifyPowerFTMS(); } 													// Simulate FTMS Smart Trainer - Broadcasting Power and Cadence
if ( containsRSC  ) { notifyRSC(); }														// Simulate Running Speed and Cadence - Broadcasting Speed and Cadence
