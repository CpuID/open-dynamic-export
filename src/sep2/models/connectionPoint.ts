import { assertString } from '../helpers/assert.js';
import { xmlns } from '../helpers/namespace.js';
import { z } from 'zod';

export const connectionPointSchema = z.object({
    connectionPointId: z.string().optional(),
});

export type ConnectionPoint = z.infer<typeof connectionPointSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseConnectionPointXml(xml: any): ConnectionPoint {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const object = xml['csipaus:ConnectionPoint'];
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    return parseConnectionPointXmlObject(object);
}

export function parseConnectionPointXmlObject(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xmlObject: any,
): ConnectionPoint {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    const connectionPointId = xmlObject['csipaus:connectionPointId']
        ? assertString(xmlObject['csipaus:connectionPointId'][0])
        : undefined;
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    return {
        connectionPointId,
    };
}

export function generateConnectionPointResponse({
    connectionPointId,
}: ConnectionPoint) {
    return {
        'csipaus:ConnectionPoint': {
            $: { 'xmlns:csipaus': xmlns.csipaus },
            'csipaus:connectionPointId': connectionPointId,
        },
    };
}
