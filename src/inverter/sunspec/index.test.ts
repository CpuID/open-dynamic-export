import { describe, expect, it } from 'vitest';
import { ConnectStatusValue } from '../../sep2/models/connectStatus.js';
import { getGenConnectStatusFromPVConn } from './index.js';
import { PVConn } from '../../connections/sunspec/models/status.js';

describe('getGenConnectStatusFromPVConn', () => {
    it('should return 0 if inverter is disconnected', () => {
        const result = getGenConnectStatusFromPVConn({
            pvConn: 0 as PVConn,
            inverterW: 0,
        });

        expect(result).toEqual(0 as ConnectStatusValue);
    });

    it('should set Operating only when inverter W > 0', () => {
        const result = getGenConnectStatusFromPVConn({
            pvConn: PVConn.CONNECTED | PVConn.AVAILABLE | PVConn.OPERATING,
            inverterW: 100,
        });

        expect(result).toEqual(
            ConnectStatusValue.Available |
                ConnectStatusValue.Connected |
                ConnectStatusValue.Operating,
        );
    });

    it('should not set Operating when inverter W = 0', () => {
        const result = getGenConnectStatusFromPVConn({
            pvConn: PVConn.CONNECTED | PVConn.AVAILABLE | PVConn.OPERATING,
            inverterW: 0,
        });

        expect(result).toEqual(
            ConnectStatusValue.Available | ConnectStatusValue.Connected,
        );
    });

    it('should return 0 if inverter is available, operating (not connected)', () => {
        const result = getGenConnectStatusFromPVConn({
            pvConn: PVConn.AVAILABLE | PVConn.OPERATING,
            inverterW: 100,
        });

        // this is subject to debate
        // the following is the advise from SAPN
        // The current SAPN interpretation is that operating would mean operating as expected, in which case it could only be considered operating if it is connected and available. Therefore a connectstatus of 6 would not be possible in our implementation.
        // Our interpretation would be as follows:
        // Bit 0: Connected = AC connected
        // Bit 1: Available = AC connected and available to react to controls to increase or reduce energy dispatch
        // Bit 2: Operating = Connected, available, and currently observing a powerflow or carrying out a control to increase or reduce energy dispatch (eg. Includes opmodgenlimw = 0 but excludes opmodenergize = false)
        expect(result).toEqual(0);
    });
});
