import { it, expect } from 'vitest';
import { objectToXml } from '../helpers/xml.js';
import { generateDerCapability } from './derCapability.js';
import { DERControlType } from './derControlType.js';
import { DOEModesSupportedType } from './doeModesSupportedType.js';
import { DERType } from './derType.js';

it('should generate DERCapability XML', () => {
    const response = generateDerCapability({
        modesSupported:
            DERControlType.opModEnergize |
            DERControlType.opModFixedW |
            DERControlType.opModMaxLimW |
            DERControlType.opModTargetW,
        doeModesSupported:
            DOEModesSupportedType.opModExpLimW |
            DOEModesSupportedType.opModGenLimW |
            DOEModesSupportedType.opModImpLimW |
            DOEModesSupportedType.opModLoadLimW,
        type: DERType.VirtualOrMixedDER,
        rtgMaxVA: {
            multiplier: 3,
            value: 52.5,
        },
        rtgMaxW: {
            multiplier: 3,
            value: 50,
        },
        rtgMaxVar: {
            multiplier: 3,
            value: 2.5,
        },
        rtgVNom: {
            multiplier: 0,
            value: 230,
        },
    });

    const xml = objectToXml(response);

    expect(xml).toBe(`<?xml version="1.0"?>
<DERCapability xmlns="urn:ieee:std:2030.5:ns" xmlns:csipaus="https://csipaus.org/ns">
    <modesSupported>00500088</modesSupported>
    <csipaus:doeModesSupported>0000000F</csipaus:doeModesSupported>
    <type>1</type>
    <rtgMaxVA>
        <multiplier>3</multiplier>
        <value>52.5</value>
    </rtgMaxVA>
    <rtgMaxW>
        <multiplier>3</multiplier>
        <value>50</value>
    </rtgMaxW>
    <rtgMaxVar>
        <multiplier>3</multiplier>
        <value>2.5</value>
    </rtgMaxVar>
    <rtgVNom>
        <multiplier>0</multiplier>
        <value>230</value>
    </rtgVNom>
</DERCapability>`);
});

it('should generate DERCapability XML without optional fields', () => {
    const response = generateDerCapability({
        modesSupported:
            DERControlType.opModEnergize |
            DERControlType.opModFixedW |
            DERControlType.opModMaxLimW |
            DERControlType.opModTargetW,
        doeModesSupported:
            DOEModesSupportedType.opModExpLimW |
            DOEModesSupportedType.opModGenLimW |
            DOEModesSupportedType.opModImpLimW |
            DOEModesSupportedType.opModLoadLimW,
        type: DERType.VirtualOrMixedDER,
        rtgMaxVA: {
            multiplier: 3,
            value: 52.5,
        },
        rtgMaxW: {
            multiplier: 3,
            value: 50,
        },
        rtgMaxVar: {
            multiplier: 3,
            value: 2.5,
        },
        rtgVNom: undefined,
    });

    const xml = objectToXml(response);

    expect(xml).toBe(`<?xml version="1.0"?>
<DERCapability xmlns="urn:ieee:std:2030.5:ns" xmlns:csipaus="https://csipaus.org/ns">
    <modesSupported>00500088</modesSupported>
    <csipaus:doeModesSupported>0000000F</csipaus:doeModesSupported>
    <type>1</type>
    <rtgMaxVA>
        <multiplier>3</multiplier>
        <value>52.5</value>
    </rtgMaxVA>
    <rtgMaxW>
        <multiplier>3</multiplier>
        <value>50</value>
    </rtgMaxW>
    <rtgMaxVar>
        <multiplier>3</multiplier>
        <value>2.5</value>
    </rtgMaxVar>
</DERCapability>`);
});
