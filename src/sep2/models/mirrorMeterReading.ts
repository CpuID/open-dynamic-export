import { numberToHex } from '../../helpers/number.js';
import type { CommodityType } from './commodityType.js';
import type { DataQualifierType } from './dataQualifierType.js';
import { dateToStringSeconds } from '../helpers/date.js';
import type { FlowDirectionType } from './flowDirectionType.js';
import type { KindType } from './kindType.js';
import { xmlns } from '../helpers/namespace.js';
import { PhaseCode } from './phaseCode.js';
import type { QualityFlags } from './qualityFlags.js';
import type { UomType } from './uomType.js';
import type { IdentifiedObject } from './identifiedObject.js';

// reading MRID should be a random UUIDv4 with the PEN
export type MirrorMeterReading = {
    lastUpdateTime: Date;
    nextUpdateTime: Date;
    Reading: {
        qualityFlags: QualityFlags;
        value: number;
    };
    ReadingType: {
        commodity: CommodityType;
        kind: KindType;
        dataQualifier: DataQualifierType;
        flowDirection: FlowDirectionType;
        phase: PhaseCode;
        powerOfTenMultiplier: number;
        // Default interval length specified in seconds.
        intervalLength: number;
        uom: UomType;
    };
} & IdentifiedObject;

export function generateMirrorMeterReadingResponse({
    mRID,
    description,
    lastUpdateTime,
    nextUpdateTime,
    version,
    Reading,
    ReadingType,
}: MirrorMeterReading) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: { MirrorMeterReading: any } = {
        MirrorMeterReading: {
            $: { xmlns: xmlns._ },
            mRID,
            description,
            lastUpdateTime: dateToStringSeconds(lastUpdateTime),
            nextUpdateTime: dateToStringSeconds(nextUpdateTime),
            version,
            Reading: {
                qualityFlags: numberToHex(Reading.qualityFlags).padStart(
                    4,
                    '0',
                ),
                value: Reading.value,
            },
            ReadingType: {
                commodity: ReadingType.commodity,
                kind: ReadingType.kind,
                dataQualifier: ReadingType.dataQualifier,
                flowDirection: ReadingType.flowDirection,
                powerOfTenMultiplier: ReadingType.powerOfTenMultiplier,
                intervalLength: ReadingType.intervalLength,
                uom: ReadingType.uom,
            },
        },
    };

    // the SEP2 server can't seem to handle phase code 0 even though it is documented as a valid value
    // conditionally set phase if it's not 0
    // {
    //     "error": true,
    //     "statusCode": "ERR-MONITOR-0000",
    //     "statusMessage": "Unknown 0 Phase Code!"
    //   }
    if (ReadingType.phase !== PhaseCode.NotApplicable) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        response.MirrorMeterReading.ReadingType.phase = ReadingType.phase;
    }

    return response;
}
