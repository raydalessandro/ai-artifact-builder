import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import './FileTree.css';

const FileNode = ({ 
  node, 
  level = 0, 
  onSelect, 
  onDelete, 
  selectedPath 
}) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onSelect?.(node);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete ${node.name}?`)) {
      onDelete?.(node.path);
    }
  };

  return (
    <div className="file-node">
      <div 
        className={`file-node-content ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory && (
          <span className="expand-icon">
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </span>
        )}
        
        <span className="file-icon">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen size={16} />
            ) : (
              <Folder size={16} />
            )
          ) : (
            <FileCode size={16} />
          )}
        </span>
        
        <span className="file-name">{node.name}</span>
        
        {!isDirectory && (
          <button 
            className="file-action-button delete"
            onClick={handleDelete}
            title="Delete file"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      
      {isDirectory && isExpanded && node.children && (
        <div className="file-node-children">
          {node.children.map((child, idx) => (
            <FileNode
              key={child.path || idx}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = ({ 
  tree, 
  onFileSelect, 
  onFileDelete,
  onFileCreate,
  selectedFile 
}) => {
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onFileCreate?.(newFileName.trim());
      setNewFileName('');
      setShowNewFileInput(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreateFile();
    } else if (e.key === 'Escape') {
      setShowNewFileInput(false);
      setNewFileName('');
    }
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <h3>Explorer</h3>
        <button
          className="new-file-button"
          onClick={() => setShowNewFileInput(true)}
          title="New file"
        >
          <Plus size={16} />
        </button>
      </div>

      {showNewFileInput && (
        <div className="new-file-input-container">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCreateFile}
            placeholder="filename.js"
            autoFocus
            className="new-file-input"
          />
        </div>
      )}

      <div className="file-tree-content">
        {tree ? (
          tree.children && tree.children.length > 0 ? (
            tree.children.map((node, idx) => (
              <FileNode
                key={node.path || idx}
                node={node}
                onSelect={onFileSelect}
                onDelete={onFileDelete}
                selectedPath={selectedFile?.path}
              />
            ))
          ) : (
            <div className="empty-tree">
              <p>No files yet</p>
              <span>Create a file or ask AI to generate code</span>
            </div>
          )
        ) : (
          <div className="empty-tree">
            <p>No project selected</p>
          </div>
        )}
      </div>
    </div>
  );
};
