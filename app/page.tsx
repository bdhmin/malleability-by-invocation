'use client';

import { useState, useMemo, useEffect } from 'react';

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

  return (
    <div className="min-h-screen bg-stone-50 p-8 font-sans">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-stone-800">
          UI Input Methods
        </h1>
        <p className="mb-8 text-stone-500">
          Different ways to provide input for UI customization
        </p>

        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {headers.map((header, colIndex) => (
                  <th
                    key={colIndex}
                    className="group relative border-b border-r border-stone-200 bg-stone-100 p-0 text-left font-medium text-stone-600 last:border-r-0"
                  >
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => updateHeader(colIndex, e.target.value)}
                        placeholder={`Column ${colIndex + 1}`}
                        className="flex-1 bg-transparent px-4 py-3 text-sm font-medium text-stone-600 outline-none placeholder:text-stone-400 focus:bg-amber-50"
                      />
                      {headers.length > 1 && (
                        <button
                          onClick={() => deleteColumn(colIndex)}
                          className="mr-2 rounded p-1 text-stone-400 opacity-0 transition-opacity hover:bg-stone-200 hover:text-stone-600 group-hover:opacity-100"
                          title="Delete column"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-10 border-b border-stone-200 bg-stone-100"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="group">
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      className="border-b border-r border-stone-200 p-0 last:border-r-0"
                    >
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) =>
                          updateCell(rowIndex, colIndex, e.target.value)
                        }
                        className="h-full w-full bg-transparent px-4 py-3 text-stone-800 outline-none placeholder:text-stone-300 focus:bg-amber-50"
                        placeholder={colIndex === 0 ? 'New item...' : ''}
                      />
                    </td>
                  ))}
                  <td className="w-10 border-b border-stone-200 bg-stone-50">
                    {data.length > 1 && (
                      <button
                        onClick={() => deleteRow(rowIndex)}
                        className="flex h-full w-full items-center justify-center p-2 text-stone-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        title="Delete row"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-800"
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
          <button
            onClick={addColumn}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-800"
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
            Add Column
          </button>
        </div>

        {/* Notes Section */}
        <div className="mt-12">
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
