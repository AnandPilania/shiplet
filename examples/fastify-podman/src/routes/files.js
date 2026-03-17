import { PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const BUCKET = process.env.S3_BUCKET || 'uploads';

export async function filesRoutes(app) {

  // GET /api/files — list objects in bucket
  app.get('/', {
    schema: { tags: ['files'] },
  }, async (req, reply) => {
    try {
      const cmd    = new ListObjectsV2Command({ Bucket: BUCKET });
      const result = await app.s3.send(cmd);
      return {
        files: (result.Contents || []).map(obj => ({
          key:          obj.Key,
          size:         obj.Size,
          lastModified: obj.LastModified,
        })),
      };
    } catch (e) {
      app.log.error(e);
      return reply.serviceUnavailable('S3/MinIO not reachable');
    }
  });

  // POST /api/files/presign — get a pre-signed upload URL
  app.post('/presign', {
    schema: {
      tags: ['files'],
      body: { type: 'object', required: ['filename'], properties: {
        filename:    { type: 'string' },
        contentType: { type: 'string', default: 'application/octet-stream' },
      }},
      response: { 200: { type: 'object', properties: {
        uploadUrl: { type: 'string' },
        key:       { type: 'string' },
      }}},
    },
  }, async (req) => {
    const ext = req.body.filename.split('.').pop();
    const key = `${randomUUID()}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      ContentType: req.body.contentType,
    });
    const uploadUrl = await getSignedUrl(app.s3, cmd, { expiresIn: 300 });
    return { uploadUrl, key };
  });

  // GET /api/files/:key/url — get a pre-signed download URL
  app.get('/:key/url', {
    schema: { tags: ['files'] },
  }, async (req) => {
    const cmd        = new GetObjectCommand({ Bucket: BUCKET, Key: req.params.key });
    const downloadUrl = await getSignedUrl(app.s3, cmd, { expiresIn: 3600 });
    return { downloadUrl };
  });

  // DELETE /api/files/:key
  app.delete('/:key', {
    schema: { tags: ['files'], security: [{ bearerAuth: [] }] },
  }, async (req, reply) => {
    await app.s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: req.params.key }));
    reply.status(204).send();
  });
}
