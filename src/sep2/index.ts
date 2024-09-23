import type { RampRateHelper } from './helpers/rampRate.js';
import type { Config } from '../helpers/config.js';
import { env } from '../helpers/env.js';
import { logger } from '../helpers/logger.js';
import { SEP2Client } from './client.js';
import { Sep2Limiter } from '../limiters/sep2/index.js';
import { DerHelper } from './helpers/der.js';
import { DerControlsHelper } from './helpers/derControls.js';
import { DerListHelper } from './helpers/derList.js';
import { EndDeviceListHelper } from './helpers/endDeviceList.js';
import { FunctionSetAssignmentsListHelper } from './helpers/functionSetAssignmentsList.js';
import { MirrorUsagePointListHelper } from './helpers/mirrorUsagePointList.js';
import { TimeHelper } from './helpers/time.js';
import { getSep2Certificate } from '../helpers/sep2Cert.js';
import type { EndDeviceList } from './models/endDeviceList.js';
import {
    generateEndDeviceResponse,
    parseEndDeviceXml,
} from './models/endDevice.js';
import { objectToXml } from './helpers/xml.js';
import { generateConnectionPointResponse } from './models/connectionPoint.js';
import { RegistrationHelper } from './helpers/registration.js';

export type Sep2Instance = {
    sep2Client: SEP2Client;
    derHelper: DerHelper;
    mirrorUsagePointListHelper: MirrorUsagePointListHelper;
    limiter: Sep2Limiter;
};

export function getSep2Instance({
    config,
    rampRateHelper,
}: {
    config: Config;
    rampRateHelper: RampRateHelper;
}): Sep2Instance | null {
    if (!config.limiters.sep2) {
        return null;
    }

    const sep2Certificate = getSep2Certificate();

    const sep2Client = new SEP2Client({
        sep2Config: config.limiters.sep2,
        cert: sep2Certificate.cert,
        key: sep2Certificate.key,
        pen: env.SEP2_PEN,
    });

    const timeHelper: TimeHelper = new TimeHelper({
        client: sep2Client,
    });

    const endDeviceListHelper: EndDeviceListHelper = new EndDeviceListHelper({
        client: sep2Client,
    });

    const registrationHelper = new RegistrationHelper({
        client: sep2Client,
    });

    const derListHelper = new DerListHelper({
        client: sep2Client,
    });

    const derHelper = new DerHelper({
        client: sep2Client,
        rampRateHelper,
    });

    const functionSetAssignmentsListHelper =
        new FunctionSetAssignmentsListHelper({
            client: sep2Client,
        });

    const mirrorUsagePointListHelper = new MirrorUsagePointListHelper({
        client: sep2Client,
    });

    const limiter = new Sep2Limiter({
        client: sep2Client,
        rampRateHelper,
    });

    const derControlsHelper = new DerControlsHelper({
        client: sep2Client,
    }).on('data', (data) => {
        logger.debug(data, 'DER controls data changed');

        limiter.updateSep2ControlsData(data);

        rampRateHelper.setDefaultDERControlRampRate(
            data.fallbackControl.type === 'default'
                ? (data.fallbackControl.data.defaultControl.setGradW ?? null)
                : null,
        );
    });

    endDeviceListHelper.on('data', (endDeviceList) => {
        void (async () => {
            logger.debug({ endDeviceList }, 'Received SEP2 end device list');

            const endDevice = await getOrCreateEndDevice({ endDeviceList });

            if (endDevice.enabled !== true) {
                throw new Error('End device is not enabled');
            }

            if (endDevice.derListLink) {
                derListHelper.updateHref({
                    href: endDevice.derListLink.href,
                });
            }

            if (endDevice.functionSetAssignmentsListLink) {
                functionSetAssignmentsListHelper.updateHref({
                    href: endDevice.functionSetAssignmentsListLink.href,
                });
            }

            if (endDevice.connectionPointLink?.href) {
                await putConnectionPointId({
                    connectionPointHref: endDevice.connectionPointLink.href,
                });
            }

            if (endDevice.registrationLink) {
                registrationHelper.updateHref({
                    href: endDevice.registrationLink.href,
                });
            }
        })();
    });

    derListHelper.on('data', (derList) => {
        logger.debug({ derList }, 'Received SEP2 end device DER list');

        if (derList.ders.length !== 1) {
            throw new Error(
                `DERS list length is not 1, actual length ${derList.ders.length}`,
            );
        }

        const der = derList.ders.at(0)!;

        derHelper.configureDer({
            der,
            pollRate: derList.pollRate,
        });
    });

    functionSetAssignmentsListHelper.on(
        'data',
        (functionSetAssignmentsList) => {
            logger.debug(
                { functionSetAssignmentsList },
                'Received SEP2 function set assignments list',
            );

            void derControlsHelper.updateFsaData(functionSetAssignmentsList);
        },
    );

    logger.info('Discovering SEP2');

    sep2Client.discover().on('data', (deviceCapability) => {
        logger.debug({ deviceCapability }, 'Received SEP2 device capability');

        timeHelper.updateHref({
            href: deviceCapability.timeLink.href,
        });

        endDeviceListHelper.updateHref({
            href: deviceCapability.endDeviceListLink.href,
        });

        mirrorUsagePointListHelper.updateHref({
            href: deviceCapability.mirrorUsagePointListLink.href,
        });
    });

    async function getOrCreateEndDevice({
        endDeviceList,
    }: {
        endDeviceList: EndDeviceList;
    }) {
        // as a direct client, we expect only one end device that matches the LFDI of our certificate
        const endDevice = endDeviceList.endDevices.find(
            (endDevice) =>
                endDevice.lFDI === sep2Client.lfdi &&
                endDevice.enabled === true,
        );

        if (endDevice) {
            return endDevice;
        }

        const endDeviceListHref = endDeviceList.href;
        if (!endDeviceListHref) {
            throw new Error('Missing endDeviceList href');
        }

        return postEndDevice({
            endDeviceListHref,
        });
    }

    async function postEndDevice({
        endDeviceListHref,
    }: {
        endDeviceListHref: string;
    }) {
        const data = generateEndDeviceResponse({
            lFDI: sep2Client.lfdi,
            sFDI: sep2Client.sfdi,
            changedTime: new Date(),
            enabled: true,
        });
        const xml = objectToXml(data);

        const response = await sep2Client.post(endDeviceListHref, xml);

        const locationHeader = response.headers['location'] as
            | string
            | undefined;

        if (!locationHeader) {
            throw new Error('Missing location header');
        }

        return parseEndDeviceXml(await sep2Client.get(locationHeader));
    }

    async function putConnectionPointId({
        connectionPointHref,
    }: {
        connectionPointHref: string;
    }) {
        const nmi = config.limiters.sep2?.nmi;

        if (!nmi) {
            throw new Error(
                'Missing NMI for CSIP-AUS ConnectionPoint in-band registration',
            );
        }

        const data = generateConnectionPointResponse({
            connectionPointId: nmi,
        });
        const xml = objectToXml(data);

        await sep2Client.put(connectionPointHref, xml);
    }

    return {
        sep2Client,
        derHelper,
        mirrorUsagePointListHelper,
        limiter,
    };
}
