import type { ControlsModel } from './models/controls.js';
import type { InverterModel } from './models/inverter.js';
import type { InverterSunSpecConnection } from './connection/inverter.js';
import EventEmitter from 'events';
import { logger as pinoLogger } from '../helpers/logger.js';
import type { NameplateModel } from './models/nameplate.js';
import type { SettingsModel } from './models/settings.js';
import type { StatusModel } from './models/status.js';
import { type DerMonitoringSample } from '../coordinator/helpers/derMonitoringSample.js';
import { getAggregatedInverterMetrics } from './helpers/inverterMetrics.js';
import { assertNonNull } from '../helpers/null.js';

const logger = pinoLogger.child({ module: 'SunSpecInverterPoller' });

export class SunSpecInverterPoller extends EventEmitter<{
    data: [
        {
            invertersData: {
                inverter: InverterModel;
                nameplate: NameplateModel;
                settings: SettingsModel;
                status: StatusModel;
                controls: ControlsModel;
            }[];
            derMonitoringSample: DerMonitoringSample;
        },
    ];
}> {
    private invertersConnections: InverterSunSpecConnection[];

    constructor({
        invertersConnections,
    }: {
        invertersConnections: InverterSunSpecConnection[];
    }) {
        super();

        this.invertersConnections = invertersConnections;

        void this.run();
    }

    async run() {
        const start = performance.now();

        try {
            const invertersData = await Promise.all(
                this.invertersConnections.map(async (inverter) => {
                    // it's not practical to parallelize these calls because the ModBus connection can only practically handle one request at a time
                    // the best we can do is parallelize multiple inverters and meters which are independent connections
                    return {
                        inverter: await inverter.getInverterModel(),
                        nameplate: await inverter.getNameplateModel(),
                        settings: await inverter.getSettingsModel(),
                        status: await inverter.getStatusModel(),
                        controls: await inverter.getControlsModel(),
                    };
                }),
            );

            logger.trace({ invertersData }, 'received data');

            const derMonitoringSample = generateDerMonitoringSample({
                inverters: invertersData.map(({ inverter }) => inverter),
            });

            logger.trace(
                { derMonitoringSample },
                'generated DER monitoring sample',
            );

            const end = performance.now();

            logger.trace({ duration: end - start }, 'run time');

            this.emit('data', {
                invertersData,
                derMonitoringSample,
            });
        } catch (error) {
            logger.error({ error }, 'Failed to poll SunSpec inverters');
        } finally {
            // this loop must meet sampling requirements and dynamic export requirements
            // Energex SEP2 Client Handbook specifies "As per the standard, samples should be taken every 200ms (10 cycles). If not capable of sampling this frequently, 1 second samples may be sufficient."
            // SA Power Networks – Dynamic Exports Utility Interconnection Handbook specifies "Average readings shall be generated by sampling at least every 5 seconds. For example, sample rates of less than 5 seconds are permitted."
            // we don't want to run this loop any more frequently than every 200ms to prevent overloading the SunSpec connection
            const end = performance.now();
            const duration = end - start;
            const delay = Math.max(200 - duration, 0);

            setTimeout(() => {
                void this.run();
            }, delay);
        }
    }
}

export function generateDerMonitoringSample({
    inverters,
}: {
    inverters: InverterModel[];
}): DerMonitoringSample {
    const aggregatedInverterMetrics = getAggregatedInverterMetrics(inverters);

    return {
        date: new Date(),
        realPower: {
            type: 'noPhase',
            value: aggregatedInverterMetrics.W,
        },
        reactivePower: {
            type: 'noPhase',
            value: aggregatedInverterMetrics.VAr ?? 0,
        },
        voltage: {
            type: 'perPhase',
            phaseA: assertNonNull(aggregatedInverterMetrics.PhVphA),
            phaseB: aggregatedInverterMetrics.PhVphB,
            phaseC: aggregatedInverterMetrics.PhVphC,
        },
        frequency: aggregatedInverterMetrics.Hz,
    };
}
