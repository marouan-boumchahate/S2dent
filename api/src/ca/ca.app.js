import forge from 'node-forge'
import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { setAppCaCache, getAppCaCache, CA_CERT_VALIDITY_YEARS } from './ca.constants.js'
import { env } from '../config/env.js'


const DEV_CERTS_DIR = path.join(process.cwd(), 'certs')
const DEV_CA_KEY_PATH = path.join(DEV_CERTS_DIR, 'dev_ca.key')
const DEV_CA_CERT_PATH = path.join(DEV_CERTS_DIR, 'dev_ca.crt')


const getAppCaFromProductionEnv = () => {
    const appCa = {
        privateKey: forge.pki.privateKeyFromPem(env.ca.privateKeyPem),
        certificate: forge.pki.certificateFromPem(env.ca.certPem),
    }
    setAppCaCache(appCa)

    return appCa
}

const certAttributes = [
    { name: 'commonName', value: 'S2dentChain App CA (DEV)' },
    { name: 'organizationName', value: 'S2dentChain' },
    { name: 'countryName', value: 'TR' },
]

const certExtensions = [
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
]

const initializeCertMetadata = (cert, pubKey, validYears, serial = '01') => {
    cert.publicKey = pubKey
    cert.serialNumber = serial
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + validYears)
    
    return cert
}

const generateCaKeypairAndCert = () => {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
    const cert = forge.pki.createCertificate()

    initializeCertMetadata(cert, keys.publicKey, CA_CERT_VALIDITY_YEARS)
    
    cert.setSubject(certAttributes)
    cert.setIssuer(certAttributes)
    
    cert.setExtensions(certExtensions)
    
    cert.sign(keys.privateKey, forge.md.sha256.create())

    return { privateKey: keys.privateKey, certificate: cert }
}

const getOrCreateDevCa = () => {
    const keyExists = existsSync(DEV_CA_KEY_PATH)
    const certExists = existsSync(DEV_CA_CERT_PATH)

    if (keyExists && certExists) {
        // Both files present — load from disk
        console.info('[CA] Loading dev CA from disk:', DEV_CA_KEY_PATH)
        const keyPem = readFileSync(DEV_CA_KEY_PATH, 'utf8')
        const certPem = readFileSync(DEV_CA_CERT_PATH, 'utf8')

        const appCa = {
            privateKey: forge.pki.privateKeyFromPem(keyPem),
            certificate: forge.pki.certificateFromPem(certPem),
        }
        setAppCaCache(appCa)
        return appCa
    }

    // At least one file is missing — generate and persist
    console.warn('[CA] Dev CA files not found — generating and persisting to disk.')
    const appCa = generateCaKeypairAndCert()

    // Ensure the certs/ directory exists
    if (!existsSync(DEV_CERTS_DIR)) {
        mkdirSync(DEV_CERTS_DIR, { recursive: true })
    }

    const keyPem = forge.pki.privateKeyToPem(appCa.privateKey)
    const certPem = forge.pki.certificateToPem(appCa.certificate)

    writeFileSync(DEV_CA_KEY_PATH, keyPem, { mode: 0o600 })  // owner-only read/write for private key
    writeFileSync(DEV_CA_CERT_PATH, certPem, { mode: 0o644 })

    console.info('[CA] Dev CA written to:', DEV_CA_KEY_PATH, DEV_CA_CERT_PATH)

    setAppCaCache(appCa)
    return appCa
}


export const getAppCa = async () => {
    if (getAppCaCache()) return getAppCaCache() // Checking if the CA is already cached

    // Production: read from environment variables (set by operator via generate-ca.js)
    if (env.ca.privateKeyPem && env.ca.certPem)
        return getAppCaFromProductionEnv()

    // Development / Test: persist CA to disk so restarts don't invalidate issued certs
    return getOrCreateDevCa()
}