import React from 'react';
import type { Element } from '../types';

interface PropertiesProps {
  selectedElement: Element | null;
  onElementUpdate: (element: Element) => void;
  onSplitShape: () => void;
}

export function Properties({ selectedElement, onElementUpdate, onSplitShape }: PropertiesProps) {
  if (!selectedElement) {
    return (
      <div className="w-64 bg-gray-800 p-4 text-white">
        <p>No element selected</p>
      </div>
    );
  }

  const handleChange = (key: string, value: string) => {
    const updatedElement = {
      ...selectedElement,
      attributes: {
        ...selectedElement.attributes,
        [key]: value,
      },
    };
    onElementUpdate(updatedElement);
  };

  const getDimensions = () => {
    if (selectedElement.type === 'rect' || selectedElement.type === 'path') {
      return {
        width: parseFloat(selectedElement.attributes.width || '0'),
        height: parseFloat(selectedElement.attributes.height || '0'),
        x: parseFloat(selectedElement.attributes.x || '0'),
        y: parseFloat(selectedElement.attributes.y || '0')
      };
    } else if (selectedElement.type === 'ellipse') {
      return {
        rx: parseFloat(selectedElement.attributes.rx || '0'),
        ry: parseFloat(selectedElement.attributes.ry || '0'),
        cx: parseFloat(selectedElement.attributes.cx || '0'),
        cy: parseFloat(selectedElement.attributes.cy || '0')
      };
    }
    return null;
  };

  const dimensions = getDimensions();

  return (
    <div className="w-64 bg-gray-800 p-4 text-white overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Properties</h2>
      
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">Type: {selectedElement.type}</h3>
        {dimensions && (
          <div className="space-y-2">
            {(selectedElement.type === 'rect' || selectedElement.type === 'path') && (
              <>
                <div>
                  <label className="block text-sm">Width</label>
                  <input
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => handleChange('width', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm">Height</label>
                  <input
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm">X Position</label>
                  <input
                    type="number"
                    value={dimensions.x}
                    onChange={(e) => handleChange('x', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm">Y Position</label>
                  <input
                    type="number"
                    value={dimensions.y}
                    onChange={(e) => handleChange('y', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
              </>
            )}
            {selectedElement.type === 'ellipse' && (
              <>
                <div>
                  <label className="block text-sm">Radius X</label>
                  <input
                    type="number"
                    value={dimensions.rx}
                    onChange={(e) => handleChange('rx', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm">Radius Y</label>
                  <input
                    type="number"
                    value={dimensions.ry}
                    onChange={(e) => handleChange('ry', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm">Center X</label>
                  <input
                    type="number"
                    value={dimensions.cx}
                    onChange={(e) => handleChange('cx', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm">Center Y</label>
                  <input
                    type="number"
                    value={dimensions.cy}
                    onChange={(e) => handleChange('cy', e.target.value)}
                    className="w-full px-2 py-1 bg-gray-700 rounded text-white"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fill Color</label>
          <input
            type="color"
            value={selectedElement.attributes.fill || '#000000'}
            onChange={(e) => handleChange('fill', e.target.value)}
            className="w-full h-8 bg-gray-700 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Stroke Color</label>
          <input
            type="color"
            value={selectedElement.attributes.stroke || '#000000'}
            onChange={(e) => handleChange('stroke', e.target.value)}
            className="w-full h-8 bg-gray-700 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Stroke Width</label>
          <input
            type="number"
            value={selectedElement.attributes.strokeWidth || '2'}
            onChange={(e) => handleChange('strokeWidth', e.target.value)}
            className="w-full px-2 py-1 bg-gray-700 rounded text-white"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={onSplitShape}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Split Shape
        </button>
      </div>
    </div>
  );
}