import path from 'path'

export const ISRG_ROOT_X1_DER_URL = 'https://letsencrypt.org/certs/isrgrootx1.der'
export const ISRG_ROOT_X1_DER_PATH = process.env.ISRG_ROOT_X1_DER_PATH
	|| path.join(process.cwd(), 'certs', 'isrgrootx1.der')

export const CERT_VALIDITY_DAYS = 365

export const CA_CERT_VALIDITY_YEARS = 10

// My caches certificates in memory to avoid redundant fetches and conversions
let _isrgRootX1Pem = null
export const setIsrgRootX1Pem = (value) => { _isrgRootX1Pem = value }
export const getIsrgRootX1Pem = () => _isrgRootX1Pem

let _appCaCache = null
export const setAppCaCache = (value) => { _appCaCache = value }
export const getAppCaCache = () => _appCaCache
