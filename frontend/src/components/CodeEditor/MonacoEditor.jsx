import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save, X, FileCode } from 'lucide-react';
import './MonacoEditor.css';

export const MonacoEditor = ({ 
  file, 
  onSave, 
  onClose, 
  onChange 
}) => {
  const editorRef = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setHasChanges(false);
  }, [file]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on'
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  const handleEditorChange = (value) => {
    setHasChanges(true);
    onChange?.(value);
  };

  const handleSave = async () => {
    if (!file || !hasChanges) return;

    setIsSaving(true);
    try {
      const content = editorRef.current.getValue();
      await onSave?.(file.path, content, file.language);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!file) {
    return (
      <div className="monaco-editor-empty">
        <FileCode size={48} />
        <p>No file selected</p>
        <span>Select a file from the explorer to start editing</span>
      </div>
    );
  }

  return (
    <div className="monaco-editor-container">
      {/* Header */}
      <div className="editor-header">
        <div className="file-info">
          <FileCode size={16} />
          <span className="file-path">{file.path}</span>
          {hasChanges && <span className="unsaved-indicator">●</span>}
        </div>
        
        <div className="editor-actions">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="editor-button save"
            title="Save (Ctrl+S)"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={onClose}
            className="editor-button close"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={file.language || 'plaintext'}
          value={file.content || ''}
          theme="vs-dark"
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            matchBrackets: 'always',
            formatOnPaste: true,
            formatOnType: true
          }}
        />
      </div>

      {/* Status bar */}
      <div className="editor-status-bar">
        <span className="status-item">{file.language || 'plaintext'}</span>
        <span className="status-item">
          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
        </span>
        {hasChanges && (
          <span className="status-item unsaved">Unsaved changes</span>
        )}
      </div>
    </div>
  );
};
