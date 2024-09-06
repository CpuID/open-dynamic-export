export function stringIntToBoolean(value: string): boolean {
    switch (value) {
        case '0':
            return false;
        case '1':
            return true;
        default:
            throw new Error(`Invalid boolean int: ${value}`);
    }
}

export function booleanToString(value: boolean): string {
    switch (value) {
        case false:
            return '0';
        case true:
            return '1';
    }
}

export function stringToBoolean(value: string): boolean {
    switch (value) {
        case 'false':
            return false;
        case 'true':
            return true;
        default:
            throw new Error(`Invalid boolean string: ${value}`);
    }
}
