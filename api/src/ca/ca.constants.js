export const CERT_VALIDITY_DAYS = 365

export const CA_CERT_VALIDITY_YEARS = 10

let _appCaCache = null
export const setAppCaCache = (value) => { _appCaCache = value }
export const getAppCaCache = () => _appCaCache
