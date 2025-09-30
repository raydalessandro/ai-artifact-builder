const { ChromaClient } = require('chromadb');
const { logger } = require('../utils/logger');

class VectorDBService {
  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
  }

  /**
   * Query relevant files based on semantic similarity
   */
  async queryRelevantFiles(projectId, query, topK = 5) {
    try {
      const collection = await this.getOrCreateCollection(projectId);

      const results = await collection.query({
        queryTexts: [query],
        nResults: topK
      });

      // Reconstruct files from results
      const files = [];
      if (results.documents && results.documents[0]) {
        results.documents[0].forEach((doc, idx) => {
          if (results.metadatas && results.metadatas[0] && results.metadatas[0][idx]) {
            files.push({
              path: results.metadatas[0][idx].path,
              language: results.metadatas[0][idx].language,
              content: doc,
              score: results.distances?.[0]?.[idx] || 0
            });
          }
        });
      }

      // Get project structure
      const structure = await this.getProjectStructure(projectId);

      logger.debug(`Found ${files.length} relevant files for query in project ${projectId}`);

      return {
        files,
        structure
      };

    } catch (error) {
      logger.error('Vector DB Query Error:', error);
      // Return empty context on error rather than failing
      return { files: [], structure: '' };
    }
  }

  /**
   * Upsert files into vector database
   */
  async upsertFiles(projectId, files) {
    try {
      if (!files || files.length === 0) {
        return;
      }

      const collection = await this.getOrCreateCollection(projectId);

      const documents = files.map(f => f.content || '');
      const metadatas = files.map(f => ({
        path: f.path,
        language: f.language || 'text',
        lastModified: Date.now()
      }));
      const ids = files.map(f => `${projectId}_${f.path.replace(/\//g, '_')}`);

      await collection.upsert({
        documents,
        metadatas,
        ids
      });

      logger.info(`Upserted ${files.length} files to vector DB for project ${projectId}`);

    } catch (error) {
      logger.error('Vector DB Upsert Error:', error);
      throw error;
    }
  }

  /**
   * Delete files from vector database
   */
  async deleteFiles(projectId, filePaths) {
    try {
      const collection = await this.getOrCreateCollection(projectId);
      const ids = filePaths.map(path => 
        `${projectId}_${path.replace(/\//g, '_')}`
      );

      await collection.delete({ ids });

      logger.info(`Deleted ${filePaths.length} files from vector DB`);

    } catch (error) {
      logger.error('Vector DB Delete Error:', error);
      throw error;
    }
  }

  /**
   * Get or create collection for project
   */
  async getOrCreateCollection(projectId) {
    try {
      return await this.client.getOrCreateCollection({
        name: `project_${projectId}`,
        metadata: { 'hnsw:space': 'cosine' }
      });
    } catch (error) {
      logger.error('Error getting/creating collection:', error);
      throw error;
    }
  }

  /**
   * Get project structure as string
   */
  async getProjectStructure(projectId) {
    try {
      const collection = await this.client.getCollection({
        name: `project_${projectId}`
      });

      const allFiles = await collection.get();

      if (!allFiles.metadatas || allFiles.metadatas.length === 0) {
        return 'Empty project';
      }

      const paths = allFiles.metadatas.map(m => m.path);
      const tree = this.buildFileTree(paths);

      return this.treeToString(tree);

    } catch (error) {
      logger.warn('Could not get project structure:', error.message);
      return '';
    }
  }

  /**
   * Build file tree from paths
   */
  buildFileTree(paths) {
    const tree = {};

    paths.forEach(path => {
      const parts = path.split('/').filter(p => p);
      let current = tree;

      parts.forEach((part, idx) => {
        if (!current[part]) {
          current[part] = idx === parts.length - 1 ? null : {};
        }
        if (current[part] !== null) {
          current = current[part];
        }
      });
    });

    return tree;
  }

  /**
   * Convert tree to string representation
   */
  treeToString(tree, indent = '') {
    let result = '';

    const entries = Object.entries(tree).sort((a, b) => {
      // Directories first
      if (a[1] === null && b[1] !== null) return 1;
      if (a[1] !== null && b[1] === null) return -1;
      return a[0].localeCompare(b[0]);
    });

    entries.forEach(([key, value]) => {
      const icon = value === null ? '📄' : '📁';
      result += `${indent}${icon} ${key}\n`;

      if (value !== null) {
        result += this.treeToString(value, indent + '  ');
      }
    });

    return result;
  }

  /**
   * Delete entire project collection
   */
  async deleteProject(projectId) {
    try {
      await this.client.deleteCollection({
        name: `project_${projectId}`
      });

      logger.info(`Deleted vector DB collection for project ${projectId}`);

    } catch (error) {
      logger.error('Error deleting project collection:', error);
      // Don't throw - collection might not exist
    }
  }
}

module.exports = { VectorDBService };
