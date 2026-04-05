import https from 'https'
import { readFile } from 'fs/promises'

export const fetchBuffer = async (url, options = {}) => {
    const { localPath } = options

    if (localPath) {
        try {
            return await readFile(localPath)
        } catch (err) {
            if (err?.code !== 'ENOENT') {
                throw err
            }
        }
    }

    return new Promise((resolve, reject) => {
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
}