import type { ConnectStatus } from './connectStatus';
import { dateToStringSeconds } from '../helpers/date';
import { xmlns } from '../helpers/namespace';
import { numberToHex } from '../../helpers/number';

/// DER OperationalModeStatus value:
/// 0 - Not applicable / Unknown
/// 1 - Off
/// 2 - Operational mode
/// 3 - Test mode
/// All other values reserved.
export enum OperationalModeStatus {
    NotApplicable = 0,
    Off = 1,
    OperationalMode = 2,
    TestMode = 3,
}

export type DERStatus = {
    readingTime: Date;
    operationalModeStatus: {
        dateTime: Date;
        value: OperationalModeStatus;
    };
    genConnectStatus: {
        dateTime: Date;
        value: ConnectStatus;
    };
    // TODO: partially implemented
};

export function generateDerStatusResponse({
    readingTime,
    operationalModeStatus,
    genConnectStatus,
}: DERStatus) {
    return {
        DERStatus: {
            $: { xmlns: xmlns._ },
            readingTime: dateToStringSeconds(readingTime),
            operationalModeStatus: {
                dateTime: dateToStringSeconds(operationalModeStatus.dateTime),
                value: operationalModeStatus.value.toString(),
            },
            genConnectStatus: {
                dateTime: dateToStringSeconds(genConnectStatus.dateTime),
                value: numberToHex(genConnectStatus.value).padStart(2, '0'),
            },
        },
    };
}
