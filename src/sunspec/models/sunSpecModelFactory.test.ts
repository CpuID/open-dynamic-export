import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    convertReadRegisters,
    convertWriteRegisters,
    sunSpecModelFactory,
    type Mapping,
} from './sunSpecModelFactory';
import {
    int16ToRegisters,
    registersToInt16,
    registersToString,
    registersToUint16,
    uint16ToRegisters,
} from '../helpers/converters';
import { InverterSunSpecConnection } from '../connection/inverter';
import { SunSpecConnection } from '../connection/base';

vi.mock('modbus-serial', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        // mocking the ModbusRTU class default export
        default: vi.fn().mockReturnValue({
            // not sure if there's another way to implement the actual ModbusRTU class
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            on: (actual as any).prototype.on,
            // mock functions to allow connection state to be set
            connectTCP: vi.fn(),
            setID: vi.fn(),
            setTimeout: vi.fn(),
            readHoldingRegisters: vi.fn(),
            writeRegisters: vi.fn(),
        }),
    };
});

type Model = {
    ID: number;
    Hello: number;
    World: number;
    Test: string;
};

type ModelWrite = Pick<Model, 'Hello' | 'World'>;

const mapping: Mapping<Model, keyof ModelWrite> = {
    ID: {
        start: 0,
        end: 1,
        readConverter: registersToUint16,
    },
    Hello: {
        start: 1,
        end: 2,
        readConverter: registersToUint16,
        writeConverter: uint16ToRegisters,
    },
    World: {
        start: 2,
        end: 3,
        readConverter: registersToInt16,
        writeConverter: int16ToRegisters,
    },
    Test: {
        start: 3,
        end: 6,
        readConverter: registersToString,
    },
};

it('convertReadRegisters should convert registers to model', () => {
    const registers: number[] = [
        0x0001, 0x0011, 0x0111, 0x6865, 0x6c6c, 0x6f00,
    ];

    const result = convertReadRegisters({
        registers,
        mapping,
    });

    expect(result).toStrictEqual({
        ID: 1,
        Hello: 17,
        World: 273,
        Test: 'hello',
    });
});

it('convertWriteRegisters should convert registers to model', () => {
    const values = {
        Hello: 3,
        World: -128,
    } satisfies ModelWrite;

    const result = convertWriteRegisters({
        values,
        mapping,
        length: 6,
    });

    expect(result).toEqual([0, 3, 0xff80, 0, 0, 0]);
});

describe('sunSpecModelFactory', () => {
    let inverterSunSpecConnection: InverterSunSpecConnection;

    const model = sunSpecModelFactory<Model, keyof ModelWrite>({
        mapping,
    });

    beforeEach(() => {
        inverterSunSpecConnection = new InverterSunSpecConnection({
            ip: '127.0.0.1',
            port: 502,
            unitId: 1,
        });

        // intercept SunSpecConnection scanModelAddresses to prevent actual scanning
        vi.spyOn(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            SunSpecConnection.prototype as any,
            'scanModelAddresses',
        ).mockResolvedValue(new Map());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('sunSpecModelFactory.read returns correct data', async () => {
        const readHoldingRegistersMock = vi
            .spyOn(inverterSunSpecConnection.client, 'readHoldingRegisters')
            .mockResolvedValue({
                data: [0x0001, 0x0011, 0x0111, 0x6865, 0x6c6c, 0x6f00],
                buffer: Buffer.from([]), // buffer value is not used
            });

        const result = await model.read({
            modbusConnection: inverterSunSpecConnection,
            address: { start: 40000, length: 6 },
        });

        expect(result).toEqual({
            ID: 1,
            Hello: 17,
            World: 273,
            Test: 'hello',
        });

        expect(readHoldingRegistersMock).toHaveBeenCalledOnce();
        expect(readHoldingRegistersMock).toHaveBeenCalledWith(40000, 6);
    });

    it('sunSpecModelFactory.write returns if data updated', async () => {
        const writeRegistersMock = vi
            .spyOn(inverterSunSpecConnection.client, 'writeRegisters')
            .mockResolvedValue({ address: 40000, length: 6 });

        // after write
        const readHoldingRegistersMock = vi
            .spyOn(inverterSunSpecConnection.client, 'readHoldingRegisters')
            .mockResolvedValue({
                data: [0x0001, 0x00003, 0xff80, 0x6865, 0x6c6c, 0x6f00],
                buffer: Buffer.from([]), // buffer value is not used
            });

        const values = {
            Hello: 3,
            World: -128,
        } satisfies ModelWrite;

        await expect(
            model.write({
                values,
                modbusConnection: inverterSunSpecConnection,
                address: { start: 40000, length: 6 },
            }),
        ).resolves.toBeUndefined();

        expect(writeRegistersMock).toHaveBeenCalledOnce();
        expect(writeRegistersMock).toHaveBeenCalledWith(
            40000,
            [0, 3, 0xff80, 0, 0, 0],
        );
        expect(readHoldingRegistersMock).toHaveBeenCalledOnce();
        expect(readHoldingRegistersMock).toHaveBeenCalledWith(40000, 6);
    });

    it('sunSpecModelFactory.write throw if data is not updated', async () => {
        const writeRegistersMock = vi
            .spyOn(inverterSunSpecConnection.client, 'writeRegisters')
            .mockResolvedValue({ address: 40000, length: 6 });

        // after write
        const readHoldingRegistersMock = vi
            .spyOn(inverterSunSpecConnection.client, 'readHoldingRegisters')
            .mockResolvedValue({
                data: [0x0001, 0x000011, 0xff80, 0x6865, 0x6c6c, 0x6f00],
                buffer: Buffer.from([]), // buffer value is not used
            });

        const values = {
            Hello: 3,
            World: -128,
        } satisfies ModelWrite;

        await expect(
            model.write({
                values,
                modbusConnection: inverterSunSpecConnection,
                address: { start: 40000, length: 6 },
            }),
        ).rejects.toThrowError('Failed to write value for key Hello.');

        expect(writeRegistersMock).toHaveBeenCalledOnce();
        expect(writeRegistersMock).toHaveBeenCalledWith(
            40000,
            [0, 3, 0xff80, 0, 0, 0],
        );
        expect(readHoldingRegistersMock).toHaveBeenCalledOnce();
        expect(readHoldingRegistersMock).toHaveBeenCalledWith(40000, 6);
    });
});
