import { defaultPollPushRates, type SEP2Client } from '../client.js';
import { PollableResource } from './pollableResource.js';
import { type Time } from '../models/time.js';
import { parseTimeXml } from '../models/time.js';
import { type Logger } from 'pino';
import { pinoLogger } from '../../helpers/logger.js';

export class TimeHelper {
    private href: string | null = null;
    private client: SEP2Client;
    private timePollableResource: TimePollableResource | null = null;
    private logger: Logger;

    constructor({ client }: { client: SEP2Client }) {
        this.client = client;
        this.logger = pinoLogger.child({ module: 'TimeHelper' });
    }

    public updateHref({ href }: { href: string }) {
        if (this.href !== href) {
            this.href = href;

            this.timePollableResource?.destroy();

            this.timePollableResource = new TimePollableResource({
                client: this.client,
                url: href,
                defaultPollRateSeconds:
                    defaultPollPushRates.deviceCapabilityPoll,
            }).on('data', (data) => {
                this.assertTime(data);
            });
        }

        return this;
    }

    private assertTime(time: Time) {
        const now = new Date();
        const delta = now.getTime() - time.currentTime.getTime();

        // 1 minute tolerance
        if (Math.abs(delta) > 60 * 1_000) {
            throw new Error(
                `Clock is not synced with Utility Server, delta ${delta}ms`,
            );
        }

        this.logger.info(
            `Clock is synced with Utility Server, delta ${delta}ms`,
        );
    }

    public destroy() {
        this.timePollableResource?.destroy();
    }
}

class TimePollableResource extends PollableResource<Time> {
    async get({
        client,
        url,
        signal,
    }: {
        client: SEP2Client;
        url: string;
        signal: AbortSignal;
    }) {
        const xml = await client.get(url, {
            signal,
        });

        return parseTimeXml(xml);
    }
}
