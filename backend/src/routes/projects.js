const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { AnythingLLMService } = require('../services/anythingllm.service');
const { FileSystemService } = require('../services/filesystem.service');
const { VectorDBService } = require('../services/vectordb.service');
const { logger } = require('../utils/logger');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anythingLLM = new AnythingLLMService();
const fileSystem = new FileSystemService();
const vectorDB = new VectorDBService();

/**
 * GET /api/projects
 * List all projects for user
 */
router.get('/', async (req, res) => {
  try {
    // For now, get all projects (add userId filter when auth is implemented)
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT 
          p.*,
          COUNT(DISTINCT f.id) as file_count,
          MAX(f.updated_at) as last_file_update
        FROM projects p
        LEFT JOIN files f ON p.id = f.project_id
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `);

      res.json({
        success: true,
        projects: result.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error listing projects:', error);
    res.status(500).json({
      error: 'Failed to list projects',
      details: error.message
    });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM projects WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      const project = result.rows[0];

      // Get file count
      const fileCount = await client.query(
        'SELECT COUNT(*) as count FROM files WHERE project_id = $1',
        [id]
      );

      project.file_count = parseInt(fileCount.rows[0].count);

      // Update last accessed
      await client.query(
        'UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        project
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error getting project:', error);
    res.status(500).json({
      error: 'Failed to get project',
      details: error.message
    });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, settings = {} } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Project name is required'
      });
    }

    const client = await pool.connect();

    try {
      // Get demo user (in production, use authenticated user)
      const userResult = await client.query(
        "SELECT id FROM users WHERE email = 'demo@example.com'"
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          error: 'User not found'
        });
      }

      const userId = userResult.rows[0].id;

      // Create project
      const result = await client.query(
        `INSERT INTO projects (user_id, name, description, settings)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, name, description, JSON.stringify(settings)]
      );

      const project = result.rows[0];

      // Ensure AnythingLLM workspace exists
      await anythingLLM.ensureWorkspace(project.id, project.name);

      logger.info(`Created project: ${project.id} - ${project.name}`);

      res.status(201).json({
        success: true,
        project
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({
      error: 'Failed to create project',
      details: error.message
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, settings } = req.body;

    const client = await pool.connect();

    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }

      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (settings !== undefined) {
        updates.push(`settings = $${paramCount++}`);
        values.push(JSON.stringify(settings));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No fields to update'
        });
      }

      values.push(id);

      const result = await client.query(
        `UPDATE projects
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      res.json({
        success: true,
        project: result.rows[0]
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error updating project:', error);
    res.status(500).json({
      error: 'Failed to update project',
      details: error.message
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project and all associated data
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      // Check if project exists
      const check = await client.query(
        'SELECT * FROM projects WHERE id = $1',
        [id]
      );

      if (check.rows.length === 0) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      // Delete from vector DB
      await vectorDB.deleteProject(id);

      // Delete project (cascade will delete files and chat sessions)
      await client.query('DELETE FROM projects WHERE id = $1', [id]);

      logger.info(`Deleted project: ${id}`);

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      details: error.message
    });
  }
});

module.exports = router;
