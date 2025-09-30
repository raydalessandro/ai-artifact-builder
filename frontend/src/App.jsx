import React, { useState, useEffect } from 'react';
import { useProjects } from './hooks/useProjects';
import { useFileSystem } from './hooks/useFileSystem';
import { ChatInterface } from './components/Chat/ChatInterface';
import { MonacoEditor } from './components/CodeEditor/MonacoEditor';
import { FileTree } from './components/FileExplorer/FileTree';
import { IframePreview } from './components/Preview/IframePreview';
import { 
  FolderPlus, 
  Settings, 
  LogOut,
  PanelLeftClose,
  PanelLeftOpen 
} from 'lucide-react';
import './App.css';

function App() {
  const {
    projects,
    currentProject,
    createProject,
    selectProject
  } = useProjects();

  const {
    files,
    fileTree,
    currentFile,
    openFile,
    saveFile,
    createFile,
    deleteFile,
    updateFileContent
  } = useFileSystem(currentProject?.id);

  const [showSidebar, setShowSidebar] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Load chat history when project changes
  useEffect(() => {
    // Could load chat history here
  }, [currentProject]);

  const handleFilesGenerated = async (generatedFiles) => {
    // Files are already saved by the backend
    // Just refresh the file list
    // The useFileSystem hook will automatically refresh
    console.log('Files generated:', generatedFiles);
  };

  const handleFileSelect = async (file) => {
    await openFile(file.path);
  };

  const handleFileSave = async (path, content, language) => {
    await saveFile(path, content, language);
  };

  const handleFileCreate = async (path) => {
    await createFile(path);
  };

  const handleFileDelete = async (path) => {
    await deleteFile(path);
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewProjectDialog(false);
    }
  };

  return (
    <div className="app">
      {/* Top Bar */}
      <div className="app-header">
        <div className="header-left">
          <button
            className="icon-button"
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle sidebar"
          >
            {showSidebar ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
          
          <div className="app-title">
            <h1>AI Artifact Builder</h1>
            {currentProject && (
              <span className="current-project">{currentProject.name}</span>
            )}
          </div>
        </div>

        <div className="header-right">
          <button
            className="icon-button"
            onClick={() => setShowNewProjectDialog(true)}
            title="New project"
          >
            <FolderPlus size={20} />
          </button>
          
          <button className="icon-button" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="app-content">
        {/* Sidebar - File Explorer */}
        {showSidebar && (
          <div className="sidebar">
            <div className="projects-selector">
              <select
                value={currentProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) selectProject(project);
                }}
                className="project-select"
              >
                <option value="">Select project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <FileTree
              tree={fileTree}
              onFileSelect={handleFileSelect}
              onFileDelete={handleFileDelete}
              onFileCreate={handleFileCreate}
              selectedFile={currentFile}
            />
          </div>
        )}

        {/* Center - Editor + Preview */}
        <div className="main-panel">
          <div className="editor-section">
            <MonacoEditor
              file={currentFile}
              onSave={handleFileSave}
              onClose={() => {}}
              onChange={updateFileContent}
            />
          </div>

          {showPreview && (
            <div className="preview-section">
              <IframePreview
                files={files}
                currentFile={currentFile}
              />
            </div>
          )}
        </div>

        {/* Right - Chat */}
        <div className="chat-panel">
          <ChatInterface
            projectId={currentProject?.id}
            onFilesGenerated={handleFilesGenerated}
          />
        </div>
      </div>

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="modal-overlay" onClick={() => setShowNewProjectDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') setShowNewProjectDialog(false);
              }}
              placeholder="Project name..."
              autoFocus
              className="modal-input"
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewProjectDialog(false)}>
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                className="primary"
                disabled={!newProjectName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
