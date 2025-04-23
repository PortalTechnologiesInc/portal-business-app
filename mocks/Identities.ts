import { Identity } from '../models/Identity';

export function getMockedIdentities(): Identity[] {
    return [
        { name: 'Personal', publicKey: 'abcdef1234567890' },
        { name: 'Work', publicKey: 'bcdefg2345678901' },
        { name: 'Gaming', publicKey: 'cdefgh3456789012' },
    ];
}
