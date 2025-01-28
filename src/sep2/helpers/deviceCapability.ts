import EventEmitter from 'events';
import { defaultPollPushRates, type SEP2Client } from '../client.js';
import { PollableResource } from './pollableResource.js';
import {
    parseDeviceCapabilityXml,
    type DeviceCapability,
} from '../models/deviceCapability.js';

export class DeviceCapabilityHelper extends EventEmitter<{
    data: [DeviceCapability];
}> {
    constructor({ client, href }: { client: SEP2Client; href: string }) {
        super();

        const resource = new DeviceCapabilityPollableResource({
            client,
            url: href,
            defaultPollRateSeconds: defaultPollPushRates.deviceCapabilityPoll,
        });

        resource.on('data', (data) => {
            this.emit('data', data);
        });
    }
}

class DeviceCapabilityPollableResource extends PollableResource<DeviceCapability> {
    async get({
        client,
        url,
        signal,
    }: {
        client: SEP2Client;
        url: string;
        signal: AbortSignal;
    }) {
        const xml = await client.get(url, { signal });

        return parseDeviceCapabilityXml(xml);
    }
}
