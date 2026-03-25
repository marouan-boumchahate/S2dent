import https from 'https'

export const fetchBuffer = (url) =>
    new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`))
            }
            const chunks = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () => resolve(Buffer.concat(chunks)))
            res.on('error', reject)
        }).on('error', reject)
    })