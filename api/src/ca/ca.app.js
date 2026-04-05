import forge from 'node-forge'
import { setAppCaCache, getAppCaCache, CA_CERT_VALIDITY_YEARS } from './ca.constants.js'

const getAppCaFromProductionEnv = () => {
    const appCa = {
        privateKey: forge.pki.privateKeyFromPem(process.env.APP_CA_PRIVATE_KEY_PEM),
        certificate: forge.pki.certificateFromPem(process.env.APP_CA_CERT_PEM),
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

const createAppCa = () => {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
    const cert = forge.pki.createCertificate()

    initializeCertMetadata(cert, keys.publicKey, CA_CERT_VALIDITY_YEARS)
    
    cert.setSubject(certAttributes)
    cert.setIssuer(certAttributes)
    
    cert.setExtensions(certExtensions)
    
    cert.sign(keys.privateKey, forge.md.sha256.create())
    
    const appCa = { 
        privateKey: keys.privateKey, 
        certificate: cert 
    }
    
    setAppCaCache(appCa)

    return appCa
}

export const getAppCa = async () => {
    if (getAppCaCache()) return getAppCaCache() // I'm Checking if the CA is already cached

    if (process.env.APP_CA_PRIVATE_KEY_PEM && process.env.APP_CA_CERT_PEM)
        return getAppCaFromProductionEnv()

    console.warn('[CA] No APP_CA env vars – generating ephemeral dev CA.')

    return createAppCa()
}