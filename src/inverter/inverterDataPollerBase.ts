import type { Logger } from 'pino';
import { logger as pinoLogger } from '../helpers/logger.js';
import EventEmitter from 'node:events';
import type { Result } from '../helpers/result.js';
import type { InverterData } from './inverterData.js';
import type { InverterConfiguration } from '../coordinator/helpers/inverterController.js';
import { writeLatency } from '../helpers/influxdb.js';

export abstract class InverterDataPollerBase extends EventEmitter<{
    data: [Result<InverterData>];
}> {
    protected logger: Logger;
    private pollingIntervalMs;
    private pollingTimer: NodeJS.Timeout | null = null;
    private inverterDataCache: Result<InverterData> | null = null;
    protected applyControl: boolean;
    private inverterIndex: number;
    private inverterPollerName: string;

    constructor({
        name,
        inverterIndex,
        pollingIntervalMs,
        applyControl,
    }: {
        name: string;
        inverterIndex: number;
        // how frequently at most to poll the data
        pollingIntervalMs: number;
        applyControl: boolean;
    }) {
        super();

        this.pollingIntervalMs = pollingIntervalMs;
        this.logger = pinoLogger.child({
            module: 'InverterDataPollerBase',
            inverterPollerName: name,
            inverterIndex,
        });
        this.applyControl = applyControl;
        this.inverterIndex = inverterIndex;
        this.inverterPollerName = name;
    }

    public destroy() {
        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
        }

        this.onDestroy();
    }

    abstract getInverterData(): Promise<Result<InverterData>>;

    abstract onControl(
        inverterConfiguration: InverterConfiguration,
    ): Promise<void>;

    abstract onDestroy(): void;

    get getInverterDataCache(): Result<InverterData> | null {
        return this.inverterDataCache;
    }

    protected async startPolling() {
        const start = performance.now();

        const inverterData = await this.getInverterData();

        this.inverterDataCache = inverterData;

        const end = performance.now();
        const duration = end - start;

        this.logger.trace({ duration, inverterData }, 'polled inverter data');

        writeLatency({
            field: 'inverterDataPoller',
            duration,
            tags: {
                inverterIndex: this.inverterIndex.toString(),
                inverterPollerName: this.inverterPollerName,
            },
        });

        // this loop must meet sampling requirements and dynamic export requirements
        // Energex SEP2 Client Handbook specifies "As per the standard, samples should be taken every 200ms (10 cycles). If not capable of sampling this frequently, 1 second samples may be sufficient."
        // SA Power Networks – Dynamic Exports Utility Interconnection Handbook specifies "Average readings shall be generated by sampling at least every 5 seconds. For example, sample rates of less than 5 seconds are permitted."
        // we don't want to run this loop any more frequently than the polling interval to prevent overloading the connection
        const delay = Math.max(this.pollingIntervalMs - duration, 0);

        this.pollingTimer = setTimeout(() => {
            void this.startPolling();
        }, delay);

        this.emit('data', inverterData);
    }
}
