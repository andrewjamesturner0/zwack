# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zwack is a Node.js Bluetooth Low Energy (BLE) simulator that emulates indoor bike trainers and fitness sensors. It implements three BLE GATT profiles: Cycling Power (CSP/0x1818), Running Speed & Cadence (RSC/0x1814), and Fitness Machine (FTMS/0x1826). Built on top of the `@abandonware/bleno` library.

Requires Node.js >= 18. Uses ES modules (`"type": "module"` in package.json).

## Commands

```bash
# Run the interactive simulator (all services)
npm run simulator -- --variable=ftms --variable=rsc --variable=csp --variable=power --variable=cadence --variable=speed

# Debug output for specific service
DEBUG=csp npm run simulator    # Cycling Power
DEBUG=rsc npm run simulator    # Running Speed & Cadence
DEBUG=ftms npm run simulator   # Fitness Machine
DEBUG=ble npm run simulator    # BLE layer
DEBUG=* npm run simulator      # All debug output

# No test suite exists
```

## Architecture

The codebase uses ES modules throughout and follows a BLE GATT service/characteristic hierarchy:

- **`index.js`** — Entry point, exports `ZwackBLE`
- **`lib/zwack-ble-sensor.js`** — Main orchestrator. Creates services based on options, manages bleno advertising and state transitions
- **`example/simulator.js`** — Interactive CLI app with keyboard controls for adjusting power, cadence, speed in real-time

**Service modules** (each under `lib/`):
- **`cps/`** — Cycling Power Service: measurement (notify), Wahoo trainer extension (write), features, sensor location
- **`ftms/`** — Fitness Machine Service: indoor bike data (notify), control point (write/indicate for target power, simulation params), status, features, power range
- **`rsc/`** — Running Speed & Cadence: measurement (notify), features, sensor location
- **`dis/`** — Device Information Service: static metadata characteristics

**Key patterns:**
- Each characteristic extends bleno's `Characteristic` class and implements `onSubscribe`/`onUnsubscribe` for notifications or `onWriteRequest` for control points
- `lib/flags.js` provides bit-level flag manipulation for BLE characteristic data fields
- `lib/read-characteristic.js` is a reusable read-only characteristic base class
- Data is packed into `Buffer` objects per Bluetooth SIG specifications (little-endian integers)
- Debug logging uses the `debug` package with namespaces: `ble`, `csp`, `cspw`, `rsc`, `ftms`

## Requirements

- Node.js >= 18 on macOS or Linux (bleno does not support Windows well)
- May need Xcode command-line tools on macOS for native module compilation
