import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { globalLimiter } from './middleware/rateLimiter.middleware.js';
import errorMiddleware from './middleware/error.middleware.js';
import { NotFoundError } from './utils/errors.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import newsRoutes from './routes/news.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Limit requests from same IP globally
app.use('/api', globalLimiter);

// Body parser, reading data from body into req.body (limit payload to 10kb)
app.use(express.json({ limit: '10kb' }));

// Welcome Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Fake News Detection System API!',
    documentation: 'Refer to README.md for endpoint details',
    version: '1.0.0',
  });
});

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy and running',
    timestamp: new Date(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new NotFoundError(`Can't find ${req.originalUrl} on this server!`));
});

// Centralized Global Error Handler
app.use(errorMiddleware);

export default app;
