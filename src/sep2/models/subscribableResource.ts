import { assertString } from '../helpers/assert.js';
import { stringToBoolean } from '../helpers/boolean.js';
import { parseResourceXmlObject, resourceSchema } from './resource.js';
import { z } from 'zod';

export const subscribableResourceSchema = z
    .object({
        subscribable: z.boolean(),
    })
    .merge(resourceSchema);

export type SubscribableResource = z.infer<typeof subscribableResourceSchema>;

export function parseSubscribableResourceXmlObject(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xmlObject: any,
): SubscribableResource {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const resource = parseResourceXmlObject(xmlObject);
    const subscribable = xmlObject['$']['subscribable']
        ? stringToBoolean(assertString(xmlObject['$']['subscribable']))
        : false;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    return {
        ...resource,
        subscribable,
    };
}
