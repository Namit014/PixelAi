import { useState } from 'react';
import { TableBlock as TableBlockType } from '@/types/brandBlocks';
import { Trash2, Plus } from 'lucide-react';

interface TableBlockProps {
  block: TableBlockType;
  onUpdate: (content: TableBlockType['content']) => void;
  onDelete: () => void;
  isPreviewMode?: boolean;
}

export const TableBlock = ({ block, onUpdate, onDelete, isPreviewMode = false }: TableBlockProps) => {
  const [headers, setHeaders] = useState(block.content.headers || ['Column 1', 'Column 2']);
  const [rows, setRows] = useState(block.content.rows || []);

  const handleHeaderChange = (index: number, value: string) => {
    const updatedHeaders = [...headers];
    updatedHeaders[index] = value;
    setHeaders(updatedHeaders);
    onUpdate({ headers: updatedHeaders, rows });
  };

  const handleCellChange = (rowId: string, cellIndex: number, value: string) => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        const updatedCells = [...row.cells];
        updatedCells[cellIndex] = value;
        return { ...row, cells: updatedCells };
      }
      return row;
    });
    setRows(updatedRows);
    onUpdate({ headers, rows: updatedRows });
  };

  const handleAddRow = () => {
    const newRow = {
      id: crypto.randomUUID(),
      cells: new Array(headers.length).fill('')
    };
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    onUpdate({ headers, rows: updatedRows });
  };

  const handleDeleteRow = (rowId: string) => {
    const updatedRows = rows.filter(row => row.id !== rowId);
    setRows(updatedRows);
    onUpdate({ headers, rows: updatedRows });
  };

  const handleAddColumn = () => {
    const updatedHeaders = [...headers, `Column ${headers.length + 1}`];
    const updatedRows = rows.map(row => ({
      ...row,
      cells: [...row.cells, '']
    }));
    setHeaders(updatedHeaders);
    setRows(updatedRows);
    onUpdate({ headers: updatedHeaders, rows: updatedRows });
  };

  const handleDeleteColumn = (index: number) => {
    if (headers.length <= 1) return;
    
    const updatedHeaders = headers.filter((_, i) => i !== index);
    const updatedRows = rows.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== index)
    }));
    setHeaders(updatedHeaders);
    setRows(updatedRows);
    onUpdate({ headers: updatedHeaders, rows: updatedRows });
  };

  return (
    <div className="group relative py-2">
      {!isPreviewMode && (
        <button
          onClick={onDelete}
          className="absolute -right-2 top-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 z-10"
        >
          <Trash2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        </button>
      )}

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-800">
              {headers.map((header, index) => (
                <th key={index} className="relative group/header">
                  {!isPreviewMode ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(index, e.target.value)}
                        className="w-full px-4 py-2 bg-transparent border-none outline-none text-sm font-semibold text-foreground"
                      />
                      {headers.length > 1 && (
                        <button
                          onClick={() => handleDeleteColumn(index)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/header:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Trash2 className="w-3 h-3 text-zinc-400" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm font-semibold text-foreground">{header}</div>
                  )}
                </th>
              ))}
              {!isPreviewMode && (
                <th className="w-10">
                  <button
                    onClick={handleAddColumn}
                    className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800 group/row">
                {row.cells.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border-r border-zinc-200 dark:border-zinc-800 last:border-r-0">
                    {!isPreviewMode ? (
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(row.id, cellIndex, e.target.value)}
                        className="w-full px-4 py-2 bg-transparent border-none outline-none text-sm text-foreground"
                      />
                    ) : (
                      <div className="px-4 py-2 text-sm text-foreground">{cell}</div>
                    )}
                  </td>
                ))}
                {!isPreviewMode && (
                  <td className="w-10">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover/row:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {!isPreviewMode && (
          <button
            onClick={handleAddRow}
            className="w-full px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center justify-center gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
          >
            <Plus className="w-4 h-4" />
            Add row
          </button>
        )}
      </div>
    </div>
  );
};
