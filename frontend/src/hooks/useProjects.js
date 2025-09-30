import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.projects.list();
      setProjects(response.data.projects);

      // Auto-select first project if none selected
      if (!currentProject && response.data.projects.length > 0) {
        setCurrentProject(response.data.projects[0]);
      }

    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject]);

  const createProject = useCallback(async (name, description = '') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.projects.create(name, description);
      const newProject = response.data.project;

      setProjects((prev) => [newProject, ...prev]);
      setCurrentProject(newProject);

      return newProject;

    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (id, data) => {
    try {
      const response = await apiService.projects.update(id, data);
      const updatedProject = response.data.project;

      setProjects((prev) =>
        prev.map((p) => (p.id === id ? updatedProject : p))
      );

      if (currentProject && currentProject.id === id) {
        setCurrentProject(updatedProject);
      }

      return updatedProject;

    } catch (err) {
      console.error('Error updating project:', err);
      setError('Failed to update project');
      return null;
    }
  }, [currentProject]);

  const deleteProject = useCallback(async (id) => {
    try {
      await apiService.projects.delete(id);

      setProjects((prev) => prev.filter((p) => p.id !== id));

      if (currentProject && currentProject.id === id) {
        setCurrentProject(projects[0] || null);
      }

      return true;

    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
      return false;
    }
  }, [currentProject, projects]);

  const selectProject = useCallback((project) => {
    setCurrentProject(project);
  }, []);

  return {
    projects,
    currentProject,
    isLoading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject
  };
};
