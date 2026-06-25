#!/usr/bin/env node
import forge from 'node-forge'

// Configuration
const KEY_SIZE = 2048
const VALIDITY_YEARS = 10

const CA_SUBJECT = [
    { name: 'commonName',       value: 'S2dentChain App Root CA' },
    { name: 'organizationName', value: 'S2dentChain' },
    { name: 'countryName',      value: 'TR' },
]

const CA_EXTENSIONS = [
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
]


// Generation 
console.error('[generate-ca] Generating %d-bit RSA keypair…', KEY_SIZE)

const keys = forge.pki.rsa.generateKeyPair({ bits: KEY_SIZE, e: 0x10001 })
const cert = forge.pki.createCertificate()

cert.publicKey = keys.publicKey
cert.serialNumber = '01'

cert.validity.notBefore = new Date()
cert.validity.notAfter  = new Date()
cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + VALIDITY_YEARS)

cert.setSubject(CA_SUBJECT)
cert.setIssuer(CA_SUBJECT) // Self-signed: issuer === subject

cert.setExtensions(CA_EXTENSIONS)

cert.sign(keys.privateKey, forge.md.sha256.create())


// Output
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey)
const certificatePem = forge.pki.certificateToPem(cert)

// Self-verify: confirm the PEM round-trips cleanly through node-forge
try {
    forge.pki.privateKeyFromPem(privateKeyPem)
    forge.pki.certificateFromPem(certificatePem)
    console.error('[generate-ca] => PEM round-trip verification passed.')
} catch (err) {
    console.error('[generate-ca] => PEM verification FAILED:', err.message)
    process.exit(1)
}

// Print certificate details to stderr for operator review
console.error('[generate-ca] Certificate subject:', cert.subject.getField('CN').value)
console.error('[generate-ca] Valid from:', cert.validity.notBefore.toISOString())
console.error('[generate-ca] Valid until:', cert.validity.notAfter.toISOString())
console.error('')
console.error('─────────────────────────────────────────────────────────────')
console.error('Copy the values below into your environment variables.')
console.error('─────────────────────────────────────────────────────────────')
console.error('')

// Print PEM blocks to stdout so they can be piped/captured cleanly
console.log('# ── APP_CA_PRIVATE_KEY_PEM ──')
console.log(privateKeyPem)
console.log('# ── APP_CA_CERT_PEM ──')
console.log(certificatePem)
