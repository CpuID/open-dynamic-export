import 'dotenv/config';
import {
    getCertificateFingerprint,
    getCertificateLfdi,
    getCertificateSfdi,
} from '../src/sep2/helpers/cert';
import { getConfig } from '../src/helpers/config';
import { getSep2Certificate } from '../src/helpers/sep2Cert';

const config = getConfig();
const sep2Certificate = getSep2Certificate(config);
const fingerprint = getCertificateFingerprint(sep2Certificate.cert);
const lfdi = getCertificateLfdi(fingerprint);
const sfdi = getCertificateSfdi(fingerprint);

console.log(`LFDI: ${lfdi}`);
console.log(`SFDI: ${sfdi}`);
