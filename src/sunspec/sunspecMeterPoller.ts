import type { MeterModel } from './models/meter';
import type { MeterSunSpecConnection } from './connection/meter';
import EventEmitter from 'events';
import { logger as pinoLogger } from '../helpers/logger';
import {
    generateSiteMonitoringSample,
    type SiteMonitoringSample,
} from '../coordinator/helpers/siteMonitoring';

const logger = pinoLogger.child({ module: 'SunSpecMeterPoller' });

export class SunSpecMeterPoller extends EventEmitter<{
    data: [
        {
            metersData: {
                meter: MeterModel;
            }[];
            siteMonitoringSample: SiteMonitoringSample;
        },
    ];
}> {
    private metersConnections: MeterSunSpecConnection[];

    constructor({
        metersConnections,
    }: {
        metersConnections: MeterSunSpecConnection[];
    }) {
        super();

        this.metersConnections = metersConnections;

        void this.run();
    }

    async run() {
        const start = performance.now();

        try {
            const metersData = await Promise.all(
                this.metersConnections.map(async (meter) => {
                    return {
                        meter: await meter.getMeterModel(),
                    };
                }),
            );

            logger.trace({ metersData }, 'received data');

            const siteMonitoringSample = generateSiteMonitoringSample({
                meters: metersData.map(({ meter }) => meter),
            });

            logger.trace(
                { siteMonitoringSample },
                'generated site monitoring sample',
            );

            const end = performance.now();

            logger.trace({ duration: end - start }, 'run time');

            this.emit('data', {
                metersData,
                siteMonitoringSample,
            });
        } catch (error) {
            logger.error({ error }, 'Failed to poll SunSpec meters');
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
