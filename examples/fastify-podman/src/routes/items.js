import mongoose from 'mongoose';

// ── Model ──────────────────────────────────────────────────────────────────────
const itemSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true, maxLength: 200 },
  description: { type: String, trim: true },
  tags:        [{ type: String, lowercase: true }],
  status:      { type: String, enum: ['active', 'archived'], default: 'active' },
}, { timestamps: true });

itemSchema.index({ name: 'text', description: 'text' });
const Item = mongoose.model('Item', itemSchema);

const itemSchema_v = {
  type: 'object',
  properties: {
    _id:         { type: 'string' },
    name:        { type: 'string' },
    description: { type: 'string' },
    tags:        { type: 'array', items: { type: 'string' } },
    status:      { type: 'string' },
    createdAt:   { type: 'string' },
    updatedAt:   { type: 'string' },
  },
};

// ── Routes ────────────────────────────────────────────────────────────────────
export async function itemRoutes(app) {

  // GET /api/items
  app.get('/', {
    schema: {
      tags: ['items'],
      querystring: { type: 'object', properties: {
        status: { type: 'string' }, tag: { type: 'string' }, search: { type: 'string' },
        page: { type: 'integer', default: 1 }, limit: { type: 'integer', default: 20 },
      }},
      response: { 200: { type: 'object', properties: {
        items: { type: 'array', items: itemSchema_v }, total: { type: 'integer' },
        page: { type: 'integer' }, pages: { type: 'integer' },
      }}},
    },
  }, async (req, reply) => {
    const { status, tag, search, page = 1, limit = 20 } = req.query;
    const CACHE_KEY = `items:${JSON.stringify(req.query)}`;

    const cached = await app.redis.get(CACHE_KEY);
    if (cached) return reply.header('x-cache', 'HIT').send(JSON.parse(cached));

    const filter = {};
    if (status) filter.status = status;
    if (tag)    filter.tags = tag;
    if (search) filter.$text = { $search: search };

    const [items, total] = await Promise.all([
      Item.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
      Item.countDocuments(filter),
    ]);

    const result = { items, total, page, pages: Math.ceil(total / limit) };
    await app.redis.setEx(CACHE_KEY, 30, JSON.stringify(result));
    reply.header('x-cache', 'MISS').send(result);
  });

  // GET /api/items/:id
  app.get('/:id', {
    schema: { tags: ['items'], response: { 200: itemSchema_v } },
  }, async (req, reply) => {
    const item = await Item.findById(req.params.id);
    if (!item) return reply.notFound('Item not found');
    return item;
  });

  // POST /api/items
  app.post('/', {
    schema: {
      tags: ['items'],
      security: [{ bearerAuth: [] }],
      body: { type: 'object', required: ['name'], properties: {
        name: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      }},
      response: { 201: itemSchema_v },
    },
  }, async (req, reply) => {
    const item = await Item.create(req.body);
    await app.redis.del('items:*');
    reply.status(201).send(item);
  });

  // PATCH /api/items/:id
  app.patch('/:id', {
    schema: {
      tags: ['items'],
      security: [{ bearerAuth: [] }],
      body: { type: 'object', properties: {
        name: { type: 'string' }, description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['active', 'archived'] },
      }},
    },
  }, async (req, reply) => {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return reply.notFound();
    await app.redis.del('items:*');
    return item;
  });

  // DELETE /api/items/:id
  app.delete('/:id', {
    schema: { tags: ['items'], security: [{ bearerAuth: [] }] },
  }, async (req, reply) => {
    await Item.findByIdAndDelete(req.params.id);
    await app.redis.del('items:*');
    reply.status(204).send();
  });
}
