import { it, expect } from 'vitest';
import { objectToXml } from '../helpers/xml.js';
import {
    generateMirrorMeterReadingResponse,
    generateMirrorMeterReadingObject,
} from './mirrorMeterReading.js';
import { QualityFlags } from './qualityFlags.js';
import { CommodityType } from './commodityType.js';
import { KindType } from './kindType.js';
import { DataQualifierType } from './dataQualifierType.js';
import { FlowDirectionType } from './flowDirectionType.js';
import { PhaseCode } from './phaseCode.js';
import { UomType } from './uomType.js';
import { validateXml } from '../helpers/xsdValidator.js';

it('should generate MirrorMeterReading XML', () => {
    const response = generateMirrorMeterReadingResponse({
        mRID: 'AA00007301',
        description: 'Average W Reading - Phase A (Site)',
        lastUpdateTime: new Date(1659656880 * 1000),
        nextUpdateTime: new Date(1659657180 * 1000),
        version: 0,
        Reading: {
            timePeriod: {
                start: new Date(1659656880 * 1000),
                duration: 300,
            },
            qualityFlags: QualityFlags.Valid,
            value: 1500,
        },
        ReadingType: {
            commodity: CommodityType.ElectricitySecondaryMeteredValue,
            kind: KindType.Power,
            dataQualifier: DataQualifierType.Average,
            flowDirection: FlowDirectionType.Reverse,
            phase: PhaseCode.PhaseA,
            powerOfTenMultiplier: 0,
            intervalLength: 300,
            uom: UomType.W,
        },
    });

    const xml = objectToXml(response);

    expect(xml).toBe(`<?xml version="1.0"?>
<MirrorMeterReading xmlns="urn:ieee:std:2030.5:ns">
    <mRID>AA00007301</mRID>
    <description>Average W Reading - Phase A (Site)</description>
    <lastUpdateTime>1659656880</lastUpdateTime>
    <nextUpdateTime>1659657180</nextUpdateTime>
    <version>0</version>
    <Reading>
        <value>1500</value>
        <qualityFlags>0001</qualityFlags>
        <timePeriod>
            <start>1659656880</start>
            <duration>300</duration>
        </timePeriod>
    </Reading>
    <ReadingType>
        <commodity>1</commodity>
        <kind>37</kind>
        <dataQualifier>2</dataQualifier>
        <flowDirection>19</flowDirection>
        <powerOfTenMultiplier>0</powerOfTenMultiplier>
        <uom>38</uom>
        <intervalLength>300</intervalLength>
        <phase>128</phase>
    </ReadingType>
</MirrorMeterReading>`);
});

it('should generate MirrorMeterReading object', () => {
    const response = generateMirrorMeterReadingObject({
        mRID: 'AA00007301',
        description: 'Average W Reading - Phase A (Site)',
        lastUpdateTime: new Date(1659656880 * 1000),
        nextUpdateTime: new Date(1659657180 * 1000),
        version: 0,
        Reading: {
            qualityFlags: QualityFlags.Valid,
            value: 1500,
        },
        ReadingType: {
            commodity: CommodityType.ElectricitySecondaryMeteredValue,
            kind: KindType.Power,
            dataQualifier: DataQualifierType.Average,
            flowDirection: FlowDirectionType.Reverse,
            phase: PhaseCode.PhaseA,
            powerOfTenMultiplier: 0,
            intervalLength: 300,
            uom: UomType.W,
        },
    });

    const xml = objectToXml(response);

    expect(xml).toBe(`<?xml version="1.0"?>
<root>
    <mRID>AA00007301</mRID>
    <description>Average W Reading - Phase A (Site)</description>
    <lastUpdateTime>1659656880</lastUpdateTime>
    <nextUpdateTime>1659657180</nextUpdateTime>
    <version>0</version>
    <Reading>
        <value>1500</value>
        <qualityFlags>0001</qualityFlags>
    </Reading>
    <ReadingType>
        <commodity>1</commodity>
        <kind>37</kind>
        <dataQualifier>2</dataQualifier>
        <flowDirection>19</flowDirection>
        <powerOfTenMultiplier>0</powerOfTenMultiplier>
        <uom>38</uom>
        <intervalLength>300</intervalLength>
        <phase>128</phase>
    </ReadingType>
</root>`);
});

it('should generate XSD-valid MirrorMeterReading XML', () => {
    const response = generateMirrorMeterReadingResponse({
        mRID: 'AA00007301',
        description: 'Average W Reading - Phase A (Site)',
        lastUpdateTime: new Date(1659656880 * 1000),
        nextUpdateTime: new Date(1659657180 * 1000),
        version: 0,
        Reading: {
            qualityFlags: QualityFlags.Valid,
            value: 1500,
        },
        ReadingType: {
            commodity: CommodityType.ElectricitySecondaryMeteredValue,
            kind: KindType.Power,
            dataQualifier: DataQualifierType.Average,
            flowDirection: FlowDirectionType.Reverse,
            phase: PhaseCode.PhaseA,
            powerOfTenMultiplier: 0,
            intervalLength: 300,
            uom: UomType.W,
        },
    });

    const xml = objectToXml(response);
    const validation = validateXml(xml);

    expect(validation.valid).toBe(true);
});
