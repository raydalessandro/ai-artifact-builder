const { Pool } = require('pg');
const { logger } = require('../utils/logger');

class FileSystemService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Save or update file
   */
  async saveFile(projectId, path, content, language = 'text') {
    const client = await this.pool.connect();

    try {
      const size = Buffer.byteLength(content, 'utf8');

      const query = `
        INSERT INTO files (project_id, path, content, language, size)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (project_id, path)
        DO UPDATE SET
          content = EXCLUDED.content,
          language = EXCLUDED.language,
          size = EXCLUDED.size,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await client.query(query, [
        projectId,
        path,
        content,
        language,
        size
      ]);

      logger.info(`Saved file: ${path} in project ${projectId}`);

      return result.rows[0];

    } catch (error) {
      logger.error('Error saving file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Read file content
   */
  async readFile(projectId, path) {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM files
        WHERE project_id = $1 AND path = $2
      `;

      const result = await client.query(query, [projectId, path]);

      if (result.rows.length === 0) {
        throw new Error(`File not found: ${path}`);
      }

      return result.rows[0];

    } catch (error) {
      logger.error('Error reading file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all files for a project
   */
  async getProjectFiles(projectId) {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT id, path, language, size, created_at, updated_at
        FROM files
        WHERE project_id = $1
        ORDER BY path ASC
      `;

      const result = await client.query(query, [projectId]);

      return result.rows;

    } catch (error) {
      logger.error('Error getting project files:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get file tree structure
   */
  async getFileTree(projectId) {
    const files = await this.getProjectFiles(projectId);

    const tree = this.buildTree(files.map(f => ({
      path: f.path,
      ...f
    })));

    return tree;
  }

  /**
   * Build tree structure from flat file list
   */
  buildTree(files) {
    const root = { name: '/', type: 'directory', children: [] };

    files.forEach(file => {
      const parts = file.path.split('/').filter(p => p);
      let current = root;

      parts.forEach((part, idx) => {
        let child = current.children?.find(c => c.name === part);

        if (!child) {
          child = {
            name: part,
            type: idx === parts.length - 1 ? 'file' : 'directory',
            children: idx === parts.length - 1 ? undefined : []
          };

          if (idx === parts.length - 1) {
            // It's a file
            child.id = file.id;
            child.language = file.language;
            child.size = file.size;
            child.path = file.path;
          }

          current.children.push(child);
        }

        if (child.children) {
          current = child;
        }
      });
    });

    return root;
  }

  /**
   * Delete file
   */
  async deleteFile(projectId, path) {
    const client = await this.pool.connect();

    try {
      const query = `
        DELETE FROM files
        WHERE project_id = $1 AND path = $2
        RETURNING *
      `;

      const result = await client.query(query, [projectId, path]);

      if (result.rows.length === 0) {
        throw new Error(`File not found: ${path}`);
      }

      logger.info(`Deleted file: ${path} from project ${projectId}`);

      return result.rows[0];

    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete all files for a project
   */
  async deleteProjectFiles(projectId) {
    const client = await this.pool.connect();

    try {
      const query = `
        DELETE FROM files
        WHERE project_id = $1
      `;

      await client.query(query, [projectId]);

      logger.info(`Deleted all files for project ${projectId}`);

    } catch (error) {
      logger.error('Error deleting project files:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch save files
   */
  async saveFiles(projectId, files) {
    const savedFiles = [];

    for (const file of files) {
      const saved = await this.saveFile(
        projectId,
        file.path,
        file.content,
        file.language
      );
      savedFiles.push(saved);
    }

    return savedFiles;
  }
}

module.exports = { FileSystemService };
