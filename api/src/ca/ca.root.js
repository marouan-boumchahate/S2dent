import forge from 'node-forge'
import { fetchBuffer } from './ca.fetch.js'
import { ISRG_ROOT_X1_DER_URL, getIsrgRootX1Pem, setIsrgRootX1Pem } from './ca.constants.js'

const createIsrgRootX1Pem = async () => {
  const derBuf = await fetchBuffer(ISRG_ROOT_X1_DER_URL)
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(derBuf))
  const cert = forge.pki.certificateFromAsn1(asn1)

  setIsrgRootX1Pem(forge.pki.certificateToPem(cert)) // Caching the PEM in memory for future use

  return cert
}

export const getIsrgRootX1 = async () => {
  if (getIsrgRootX1Pem()) {
    return forge.pki.certificateFromPem(getIsrgRootX1Pem())
  }

  const cert = await createIsrgRootX1Pem()
  return cert
}