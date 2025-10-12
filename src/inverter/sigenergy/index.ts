import { type Config } from '../../helpers/config.js';
import { SunSpecInverterDataPoller } from '../sunspec/index.js';

/**
 * Sigenergy Inverter Data Poller
 *
 * Sigenergy inverters use the SunSpec Modbus protocol, so this class
 * extends the SunSpec implementation with Sigenergy-specific branding.
 */
export class SigenergyInverterDataPoller extends SunSpecInverterDataPoller {
    constructor({
        sigenergyInverterConfig,
        inverterIndex,
        applyControl,
    }: {
        sigenergyInverterConfig: Extract<
            Config['inverters'][number],
            { type: 'sigenergy' }
        >;
        inverterIndex: number;
        applyControl: boolean;
    }) {
        // Sigenergy inverters use SunSpec protocol, so we can reuse the SunSpec implementation
        // Convert the sigenergy config to a sunspec config by changing the type
        const sunspecConfig = {
            ...sigenergyInverterConfig,
            type: 'sunspec' as const,
        };

        super({
            sunspecInverterConfig: sunspecConfig,
            applyControl,
            inverterIndex,
        });

        // Update logger name to reflect Sigenergy branding
        this.logger = this.logger.child({ inverter: 'sigenergy' });
    }
}
