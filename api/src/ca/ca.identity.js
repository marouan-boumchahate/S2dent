import forge from 'node-forge'
import crypto from 'crypto'
import { CERT_VALIDITY_DAYS } from './ca.constants.js'
import { getIsrgRootX1 } from './ca.root.js'
import { getAppCa } from './ca.app.js'


const initializeCertMetadata = (cert, pubKey, walletAddress, uniqueId) => {
    cert.publicKey = pubKey

    cert.serialNumber = crypto.createHash('sha256')
        .update(`${walletAddress}:${uniqueId}`)
        .digest('hex')
        .slice(0, 16)

    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setDate(cert.validity.notAfter.getDate() + CERT_VALIDITY_DAYS)

    return cert
}

const getExtensions = (issuerWallet, uniqueId, appCa) => ([
  { name: 'basicConstraints', cA: false, critical: true },
  { name: 'keyUsage', digitalSignature: true, nonRepudiation: true, critical: true },
  { name: 'extKeyUsage', other: ['1.3.6.1.4.1.99999.1'] },
  { name: 'subjectKeyIdentifier' },
  { name: 'authorityKeyIdentifier', keyIdentifier: appCa.certificate.generateSubjectKeyIdentifier().getBytes() },

  // Custom OIDs for additional identity information
  { id: '1.3.6.1.4.1.99999.1', value: forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTF8, false, issuerWallet || '') },
  { id: '1.3.6.1.4.1.99999.2', value: forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTF8, false, uniqueId) },
])

const getCertHash = (cert) => {
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
    return crypto.createHash('sha256').update(Buffer.from(certDer, 'binary')).digest('hex')
}

const getChainPem = (cert, appCa, isrgRoot) => {
    const certPem = forge.pki.certificateToPem(cert)
    const appCaPem = forge.pki.certificateToPem(appCa.certificate)
    const isrgRootPem = forge.pki.certificateToPem(isrgRoot)

    const chain = [certPem, appCaPem, isrgRootPem].join('\n')

    return [chain, certPem]
}


export const buildIdentityCertificate = async (payload) => {
    const {
        walletAddress,
        issuerAddress,
        uniqueId,
        certAttrs
    } = payload

    const [isrgRoot, appCa] = await Promise.all([getIsrgRootX1(), getAppCa()])
    const subjectKeys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
    const cert = forge.pki.createCertificate()

    
    initializeCertMetadata(cert, subjectKeys.publicKey, walletAddress, uniqueId)
    
    cert.setSubject(certAttrs)
    cert.setIssuer(appCa.certificate.subject.attributes)
    cert.setExtensions(getExtensions(issuerAddress, uniqueId, appCa))
    
    cert.sign(appCa.privateKey, forge.md.sha256.create())

    const fingerprintHex = getCertHash(cert)

    const [chainPem, certPem] = getChainPem(cert, appCa, isrgRoot)

    return {
        fingerprint: `0x${fingerprintHex}`,
        certificatePem: certPem,
        chainPem,
        notBefore: cert.validity.notBefore,
        notAfter: cert.validity.notAfter,
    }
}