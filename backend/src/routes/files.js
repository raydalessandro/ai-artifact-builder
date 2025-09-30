const express = require('express');
const router = express.Router();
const { FileSystemService } = require('../services/filesystem.service');
const { VectorDBService } = require('../services/vectordb.service');
const { logger } = require('../utils/logger');

const fileSystem = new FileSystemService();
const vectorDB = new VectorDBService();

/**
 * GET /api/files/:projectId
 * Get all files for a project
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tree = false } = req.query;

    if (tree === 'true') {
      // Return as tree structure
      const fileTree = await fileSystem.getFileTree(projectId);
      
      res.json({
        success: true,
        tree: fileTree
      });
    } else {
      // Return as flat list
      const files = await fileSystem.getProjectFiles(projectId);
      
      res.json({
        success: true,
        files
      });
    }

  } catch (error) {
    logger.error('Error getting files:', error);
    res.status(500).json({
      error: 'Failed to get files',
      details: error.message
    });
  }
});

/**
 * GET /api/files/:projectId/:path
 * Get specific file content
 */
router.get('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0]; // Everything after projectId

    if (!filePath) {
      return res.status(400).json({
        error: 'File path is required'
      });
    }

    const file = await fileSystem.readFile(projectId, filePath);

    res.json({
      success: true,
      file
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        details: error.message
      });
    }

    logger.error('Error reading file:', error);
    res.status(500).json({
      error: 'Failed to read file',
      details: error.message
    });
  }
});

/**
 * POST /api/files/update
 * Create or update a file
 */
router.post('/update', async (req, res) => {
  try {
    const { projectId, path, content, language } = req.body;

    if (!projectId || !path || content === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, path, content'
      });
    }

    // Save file
    const savedFile = await fileSystem.saveFile(
      projectId,
      path,
      content,
      language
    );

    // Update vector DB
    await vectorDB.upsertFiles(projectId, [{
      path,
      content,
      language
    }]);

    res.json({
      success: true,
      file: savedFile
    });

  } catch (error) {
    logger.error('Error updating file:', error);
    res.status(500).json({
      error: 'Failed to update file',
      details: error.message
    });
  }
});

/**
 * POST /api/files/batch
 * Create or update multiple files at once
 */
router.post('/batch', async (req, res) => {
  try {
    const { projectId, files } = req.body;

    if (!projectId || !Array.isArray(files)) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, files (array)'
      });
    }

    // Save all files
    const savedFiles = await fileSystem.saveFiles(projectId, files);

    // Update vector DB
    await vectorDB.upsertFiles(projectId, files);

    res.json({
      success: true,
      files: savedFiles,
      count: savedFiles.length
    });

  } catch (error) {
    logger.error('Error batch updating files:', error);
    res.status(500).json({
      error: 'Failed to batch update files',
      details: error.message
    });
  }
});

/**
 * DELETE /api/files/:projectId/:path
 * Delete a file
 */
router.delete('/:projectId/*', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = req.params[0];

    if (!filePath) {
      return res.status(400).json({
        error: 'File path is required'
      });
    }

    // Delete file
    const deletedFile = await fileSystem.deleteFile(projectId, filePath);

    // Remove from vector DB
    await vectorDB.deleteFiles(projectId, [filePath]);

    res.json({
      success: true,
      file: deletedFile
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'File not found',
        details: error.message
      });
    }

    logger.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

/**
 * POST /api/files/search
 * Search files by content (semantic search)
 */
router.post('/search', async (req, res) => {
  try {
    const { projectId, query, limit = 5 } = req.body;

    if (!projectId || !query) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, query'
      });
    }

    const results = await vectorDB.queryRelevantFiles(projectId, query, limit);

    res.json({
      success: true,
      results: results.files,
      structure: results.structure
    });

  } catch (error) {
    logger.error('Error searching files:', error);
    res.status(500).json({
      error: 'Failed to search files',
      details: error.message
    });
  }
});

/**
 * POST /api/files/rename
 * Rename/move a file
 */
router.post('/rename', async (req, res) => {
  try {
    const { projectId, oldPath, newPath } = req.body;

    if (!projectId || !oldPath || !newPath) {
      return res.status(400).json({
        error: 'Missing required fields: projectId, oldPath, newPath'
      });
    }

    // Read old file
    const oldFile = await fileSystem.readFile(projectId, oldPath);

    // Save with new path
    const newFile = await fileSystem.saveFile(
      projectId,
      newPath,
      oldFile.content,
      oldFile.language
    );

    // Delete old file
    await fileSystem.deleteFile(projectId, oldPath);

    // Update vector DB
    await vectorDB.deleteFiles(projectId, [oldPath]);
    await vectorDB.upsertFiles(projectId, [{
      path: newPath,
      content: oldFile.content,
      language: oldFile.language
    }]);

    res.json({
      success: true,
      file: newFile
    });

  } catch (error) {
    logger.error('Error renaming file:', error);
    res.status(500).json({
      error: 'Failed to rename file',
      details: error.message
    });
  }
});

module.exports = router;
