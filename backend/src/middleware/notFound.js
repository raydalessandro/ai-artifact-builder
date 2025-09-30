const { logger } = require('../utils/logger');

/**
 * 404 Not Found handler
 * Must be placed after all routes but before error handler
 */
function notFound(req, res, next) {
  logger.warn('404 - Route not found:', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`,
    status: 404,
    availableEndpoints: process.env.NODE_ENV === 'development' ? {
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/me'
      ],
      projects: [
        'GET /api/projects',
        'GET /api/projects/:id',
        'POST /api/projects',
        'PUT /api/projects/:id',
        'DELETE /api/projects/:id'
      ],
      files: [
        'GET /api/files/:projectId',
        'GET /api/files/:projectId/:path',
        'POST /api/files/update',
        'POST /api/files/batch',
        'DELETE /api/files/:projectId/:path'
      ],
      chat: [
        'POST /api/chat/send',
        'GET /api/chat/history/:projectId',
        'DELETE /api/chat/session/:sessionId'
      ]
    } : undefined
  });
}

module.exports = { notFound };
