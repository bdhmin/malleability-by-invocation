'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';

// Auto-resizing textarea component
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Allow Shift+Enter for new lines (default behavior)
        // Regular Enter also creates new lines in textarea
        if (e.key === 'Enter' && !e.shiftKey) {
          // Optional: prevent regular Enter if you want only Shift+Enter
          // For now, both work
        }
      }}
      placeholder={placeholder}
      className={className}
      rows={1}
    />
  );
}

const STORAGE_KEY = 'ui-input-methods-data';

// Simple markdown parser
function parseMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (must come before other formatting)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    // Line breaks (double newline = paragraph)
    .replace(/\n\n/g, '</p><p>')
    // Single line breaks
    .replace(/\n/g, '<br />');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*?<\/li>)(\s*<br \/>)?/g, '$1');
  html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');

  return `<p>${html}</p>`;
}

const initialRows = [
  'Sharing examples of other UIs',
  'Screenshots/Photos',
  'Demonstrating interactions',
  'Gesturing',
  'Sketching',
  'Annotating',
  'Prompting',
  'Choosing from options',
  'Programming',
];

const defaultHeaders = ['Input Method', '', ''];
const defaultData = initialRows.map((item) => [
  item,
  ...Array(defaultHeaders.length - 1).fill(''),
]);

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [headers, setHeaders] = useState(defaultHeaders);
  const [data, setData] = useState<string[][]>(defaultData);
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.headers) setHeaders(parsed.headers);
        if (parsed.data) setData(parsed.data);
        if (parsed.notes) setNotes(parsed.notes);
      } catch (e) {
        console.error('Failed to parse saved data:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ headers, data, notes })
      );
    }
  }, [headers, data, notes, isLoaded]);

  const renderedMarkdown = useMemo(() => parseMarkdown(notes), [notes]);

  const updateHeader = (colIndex: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[colIndex] = value;
    setHeaders(newHeaders);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex] = [...newData[rowIndex]];
    newData[rowIndex][colIndex] = value;
    setData(newData);
  };

  const addRow = () => {
    setData([...data, Array(headers.length).fill('')]);
  };

  const addColumn = () => {
    setHeaders([...headers, '']);
    setData(data.map((row) => [...row, '']));
  };

  const deleteRow = (rowIndex: number) => {
    if (data.length > 1) {
      setData(data.filter((_, i) => i !== rowIndex));
    }
  };

  const deleteColumn = (colIndex: number) => {
    if (headers.length > 1) {
      setHeaders(headers.filter((_, i) => i !== colIndex));
      setData(data.map((row) => row.filter((_, i) => i !== colIndex)));
    }
  };

  const moveRow = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= data.length) return;
    const newData = [...data];
    const [removed] = newData.splice(fromIndex, 1);
    newData.splice(toIndex, 0, removed);
    setData(newData);
  };

  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= headers.length) return;
    const newHeaders = [...headers];
    const [removedHeader] = newHeaders.splice(fromIndex, 1);
    newHeaders.splice(toIndex, 0, removedHeader);
    setHeaders(newHeaders);

    const newData = data.map((row) => {
      const newRow = [...row];
      const [removedCell] = newRow.splice(fromIndex, 1);
      newRow.splice(toIndex, 0, removedCell);
      return newRow;
    });
    setData(newData);
  };

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const copyTableToClipboard = async () => {
    // Escape cell for TSV: quote cells containing newlines, tabs, or quotes
    const escapeCell = (cell: string) => {
      if (cell.includes('\n') || cell.includes('\t') || cell.includes('"')) {
        // Escape double quotes by doubling them, then wrap in quotes
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    };

    // Convert to TSV (tab-separated values) for Google Sheets compatibility
    const headerRow = headers.map(escapeCell).join('\t');
    const dataRows = data
      .map((row) => row.map(escapeCell).join('\t'))
      .join('\n');
    const tsv = `${headerRow}\n${dataRows}`;

    try {
      await navigator.clipboard.writeText(tsv);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-8 font-sans">
      <div className="mx-auto">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-stone-800">
          UI Input Methods
        </h1>
        <p className="mb-8 text-stone-500">
          Different ways to provide input for UI customization
        </p>

        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {headers.map((header, colIndex) => (
                  <th
                    key={colIndex}
                    className="group relative border-b border-r border-stone-200 bg-stone-100 p-0 text-left font-medium text-stone-600 last:border-r-0"
                  >
                    <div className="flex items-center">
                      {/* Move column left */}
                      {colIndex > 0 && (
                        <button
                          onClick={() => moveColumn(colIndex, colIndex - 1)}
                          className="ml-1 rounded p-1 text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-stone-600 group-hover:opacity-100"
                          title="Move column left"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                      )}
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => updateHeader(colIndex, e.target.value)}
                        placeholder={`Column ${colIndex + 1}`}
                        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm font-medium text-stone-600 outline-none placeholder:text-stone-400 focus:bg-amber-50"
                      />
                      {/* Move column right */}
                      {colIndex < headers.length - 1 && (
                        <button
                          onClick={() => moveColumn(colIndex, colIndex + 1)}
                          className="rounded p-1 text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-stone-600 group-hover:opacity-100"
                          title="Move column right"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      )}
                      {headers.length > 1 && (
                        <button
                          onClick={() => deleteColumn(colIndex)}
                          className="mr-1 rounded p-1 text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-red-500 group-hover:opacity-100"
                          title="Delete column"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-16 border-b border-stone-200 bg-stone-100"></th>
                {/* Add Column button */}
                <th className="border-b border-stone-200 bg-stone-50 px-2">
                  <button
                    onClick={addColumn}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600"
                    title="Add column"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="group">
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className="border-b border-r border-stone-200 p-0 align-top last:border-r-0"
                    >
                      <AutoResizeTextarea
                        value={cell}
                        onChange={(value) =>
                          updateCell(rowIndex, colIndex, value)
                        }
                        className="block w-full resize-none bg-transparent px-4 py-3 text-stone-800 outline-none placeholder:text-stone-300 focus:bg-amber-50"
                        placeholder={colIndex === 0 ? 'New item...' : ''}
                      />
                    </td>
                  ))}
                  <td className="w-16 border-b border-stone-200 bg-stone-50">
                    <div className="flex items-center justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {/* Move row up */}
                      {rowIndex > 0 && (
                        <button
                          onClick={() => moveRow(rowIndex, rowIndex - 1)}
                          className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
                          title="Move row up"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                      )}
                      {/* Move row down */}
                      {rowIndex < data.length - 1 && (
                        <button
                          onClick={() => moveRow(rowIndex, rowIndex + 1)}
                          className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
                          title="Move row down"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      )}
                      {/* Delete row */}
                      {data.length > 1 && (
                        <button
                          onClick={() => deleteRow(rowIndex)}
                          className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-red-500"
                          title="Delete row"
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Empty cell to match Add Column header */}
                  <td className="border-b border-stone-200 bg-stone-50"></td>
                </tr>
              ))}
              {/* Add Row button */}
              <tr>
                <td
                  colSpan={headers.length + 2}
                  className="border-stone-200 bg-stone-50 p-2"
                >
                  <button
                    onClick={addRow}
                    className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600"
                    title="Add row"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Row
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={copyTableToClipboard}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-800"
          >
            {copyStatus === 'copied' ? (
              <>
                <svg
                  className="h-4 w-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Table
              </>
            )}
          </button>
        </div>

        {/* Notes Section */}
        <div className="mt-12 max-w-4xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-stone-700">Notes</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-700"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {showPreview ? (
            <div
              className="prose min-h-[200px] rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
              dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
            />
          ) : (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write your notes here... Supports **bold**, *italic*, # headers, - lists, `code`, and more."
              className="min-h-[200px] w-full resize-y rounded-lg border border-stone-200 bg-white p-4 font-mono text-sm text-stone-800 shadow-sm outline-none placeholder:text-stone-400 focus:border-stone-300 focus:ring-2 focus:ring-stone-100"
            />
          )}
        </div>
      </div>
    </div>
  );
}
