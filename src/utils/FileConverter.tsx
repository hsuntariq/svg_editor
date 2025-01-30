import React from 'react';

interface FileConverterProps {
    onExport: (format: 'svg' | 'dxf' | 'pdf' | 'png') => void;
}

export function FileConverter({ onExport }: FileConverterProps) {
    return (
        <div className="flex gap-2">
            <button
                onClick={() => onExport('svg')}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Export SVG
            </button>
            <button
                onClick={() => onExport('png')}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Export PNG
            </button>
            {/* Add DXF and PDF export buttons when implemented */}
        </div>
    );
}