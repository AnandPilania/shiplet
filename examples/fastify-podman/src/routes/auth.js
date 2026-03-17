import mongoose from 'mongoose';
import { createHash } from 'crypto';

const userSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true });

userSchema.pre('save', function () {
  if (this.isModified('password')) {
    this.password = createHash('sha256').update(this.password).digest('hex');
  }
});

const User = mongoose.model('User', userSchema);

export async function authRoutes(app) {

  // POST /api/auth/register
  app.post('/register', {
    schema: {
      tags: ['auth'],
      body: { type: 'object', required: ['email', 'password'], properties: {
        email:    { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      }},
      response: { 201: { type: 'object', properties: {
        token: { type: 'string' }, user: { type: 'object' },
      }}},
    },
  }, async (req, reply) => {
    const { email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return reply.conflict('Email already registered');

    const user  = await User.create({ email, password });
    const token = app.jwt.sign({ id: user._id, role: user.role }, { expiresIn: '7d' });
    reply.status(201).send({ token, user: { id: user._id, email: user.email, role: user.role } });
  });

  // POST /api/auth/login
  app.post('/login', {
    schema: {
      tags: ['auth'],
      body: { type: 'object', required: ['email', 'password'], properties: {
        email:    { type: 'string' },
        password: { type: 'string' },
      }},
    },
  }, async (req, reply) => {
    const { email, password } = req.body;
    const hashed = createHash('sha256').update(password).digest('hex');
    const user   = await User.findOne({ email, password: hashed });
    if (!user) return reply.unauthorized('Invalid credentials');

    const token = app.jwt.sign({ id: user._id, role: user.role }, { expiresIn: '7d' });
    return { token, user: { id: user._id, email: user.email, role: user.role } };
  });

  // GET /api/auth/me  (protected)
  app.get('/me', {
    schema: { tags: ['auth'], security: [{ bearerAuth: [] }] },
    preHandler: [app.authenticate],
  }, async (req) => {
    const user = await User.findById(req.user.id).select('-password');
    return user;
  });
}
