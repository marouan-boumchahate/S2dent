export const getProfessorCertificateAttrs = (
    walletAddress, 
    uniqueId, 
    name, 
    department,
    academyName, 
    countryCode = 'TR'
) => ([
    { name: 'commonName', value: walletAddress },
    { name: 'givenName', value: name },
    { name: 'organizationName', value: academyName },
    { name: 'organizationalUnitName', value: department },
    { name: 'serialNumber', value: uniqueId },
    { name: 'countryName', value: countryCode },
])

export const getAcademyCertificateAttrs = (
    walletAddress, 
    uniqueId, 
    name, 
    shortName,
    countryCode = 'TR'
) => ([
    { name: 'commonName', value: walletAddress },
    { name: 'givenName', value: name },
    { name: 'organizationName', value: shortName },
    { name: 'serialNumber', value: uniqueId },
    { name: 'countryName', value: countryCode },
])