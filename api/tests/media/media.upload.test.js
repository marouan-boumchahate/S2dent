import esmock from 'esmock'
import request from 'supertest'
import { strict as assert } from 'assert'

const mockUploadImage = async () => 'https://res.cloudinary.com/demo/image/upload/v1/sample.png'

const makeApp = async () => {
  const { default: app } = await esmock.strict(
    '../../src/app.js',
    import.meta.url,
    {},
    {
      '../../src/utils/cloudinary.js': {
        uploadImage: mockUploadImage,
      },
    },
  )

  return app
}

describe('POST /api/media/upload', () => {
  it('returns 200 and a URL for a valid image', async () => {
    const app = await makeApp()

    const res = await request(app)
      .post('/api/media/upload')
      .attach('image', Buffer.from('89504e470d0a1a0a', 'hex'), {
        filename: 'sample.png',
        contentType: 'image/png',
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Image uploaded successfully')
    assert.equal(res.body.data.url, 'https://res.cloudinary.com/demo/image/upload/v1/sample.png')
  })

  it('rejects an invalid file type', async () => {
    const app = await makeApp()

    const res = await request(app)
      .post('/api/media/upload')
      .attach('image', Buffer.from('plain text file'), {
        filename: 'sample.txt',
        contentType: 'text/plain',
      })

    assert.equal(res.status, 422)
    assert.equal(res.body.success, false)
    assert.equal(res.body.code, 'VALIDATION_ERROR')
  })
})