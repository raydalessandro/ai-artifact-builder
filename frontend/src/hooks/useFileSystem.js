import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

export const useFileSystem = (projectId) => {
  const [files, setFiles] = useState([]);
  const [fileTree, setFileTree] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load files when project changes
  useEffect(() => {
    if (projectId) {
      loadFiles();
    }
  }, [projectId]);

  const loadFiles = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load as tree
      const response = await apiService.files.list(projectId, true);
      setFileTree(response.data.tree);

      // Also load flat list
      const flatResponse = await apiService.files.list(projectId, false);
      setFiles(flatResponse.data.files);

    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const openFile = useCallback(async (path) => {
    if (!projectId || !path) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.files.get(projectId, path);
      setCurrentFile(response.data.file);
      return response.data.file;

    } catch (err) {
      console.error('Error opening file:', err);
      setError('Failed to open file');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const saveFile = useCallback(async (path, content, language) => {
    if (!projectId) return;

    try {
      const response = await apiService.files.update(
        projectId,
        path,
        content,
        language
      );

      // Update current file if it's the same
      if (currentFile && currentFile.path === path) {
        setCurrentFile(response.data.file);
      }

      // Reload file list
      await loadFiles();

      return response.data.file;

    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file');
      return null;
    }
  }, [projectId, currentFile, loadFiles]);

  const createFile = useCallback(async (path, content = '', language = 'text') => {
    return saveFile(path, content, language);
  }, [saveFile]);

  const deleteFile = useCallback(async (path) => {
    if (!projectId) return;

    try {
      await apiService.files.delete(projectId, path);

      // Clear current file if deleted
      if (currentFile && currentFile.path === path) {
        setCurrentFile(null);
      }

      // Reload files
      await loadFiles();

      return true;

    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
      return false;
    }
  }, [projectId, currentFile, loadFiles]);

  const renameFile = useCallback(async (oldPath, newPath) => {
    if (!projectId) return;

    try {
      await apiService.files.rename(projectId, oldPath, newPath);

      // Update current file if renamed
      if (currentFile && currentFile.path === oldPath) {
        setCurrentFile((prev) => ({ ...prev, path: newPath }));
      }

      // Reload files
      await loadFiles();

      return true;

    } catch (err) {
      console.error('Error renaming file:', err);
      setError('Failed to rename file');
      return false;
    }
  }, [projectId, currentFile, loadFiles]);

  const updateFileContent = useCallback((content) => {
    if (currentFile) {
      setCurrentFile((prev) => ({ ...prev, content }));
    }
  }, [currentFile]);

  return {
    files,
    fileTree,
    currentFile,
    isLoading,
    error,
    loadFiles,
    openFile,
    saveFile,
    createFile,
    deleteFile,
    renameFile,
    updateFileContent
  };
};
