const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { AnythingLLMService } = require('../services/anythingllm.service');
const { FileSystemService } = require('../services/filesystem.service');
const { logger } = require('../utils/logger');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anythingLLM = new AnythingLLMService();
const fileSystem = new FileSystemService();

/**
 * POST /api/chat/send
 * Send message to AI
 */
router.post('/send', async (req, res) => {
  try {
    const { projectId, message, context = 'relevant', mode = 'chat' } = req.body;

    if (!projectId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, message'
      });
    }

    logger.info(`Chat request for project ${projectId}`);

    // Get or create chat session
    const session = await getOrCreateSession(projectId);

    // Save user message
    await saveMessage(session.id, 'user', message);

    // Send to AI
    const response = await anythingLLM.sendMessage(projectId, message, {
      includeFiles: context === 'all',
      contextSize: context === 'all' ? 10 : 5,
      mode
    });

    // Save assistant message
    const assistantMsg = await saveMessage(
      session.id,
      'assistant',
      response.message,
      { files: response.generatedFiles }
    );

    // Save generated files
    if (response.generatedFiles && response.generatedFiles.length > 0) {
      const savedFiles = await fileSystem.saveFiles(
        projectId,
        response.generatedFiles
      );

      // Update vector DB
      await anythingLLM.updateProjectContext(projectId, response.generatedFiles);

      // Log file generation
      for (const file of savedFiles) {
        await logGeneratedFile(assistantMsg.id, file.id, 'create');
      }

      logger.info(`Generated ${savedFiles.length} files for project ${projectId}`);
    }

    res.json({
      success: true,
      message: response.message,
      generatedFiles: response.generatedFiles,
      thinking: response.thinking,
      sessionId: session.id
    });

  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/history/:projectId
 * Get chat history for project
 */
router.get('/history/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const client = await pool.connect();

    try {
      const query = `
        SELECT cm.*, cs.project_id
        FROM chat_messages cm
        JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE cs.project_id = $1
        ORDER BY cm.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [projectId, limit, offset]);

      res.json({
        success: true,
        messages: result.rows.reverse(),
        total: result.rows.length
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      details: error.message
    });
  }
});

/**
 * DELETE /api/chat/session/:sessionId
 * Delete chat session
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const client = await pool.connect();

    try {
      await client.query('DELETE FROM chat_sessions WHERE id = $1', [sessionId]);

      res.json({
        success: true,
        message: 'Session deleted'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      details: error.message
    });
  }
});

// Helper functions

async function getOrCreateSession(projectId) {
  const client = await pool.connect();

  try {
    // Try to get most recent session
    let result = await client.query(
      `SELECT * FROM chat_sessions 
       WHERE project_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [projectId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new session
    result = await client.query(
      'INSERT INTO chat_sessions (project_id) VALUES ($1) RETURNING *',
      [projectId]
    );

    return result.rows[0];

  } finally {
    client.release();
  }
}

async function saveMessage(sessionId, role, content, metadata = {}) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `INSERT INTO chat_messages (session_id, role, content, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sessionId, role, content, JSON.stringify(metadata)]
    );

    return result.rows[0];

  } finally {
    client.release();
  }
}

async function logGeneratedFile(messageId, fileId, action) {
  const client = await pool.connect();

  try {
    await client.query(
      `INSERT INTO generated_files_log (message_id, file_id, action)
       VALUES ($1, $2, $3)`,
      [messageId, fileId, action]
    );

  } finally {
    client.release();
  }
}

module.exports = router;
