import { it, expect } from 'vitest';
import { numberToHex } from '../../helpers/number.js';
import { DOEModesSupportedType } from './doeModesSupportedType.js';

it('value is expected', () => {
    const value =
        DOEModesSupportedType.opModExpLimW |
        DOEModesSupportedType.opModGenLimW |
        DOEModesSupportedType.opModImpLimW |
        DOEModesSupportedType.opModLoadLimW;

    const hex = numberToHex(value).padStart(8, '0');

    expect(hex).toBe('0000000F');
});
