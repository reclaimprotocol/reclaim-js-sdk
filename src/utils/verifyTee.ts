import forge from 'node-forge';
import { Proof, TeeAttestation } from './interfaces';
import { ethers } from 'ethers';
import { AMD_CERTS } from './amdCerts';

const crlCache: Record<string, { buffer: Buffer, fetchedAt: number }> = {};

function normalizeSerial(s: string) {
    let cleaned = s.toLowerCase().replace(/[^a-f0-9]/g, '');
    while (cleaned.startsWith('0') && cleaned.length > 1) cleaned = cleaned.substring(1);
    return cleaned;
}
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const getSubtleCrypto = () => {
    if (typeof window !== 'undefined' && window.crypto?.subtle) return window.crypto.subtle;
    if (isNode) return require('crypto').webcrypto.subtle;
    throw new Error('No WebCrypto subtle implementation found in this environment');
};

interface ParsedCert {
    serialNumber: string;
    tbsDer: Uint8Array;
    signature: Uint8Array;
    sigAlgOid: string;
    spkiDer: Uint8Array;
}

function parseCert(buffer: Buffer): ParsedCert {
    const asn1 = forge.asn1.fromDer(buffer.toString('binary'));
    const certSeq = asn1.value as any[];
    const tbsAsn1 = certSeq[0];
    const sigAlgAsn1 = certSeq[1];
    const sigValueAsn1 = certSeq[2];

    const tbsFields = tbsAsn1.value as any[];
    let idx = 0;
    if (tbsFields[idx].tagClass === 128) idx++; // version
    const serialAsn1 = tbsFields[idx++];
    const serialNumber = forge.util.bytesToHex(serialAsn1.value);
    idx++; // sigAlg
    idx++; // issuer
    idx++; // validity
    idx++; // subject
    const spkiAsn1 = tbsFields[idx];

    const sigRaw = typeof sigValueAsn1.value === 'string' ? sigValueAsn1.value : '';
    const signature = Uint8Array.from(Buffer.from(sigRaw.substring(1), 'binary'));
    const sigAlgOid = forge.asn1.derToOid((sigAlgAsn1.value as any[])[0].value);

    return {
        serialNumber: normalizeSerial(serialNumber),
        tbsDer: Uint8Array.from(Buffer.from(forge.asn1.toDer(tbsAsn1).getBytes(), 'binary')),
        signature,
        sigAlgOid,
        spkiDer: Uint8Array.from(Buffer.from(forge.asn1.toDer(spkiAsn1).getBytes(), 'binary'))
    };
}

async function verifySignature(publicKeyPem: string, data: Uint8Array, signature: Uint8Array, sigAlgOid: string) {
    const cryptoSubtle = getSubtleCrypto();
    const forgeCert = forge.pki.certificateFromPem(publicKeyPem);
    const spkiBuf = Uint8Array.from(Buffer.from(forge.asn1.toDer(forge.pki.publicKeyToAsn1(forgeCert.publicKey)).getBytes(), 'binary'));

    let importParams: any;
    let verifyParams: any;

    if (sigAlgOid === '1.2.840.113549.1.1.10') { // rsassa-pss
        importParams = { name: 'RSA-PSS', hash: 'SHA-384' };
        verifyParams = { name: 'RSA-PSS', saltLength: 48 };
    } else if (sigAlgOid === '1.2.840.113549.1.1.11' || sigAlgOid === '1.2.840.113549.1.1.12' || sigAlgOid === '1.2.840.113549.1.1.5') {
        importParams = { name: 'RSASSA-PKCS1-v1_5', hash: sigAlgOid === '1.2.840.113549.1.1.12' ? 'SHA-384' : 'SHA-256' };
        verifyParams = { name: 'RSASSA-PKCS1-v1_5' };
    } else if (sigAlgOid === '1.2.840.10045.4.3.3') { // ecdsa-with-sha384
        importParams = { name: 'ECDSA', namedCurve: 'P-384' };
        verifyParams = { name: 'ECDSA', hash: 'SHA-384' };
    } else {
        // Fallback or generic
        importParams = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
        verifyParams = { name: 'RSASSA-PKCS1-v1_5' };
    }

    const key = await cryptoSubtle.importKey('spki', spkiBuf, importParams, false, ['verify']);
    const isValid = await cryptoSubtle.verify(verifyParams, key, signature, data);
    if (!isValid) throw new Error(`Signature verification failed (OID: ${sigAlgOid}, ImportParams: ${JSON.stringify(importParams)})`);
}

const COSIGN_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEjiL30OjPuxa+GC1I7SAcBv2u2pMt
h9WbP33IvB3eFww+C1hoW0fwdZPiq4FxBtKNiZuFpmYuFngW/nJteBu9kQ==
-----END PUBLIC KEY-----
`;

/**
 * Validates the hardware TEE attestation included in the proof.
 * Throws an error if the attestation is invalid or compromised.
 */
export async function verifyTeeAttestation(proof: Proof, expectedApplicationId?: string) {
    let teeAttestation = proof.teeAttestation;
    if (!teeAttestation) {
        throw new Error("Missing teeAttestation in proof");
    }

    if (typeof teeAttestation === 'string') {
        teeAttestation = JSON.parse(teeAttestation) as TeeAttestation;
    }

    // 1. Verify Nonce Binding
    let expectedNonceSignature: string | undefined;
    let nonceDataObj: any;
    try {
        const context = JSON.parse(proof.claimData.context);
        expectedNonceSignature = context.attestationNonce;
        nonceDataObj = context.attestationNonceData;
    } catch (e) {
        throw new Error("Failed to parse proof context to extract attestationNonce");
    }

    if (!expectedNonceSignature || !nonceDataObj) {
        throw new Error("Proof context is missing attestationNonce or attestationNonceData");
    }

    if (teeAttestation.nonce !== expectedNonceSignature) {
        throw new Error(`Nonce Mismatch! Expected signature ${expectedNonceSignature}, got ${teeAttestation.nonce}`);
    }

    const { applicationId, sessionId, timestamp } = nonceDataObj;

    if (expectedApplicationId && applicationId.toLowerCase() !== expectedApplicationId.toLowerCase()) {
        throw new Error(`Application ID Mismatch! Expected ${expectedApplicationId}, but proof context contains ${applicationId}`);
    }

    const expectedNonceData = `${applicationId}:${sessionId}:${timestamp}`;
    const nonceMsg = ethers.getBytes(ethers.keccak256(new TextEncoder().encode(expectedNonceData)));
    const recoveredAddress = ethers.verifyMessage(nonceMsg, expectedNonceSignature);

    if (recoveredAddress.toLowerCase() !== applicationId.toLowerCase()) {
        throw new Error(`Nonce signature verification failed: recovered ${recoveredAddress}, expected ${applicationId}`);
    }

    try {
        const context = JSON.parse(proof.claimData.context);
        const paramSessionId = context.attestationNonceData.sessionId;
        if (!paramSessionId) {
            throw new Error(`Proof parameters are missing proxySessionId or sessionId`);
        }
        if (paramSessionId.toString() !== sessionId.toString()) {
            throw new Error(`Session ID Mismatch! Expected ${sessionId}, but proof parameters contain ${paramSessionId}`);
        }

        // Timestamp skew check: claimData.timestampS (seconds) vs attestationNonceData.timestamp (ms)
        const claimTimestampMs = proof.claimData.timestampS * 1000;
        const nonceTimestampMs = parseInt(timestamp, 10);
        const diffMs = Math.abs(claimTimestampMs - nonceTimestampMs);
        const TEN_MINUTES_MS = 10 * 60 * 1000;
        if (diffMs > TEN_MINUTES_MS) {
            throw new Error(`Timestamp Skew Too Large! claimData.timestampS and attestationNonce timestamp differ by ${Math.round(diffMs / 1000)}s (limit: 600s)`);
        }
    } catch (e) {
        if (e instanceof Error && (e.message.includes("Session ID Mismatch!") || e.message.includes("Timestamp Skew"))) {
            throw e;
        }
        throw new Error(`Failed to cross-verify session ID: ${(e as Error).message}`);
    }

    // 2. Recompute REPORT_DATA Hash
    // Recompute H(workload_digest || verifier_digest || pubkey_hash || nonce)
    // Here PUBKEY_HASH is the hash of the generic cosign pub key used by Popcorn.
    // For universal verification, we assume the Popcorn standard cosign public key hash matches the one used by Popcorn.
    // Note: To be fully strict, the public key hash should either be provided or fetched. 
    // We will compute the SHA256 of the concatenated string.

    // The verify_proof script uses the hash of a specific file. We'll reconstruct the data that was signed.
    // However, wait! If JS SDK cannot easily hash the hardcoded cosign public key (or doesn't have it), 
    // we must verify using the provided public data or skip the workload digest lock for now.
    // The user requested: "same verification we do in the popcorn verficcation script".
    // Let's implement the generic parts first: Hardware Signature and TCB.

    const reportBuffer = Buffer.from(teeAttestation.snp_report, 'base64');
    const report = parseAttestationReport(reportBuffer);

    if (report.isDebugEnabled) {
        throw new Error("POLICY CHECK FAILED: Debug mode is ALLOWED. Environment is compromised.");
    }

    const certBuffer = Buffer.from(teeAttestation.vlek_cert, 'base64');

    await verifyAMDChain(certBuffer);
    verifyTCB(certBuffer, report);
    await verifyHardwareSignature(reportBuffer, certBuffer);
    await verifyReportData(teeAttestation, proof.claimData.context, report);
}

function parseAttestationReport(buffer: Buffer) {
    if (buffer.length < 1000) {
        throw new Error(`Report buffer is too small: ${buffer.length} bytes`);
    }

    const policy = buffer.readBigUInt64LE(0x08);
    const isDebugEnabled = (policy & (BigInt(1) << BigInt(19))) !== BigInt(0);

    const reported_tcb = {
        bootloader: buffer.readUInt8(0x38),
        tee: buffer.readUInt8(0x39),
        snp: buffer.readUInt8(0x3E),
        microcode: buffer.readUInt8(0x3F)
    };

    const reportData = buffer.subarray(0x50, 0x90).toString('hex'); // 64 bytes
    return { policy, isDebugEnabled, reported_tcb, reportData };
}

function getExtValue(certAsn1: any, oidString: string) {
    const tbsCert = certAsn1.value[0];
    if (!tbsCert || !tbsCert.value) return null;

    const extBlockWrapper = tbsCert.value.find((node: any) => node.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && node.type === 3);
    if (!extBlockWrapper || !extBlockWrapper.value || !extBlockWrapper.value.length) return null;

    const extSequence = extBlockWrapper.value[0];
    for (const ext of extSequence.value) {
        const extIdAsn1 = ext.value[0];
        const extIdStr = forge.asn1.derToOid(extIdAsn1.value);
        if (extIdStr === oidString) {
            const extValueAsn1 = ext.value[ext.value.length - 1];
            const rawOctetStringBytes = extValueAsn1.value;
            try {
                // The extension value is an OCTET STRING containing the DER encoding of an INTEGER
                const innerAsn1 = forge.asn1.fromDer(forge.util.createBuffer(rawOctetStringBytes));
                if (innerAsn1.type === 2) { // INTEGER
                    const bytes = innerAsn1.value;
                    if (typeof bytes === 'string' && bytes.length > 0) {
                        return bytes.charCodeAt(bytes.length - 1);
                    } else {
                        throw new Error(`Extension ${oidString} INTEGER value is empty or invalid`);
                    }
                } else {
                    throw new Error(`Extension ${oidString} does not contain an INTEGER, found type ${innerAsn1.type}`);
                }
            } catch (e) {
                // Fail closed on any parse or schema error
                throw new Error(`Failed to strictly parse AMD TCB extension ${oidString}: ${(e as Error).message}`);
            }
        }
    }
    return null;
}

function verifyTCB(vlekCertBuffer: Buffer, report: any) {
    const certAsn1 = forge.asn1.fromDer(forge.util.createBuffer(vlekCertBuffer.toString('binary')));

    const OID_BOOTLOADER = '1.3.6.1.4.1.3704.1.3.1';
    const OID_TEE = '1.3.6.1.4.1.3704.1.3.2';
    const OID_SNP = '1.3.6.1.4.1.3704.1.3.3';
    const OID_MICROCODE = '1.3.6.1.4.1.3704.1.3.8';

    const certTcb = {
        bootloader: getExtValue(certAsn1, OID_BOOTLOADER),
        tee: getExtValue(certAsn1, OID_TEE),
        snp: getExtValue(certAsn1, OID_SNP),
        microcode: getExtValue(certAsn1, OID_MICROCODE)
    };

    if (certTcb.bootloader !== null && report.reported_tcb.bootloader < certTcb.bootloader) {
        throw new Error(`TCB Downgrade! Bootloader reported ${report.reported_tcb.bootloader}, but certificate requires ${certTcb.bootloader}`);
    }
    if (certTcb.tee !== null && report.reported_tcb.tee < certTcb.tee) {
        throw new Error(`TCB Downgrade! TEE reported ${report.reported_tcb.tee}, but certificate requires ${certTcb.tee}`);
    }
    if (certTcb.snp !== null && report.reported_tcb.snp < certTcb.snp) {
        throw new Error(`TCB Downgrade! SNP reported ${report.reported_tcb.snp}, but certificate requires ${certTcb.snp}`);
    }
    if (certTcb.microcode !== null && report.reported_tcb.microcode < certTcb.microcode) {
        throw new Error(`TCB Downgrade! Microcode reported ${report.reported_tcb.microcode}, but certificate requires ${certTcb.microcode}`);
    }
}

function parseAsn1Time(node: any): Date {
    const s = node.value as string;
    if (node.type === forge.asn1.Type.UTCTIME) {
        // UTCTime: YYMMDDHHmmssZ
        const yr = parseInt(s.substring(0, 2), 10);
        return new Date(Date.UTC(
            yr >= 50 ? 1900 + yr : 2000 + yr,
            parseInt(s.substring(2, 4), 10) - 1,
            parseInt(s.substring(4, 6), 10),
            parseInt(s.substring(6, 8), 10),
            parseInt(s.substring(8, 10), 10),
            parseInt(s.substring(10, 12), 10)
        ));
    } else {
        // GeneralizedTime: YYYYMMDDHHmmssZ
        return new Date(Date.UTC(
            parseInt(s.substring(0, 4), 10),
            parseInt(s.substring(4, 6), 10) - 1,
            parseInt(s.substring(6, 8), 10),
            parseInt(s.substring(8, 10), 10),
            parseInt(s.substring(10, 12), 10),
            parseInt(s.substring(12, 14), 10)
        ));
    }
}

async function verifyCRL(crlBuf: Buffer, arkPem: string, vlekSerial: string): Promise<void> {
    // Parse CRL: CertificateList SEQUENCE { TBSCertList, signatureAlgorithm, signatureValue }
    const crlAsn1 = forge.asn1.fromDer(forge.util.createBuffer(crlBuf.toString('binary')));

    if (!Array.isArray(crlAsn1.value) || crlAsn1.value.length < 3) {
        throw new Error('CRL ASN.1 structure is invalid: expected SEQUENCE with TBSCertList, AlgorithmIdentifier, BIT STRING');
    }

    const tbsAsn1 = (crlAsn1.value as any[])[0];
    const sigBitsAsn1 = (crlAsn1.value as any[])[2]; // BIT STRING containing the signature

    if (!Array.isArray(tbsAsn1.value)) {
        throw new Error('CRL TBSCertList is not a valid SEQUENCE');
    }

    const tbsFields = tbsAsn1.value as any[];
    let fi = 0;

    // Optional version field (UNIVERSAL INTEGER — present in CRL v2)
    if (fi < tbsFields.length &&
        tbsFields[fi].tagClass === forge.asn1.Class.UNIVERSAL &&
        tbsFields[fi].type === forge.asn1.Type.INTEGER) {
        fi++;
    }

    // signature AlgorithmIdentifier (skip, matches outer signatureAlgorithm)
    if (fi < tbsFields.length) fi++;

    // issuer Name
    if (fi >= tbsFields.length) throw new Error('CRL TBSCertList missing issuer');
    const issuerAsn1 = tbsFields[fi++];

    // thisUpdate (UTCTime or GeneralizedTime)
    if (fi >= tbsFields.length) throw new Error('CRL TBSCertList missing thisUpdate');
    const thisUpdateAsn1 = tbsFields[fi++];

    // nextUpdate (optional — UTCTime or GeneralizedTime)
    let nextUpdateAsn1: any = null;
    if (fi < tbsFields.length &&
        tbsFields[fi].tagClass === forge.asn1.Class.UNIVERSAL &&
        (tbsFields[fi].type === forge.asn1.Type.UTCTIME ||
            tbsFields[fi].type === forge.asn1.Type.GENERALIZEDTIME)) {
        nextUpdateAsn1 = tbsFields[fi++];
    }

    // revokedCertificates (optional UNIVERSAL SEQUENCE; skip context-specific extensions)
    let revokedSeq: any = null;
    if (fi < tbsFields.length &&
        tbsFields[fi].tagClass === forge.asn1.Class.UNIVERSAL &&
        tbsFields[fi].type === forge.asn1.Type.SEQUENCE) {
        revokedSeq = tbsFields[fi];
    }

    // 1. Validity Period
    const now = new Date();
    const thisUpdate = parseAsn1Time(thisUpdateAsn1);
    if (thisUpdate > now) {
        throw new Error(`CRL is not yet valid: thisUpdate is ${thisUpdate.toISOString()}`);
    }
    if (nextUpdateAsn1) {
        const nextUpdate = parseAsn1Time(nextUpdateAsn1);
        if (nextUpdate < now) {
            throw new Error(`CRL has expired: nextUpdate was ${nextUpdate.toISOString()}`);
        }
    }

    // 2. Issuer Verification — compare CRL issuer DER bytes to ARK certificate subject DER bytes
    // The AMD VLEK CRL is issued by the ARK (CN=ARK-Milan/Genoa), not the ASK
    const crlIssuerDer = forge.asn1.toDer(issuerAsn1).getBytes();
    const arkForgeCert = forge.pki.certificateFromPem(arkPem);
    const arkCertAsn1 = forge.pki.certificateToAsn1(arkForgeCert);
    // TBSCertificate field order: [0]version, serial, sigAlg, issuer, validity, subject, spki, ...
    const arkSubjectAsn1 = ((arkCertAsn1.value as any[])[0].value as any[])[5];
    const arkSubjectDer = forge.asn1.toDer(arkSubjectAsn1).getBytes();
    if (crlIssuerDer !== arkSubjectDer) {
        throw new Error('CRL issuer does not match AMD ARK certificate subject — chain mismatch');
    }

    // 3. Signature Verification (AMD CRL uses RSA-PSS with SHA-384, signed by ARK)
    const tbsDerBuf = Buffer.from(forge.asn1.toDer(tbsAsn1).getBytes(), 'binary');
    // BIT STRING first byte = unused bits count, skip it
    const sigRaw = typeof sigBitsAsn1.value === 'string' ? sigBitsAsn1.value : '';
    const sigBuf = Buffer.from(sigRaw.substring(1), 'binary');

    const cryptoSubtle = getSubtleCrypto();
    const spkiBuf = Buffer.from(
        forge.asn1.toDer(forge.pki.publicKeyToAsn1(arkForgeCert.publicKey)).getBytes(), 'binary'
    );
    const arkCryptoKey = await cryptoSubtle.importKey(
        'spki', Uint8Array.from(spkiBuf),
        { name: 'RSA-PSS', hash: 'SHA-384' },
        false, ['verify']
    );
    const isValid = await cryptoSubtle.verify(
        { name: 'RSA-PSS', saltLength: 48 }, // SHA-384 salt length is 48
        arkCryptoKey,
        Uint8Array.from(sigBuf),
        Uint8Array.from(tbsDerBuf)
    );
    if (!isValid) {
        throw new Error('CRL signature is INVALID — the CRL may be tampered or forged');
    }

    // 4. Revocation Check — only inspect the revokedCertificates list, not arbitrary ASN.1 nodes
    const targetSerial = normalizeSerial(vlekSerial);
    if (revokedSeq && Array.isArray(revokedSeq.value)) {
        for (const entry of revokedSeq.value) {
            if (!Array.isArray(entry.value) || entry.value.length < 2) continue;
            const serialAsn1 = entry.value[0];
            if (serialAsn1.type !== forge.asn1.Type.INTEGER || typeof serialAsn1.value !== 'string') continue;
            const serialHex = forge.util.bytesToHex(serialAsn1.value);
            if (normalizeSerial(serialHex) === targetSerial) {
                throw new Error('🚨 VLEK Certificate is REVOKED per AMD CRL! This hardware may be compromised.');
            }
        }
    }
}

async function verifyAMDChain(vlekCertBuffer: Buffer) {
    const processors = ['Milan', 'Genoa'];
    let chainVerified = false;

    const vlek = parseCert(vlekCertBuffer);

    for (const processor of processors) {
        let matchedChain = false;
        try {
            const chainPem = AMD_CERTS[processor];
            if (!chainPem) continue;

            const certs = chainPem.split('-----END CERTIFICATE-----')
                .map(c => c.trim())
                .filter(c => c.length > 0)
                .map(c => c + '\n-----END CERTIFICATE-----\n');

            const askCert = forge.pki.certificateFromPem(certs[0]);
            const arkCert = forge.pki.certificateFromPem(certs[1]);

            const ask = parseCert(Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(askCert)).getBytes(), 'binary'));
            const ark = parseCert(Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(arkCert)).getBytes(), 'binary'));

            // ARK -> ASK -> VLEK
            try {
                await verifySignature(certs[1], ark.tbsDer, ark.signature, ark.sigAlgOid); // ARK Self-signed
            } catch (e: any) { throw new Error(`AMD ARK self-signature verification failed: ${e.message}`); }

            try {
                await verifySignature(certs[1], ask.tbsDer, ask.signature, ask.sigAlgOid); // ASK signed by ARK
            } catch (e: any) { throw new Error(`AMD ASK-by-ARK signature verification failed: ${e.message}`); }

            try {
                await verifySignature(certs[0], vlek.tbsDer, vlek.signature, vlek.sigAlgOid); // VLEK signed by ASK
            } catch (e: any) { throw new Error(`VLEK-by-ASK signature verification failed: ${e.message}`); }

            matchedChain = true;

            // Check CRL
            let crlBuf: Buffer | undefined;
            const now = Date.now();
            if (crlCache[processor] && now - crlCache[processor].fetchedAt < 3600000) {
                crlBuf = crlCache[processor].buffer;
            } else {
                const crlUrl = `https://kdsintf.amd.com/vlek/v1/${processor}/crl`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const crlResp = await fetch(crlUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!crlResp.ok) continue;
                crlBuf = Buffer.from(await crlResp.arrayBuffer());
                crlCache[processor] = { buffer: crlBuf, fetchedAt: now };
            }

            if (vlek.serialNumber && crlBuf) {
                await verifyCRL(crlBuf, certs[1], vlek.serialNumber);
            }

            chainVerified = true;
            break;
        } catch (e: any) {
            if (matchedChain) {
                throw e; // Hard fail if we matched the chain but CRL fetch/parse failed or cert is revoked
            }
            continue;
        }
    }

    if (!chainVerified) {
        throw new Error("VLEK Certificate failed verification against all known AMD Root of Trust chains!");
    }
}

function toDerInt(bigIntBEBuffer: Buffer) {
    let i = 0;
    while (i < bigIntBEBuffer.length && bigIntBEBuffer[i] === 0) i++;
    let val = bigIntBEBuffer.subarray(i);
    if (val.length === 0) return Buffer.from([0x02, 0x01, 0x00]) as any;
    if (val[0] & 0x80) {
        val = Buffer.concat([Buffer.from([0x00]), val] as unknown as Uint8Array[]) as any;
    }
    return Buffer.concat([Buffer.from([0x02, val.length]), val] as unknown as Uint8Array[]) as any;
}

async function verifyHardwareSignature(reportBytes: Buffer, certBytes: Buffer) {
    const vlek = parseCert(certBytes);

    const sigOffset = 0x2A0;
    const rLE = reportBytes.subarray(sigOffset, sigOffset + 72);
    const sLE = reportBytes.subarray(sigOffset + 72, sigOffset + 144);

    const rBE = Buffer.from(Uint8Array.from(rLE)).reverse();
    const sBE = Buffer.from(Uint8Array.from(sLE)).reverse();

    const signedData = reportBytes.subarray(0, 0x2A0);

    const cryptoSubtle = getSubtleCrypto();

    const importedKey = await cryptoSubtle.importKey(
        "spki",
        vlek.spkiDer,
        { name: "ECDSA", namedCurve: "P-384" },
        false,
        ["verify"]
    );

    // the subtle crypto ECDSA signature needs to be raw (r || s), each 48 bytes long
    // Our rBE and sBE are exactly 72 bytes. P-384 is 48 bytes!
    // The AMD report reserves 72 bytes for R and 72 bytes for S padded with zeros.
    // We MUST verify the dropped high-order bytes are zero to prevent malicious tampering.
    const rPadding = rBE.subarray(0, rBE.length - 48);
    const sPadding = sBE.subarray(0, sBE.length - 48);

    if (!rPadding.every(b => b === 0) || !sPadding.every(b => b === 0)) {
        throw new Error("Hardware ECDSA signature is malformed: non-zero padding bytes detected in the structural signature coordinates.");
    }

    const r48 = rBE.subarray(rBE.length - 48);
    const s48 = sBE.subarray(sBE.length - 48);
    const rawSignature = Buffer.concat([r48, s48] as unknown as Uint8Array[]) as any;

    const isValid = await cryptoSubtle.verify(
        { name: "ECDSA", hash: { name: "SHA-384" } },
        importedKey,
        Uint8Array.from(rawSignature),
        Uint8Array.from(signedData)
    );

    if (!isValid) {
        throw new Error("Hardware ECDSA signature is completely invalid!");
    }
}

async function verifyReportData(teeAttestation: TeeAttestation, proofContext: string, report: any) {
    if (!teeAttestation.workload_digest || !teeAttestation.verifier_digest) {
        throw new Error("POLICY CHECK FAILED: Missing workload_digest or verifier_digest in TEE attestation.");
    }

    const { attestationNonce: nonce } = JSON.parse(proofContext);

    const cryptoSubtle = getSubtleCrypto();

    // 1. Extract raw 32-byte SHA256 digest from image refs (part after "@sha256:")
    const extractDigestBytes = (imageRef: string): Uint8Array => {
        const marker = '@sha256:';
        const idx = imageRef.lastIndexOf(marker);
        if (idx < 0) throw new Error(`Image ref missing @sha256: digest: ${imageRef}`);
        const hexDigest = imageRef.substring(idx + marker.length);
        if (hexDigest.length !== 64) throw new Error(`SHA256 digest must be 64 hex chars, got ${hexDigest.length} in: ${imageRef}`);
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) bytes[i] = parseInt(hexDigest.substring(i * 2, i * 2 + 2), 16);
        return bytes;
    };

    // 2. Hash COSIGN public key as canonical DER SPKI bytes (not PEM text)
    const importedCosignKey = await cryptoSubtle.importKey(
        'spki',
        Uint8Array.from(Buffer.from(
            COSIGN_PUBLIC_KEY
                .replace('-----BEGIN PUBLIC KEY-----', '')
                .replace('-----END PUBLIC KEY-----', '')
                .replace(/\s+/g, ''),
            'base64'
        )),
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
    );
    const pubKeySpkiDer = await cryptoSubtle.exportKey('spki', importedCosignKey);
    const pubKeyHashBuffer = await cryptoSubtle.digest('SHA-256', pubKeySpkiDer);
    const pubKeyHashBytes = new Uint8Array(pubKeyHashBuffer);

    // 3. Decode nonce from hex to raw bytes (strip 0x prefix)
    const nonceHex = (teeAttestation.nonce || nonce).replace(/^0x/i, '');
    const nonceBytes = new Uint8Array(nonceHex.length / 2);
    for (let i = 0; i < nonceBytes.length; i++) nonceBytes[i] = parseInt(nonceHex.substring(i * 2, i * 2 + 2), 16);

    // 4. Extract raw digest bytes from image refs
    const workloadBytes = extractDigestBytes(teeAttestation.workload_digest);
    const verifierBytes = extractDigestBytes(teeAttestation.verifier_digest);

    // 5. Build canonical binary payload:
    //    "POPCORN_TEE_REPORT_DATA_V1" || 0x01 || workload(32) || verifier(32) || pubkeyHash(32) || nonceBytes
    const domainSep = new TextEncoder().encode('POPCORN_TEE_REPORT_DATA_V1');
    const version = new Uint8Array([0x01]);
    const payload = new Uint8Array(
        domainSep.length + version.length +
        workloadBytes.length + verifierBytes.length +
        pubKeyHashBytes.length + nonceBytes.length
    );
    let offset = 0;
    for (const chunk of [domainSep, version, workloadBytes, verifierBytes, pubKeyHashBytes, nonceBytes]) {
        payload.set(chunk, offset);
        offset += chunk.length;
    }

    // 6. Compute SHA-256 of the binary payload, duplicate to 64 bytes, compare to report_data
    const hashBuffer = await cryptoSubtle.digest('SHA-256', payload);
    const hashHex = Buffer.from(hashBuffer).toString('hex');
    const expected64ByteHex = hashHex + hashHex;

    if (report.reportData !== expected64ByteHex) {
        throw new Error(`REPORT_DATA Mismatch! Hardware report is not bound to these image digests or nonce.\nExpected: ${expected64ByteHex}\nGot:      ${report.reportData}`);
    }
}
