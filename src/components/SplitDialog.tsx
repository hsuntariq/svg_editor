import React, { useState } from 'react';

interface SplitDialogProps {
  onSplit: (splitPoint: number, isVertical: boolean) => void;
  onClose: () => void;
}

export function SplitDialog({ onSplit, onClose }: SplitDialogProps) {
  const [splitPoint, setSplitPoint] = useState(0.5);
  const [isVertical, setIsVertical] = useState(true);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4 text-white">Split Shape</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-white mb-2">
            Split Point ({Math.round(splitPoint * 100)}%)
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={splitPoint}
            onChange={(e) => setSplitPoint(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            Split Direction
          </label>
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 rounded ${
                isVertical ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              onClick={() => setIsVertical(true)}
            >
              Vertical
            </button>
            <button
              className={`px-4 py-2 rounded ${
                !isVertical ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              onClick={() => setIsVertical(false)}
            >
              Horizontal
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => onSplit(splitPoint, isVertical)}
          >
            Split
          </button>
        </div>
      </div>
    </div>
  );
}