import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import type { Tool, Element, SVGAttributes } from '../types';

interface CanvasProps {
  activeTool: Tool;
  elements: Element[];
  onElementsChange: (elements: Element[]) => void;
  onElementSelect: (element: Element | null) => void;
  selectedElement: Element | null;
  zoom: number;
  showMeasurements: boolean;
}

export const Canvas = forwardRef<SVGSVGElement, CanvasProps>(
  ({ activeTool, elements, onElementsChange, onElementSelect, selectedElement, zoom, showMeasurements }, ref) => {
    const [drawing, setDrawing] = useState(false);
    const [currentElement, setCurrentElement] = useState<Element | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [cutPath, setCutPath] = useState<{ x: number; y: number }[]>([]);

    const getMousePosition = useCallback((e: React.MouseEvent) => {
      const svg = ref as React.RefObject<SVGSVGElement>;
      if (!svg.current) return { x: 0, y: 0 };

      const rect = svg.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom
      };
    }, [zoom]);

    const createElementAttributes = (point: { x: number; y: number }): SVGAttributes => {
      const baseAttributes: SVGAttributes = {
        fill: 'none',
        stroke: '#000',
        strokeWidth: '2'
      };

      if (activeTool === 'ellipse') {
        return {
          ...baseAttributes,
          cx: point.x.toString(),
          cy: point.y.toString(),
          rx: '0',
          ry: '0'
        };
      } else if (activeTool === 'line') {
        return {
          ...baseAttributes,
          x1: point.x.toString(),
          y1: point.y.toString(),
          x2: point.x.toString(),
          y2: point.y.toString()
        };
      }

      return {
        ...baseAttributes,
        x: point.x.toString(),
        y: point.y.toString(),
        width: '0',
        height: '0'
      };
    };

    const startDrawing = (e: React.MouseEvent) => {
      const point = getMousePosition(e);

      if (activeTool === 'select') {
        const target = e.target as SVGElement;
        const elementId = target.getAttribute('data-id');
        const clickedElement = elements.find(el => el.id === elementId);

        if (clickedElement) {
          const handle = target.getAttribute('data-handle');
          if (handle) {
            setResizeHandle(handle);
            onElementSelect(clickedElement);
          } else {
            setDragStart(point);
            onElementSelect(clickedElement);
          }
        } else {
          onElementSelect(null);
        }
        return;
      }

      if (activeTool === 'cut') {
        setCutPath([point]);
        setDrawing(true);
        return;
      }

      setDrawing(true);
      const newElement: Element = {
        id: Date.now().toString(),
        type: activeTool === 'text' ? 'text' : 
              activeTool === 'path' ? 'path' : 
              activeTool === 'line' ? 'line' : activeTool,
        attributes: createElementAttributes(point)
      };
      setCurrentElement(newElement);
    };

    const draw = (e: React.MouseEvent) => {
      if (!drawing && !dragStart && !resizeHandle) return;

      const point = getMousePosition(e);

      if (activeTool === 'cut' && drawing) {
        setCutPath(prev => [...prev, point]);
        return;
      }

      if (selectedElement && dragStart) {
        // Handle dragging for all element types
        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;

        const updatedElement = { ...selectedElement };
        if (selectedElement.type === 'ellipse') {
          const cx = parseFloat(selectedElement.attributes.cx || '0') + dx;
          const cy = parseFloat(selectedElement.attributes.cy || '0') + dy;
          updatedElement.attributes = {
            ...updatedElement.attributes,
            cx: cx.toString(),
            cy: cy.toString()
          };
        } else if (selectedElement.type === 'line') {
          const x1 = parseFloat(selectedElement.attributes.x1 || '0') + dx;
          const y1 = parseFloat(selectedElement.attributes.y1 || '0') + dy;
          const x2 = parseFloat(selectedElement.attributes.x2 || '0') + dx;
          const y2 = parseFloat(selectedElement.attributes.y2 || '0') + dy;
          updatedElement.attributes = {
            ...updatedElement.attributes,
            x1: x1.toString(),
            y1: y1.toString(),
            x2: x2.toString(),
            y2: y2.toString()
          };
        } else {
          const x = parseFloat(selectedElement.attributes.x || '0') + dx;
          const y = parseFloat(selectedElement.attributes.y || '0') + dy;
          updatedElement.attributes = {
            ...updatedElement.attributes,
            x: x.toString(),
            y: y.toString()
          };
        }

        const newElements = elements.map(el => 
          el.id === selectedElement.id ? updatedElement : el
        );
        onElementsChange(newElements);
        setDragStart(point);
        return;
      }

      if (selectedElement && resizeHandle) {
        const updatedElement = { ...selectedElement };
        
        if (selectedElement.type === 'rect') {
          const x = parseFloat(selectedElement.attributes.x || '0');
          const y = parseFloat(selectedElement.attributes.y || '0');
          const width = parseFloat(selectedElement.attributes.width || '0');
          const height = parseFloat(selectedElement.attributes.height || '0');

          switch (resizeHandle) {
            case 'nw':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                x: point.x.toString(),
                y: point.y.toString(),
                width: Math.max(1, x + width - point.x).toString(),
                height: Math.max(1, y + height - point.y).toString()
              };
              break;
            case 'ne':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                y: point.y.toString(),
                width: Math.max(1, point.x - x).toString(),
                height: Math.max(1, y + height - point.y).toString()
              };
              break;
            case 'se':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                width: Math.max(1, point.x - x).toString(),
                height: Math.max(1, point.y - y).toString()
              };
              break;
            case 'sw':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                x: point.x.toString(),
                width: Math.max(1, x + width - point.x).toString(),
                height: Math.max(1, point.y - y).toString()
              };
              break;
          }
        } else if (selectedElement.type === 'ellipse') {
          const cx = parseFloat(selectedElement.attributes.cx || '0');
          const cy = parseFloat(selectedElement.attributes.cy || '0');
          
          switch (resizeHandle) {
            case 'n':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                ry: Math.max(1, Math.abs(cy - point.y)).toString()
              };
              break;
            case 's':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                ry: Math.max(1, Math.abs(point.y - cy)).toString()
              };
              break;
            case 'e':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                rx: Math.max(1, Math.abs(point.x - cx)).toString()
              };
              break;
            case 'w':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                rx: Math.max(1, Math.abs(cx - point.x)).toString()
              };
              break;
          }
        } else if (selectedElement.type === 'line') {
          switch (resizeHandle) {
            case 'start':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                x1: point.x.toString(),
                y1: point.y.toString()
              };
              break;
            case 'end':
              updatedElement.attributes = {
                ...updatedElement.attributes,
                x2: point.x.toString(),
                y2: point.y.toString()
              };
              break;
          }
        }

        const newElements = elements.map(el => 
          el.id === selectedElement.id ? updatedElement : el
        );
        onElementsChange(newElements);
        return;
      }

      if (!currentElement) return;

      if (currentElement.type === 'ellipse') {
        const cx = parseFloat(currentElement.attributes.cx || '0');
        const cy = parseFloat(currentElement.attributes.cy || '0');
        const rx = Math.abs(point.x - cx);
        const ry = Math.abs(point.y - cy);

        setCurrentElement({
          ...currentElement,
          attributes: {
            ...currentElement.attributes,
            rx: rx.toString(),
            ry: ry.toString()
          }
        });
      } else if (currentElement.type === 'line') {
        setCurrentElement({
          ...currentElement,
          attributes: {
            ...currentElement.attributes,
            x2: point.x.toString(),
            y2: point.y.toString()
          }
        });
      } else {
        const x = parseFloat(currentElement.attributes.x || '0');
        const y = parseFloat(currentElement.attributes.y || '0');
        const width = point.x - x;
        const height = point.y - y;

        setCurrentElement({
          ...currentElement,
          attributes: {
            ...currentElement.attributes,
            width: width.toString(),
            height: height.toString()
          }
        });
      }
    };

    const endDrawing = () => {
      if (activeTool === 'cut' && cutPath.length > 2) {
        setCutPath([]);
      }

      setDragStart(null);
      setResizeHandle(null);

      if (!drawing) return;

      if (currentElement) {
        onElementsChange([...elements, currentElement]);
        setCurrentElement(null);
      }

      setDrawing(false);
    };

    const renderResizeHandles = (element: Element) => {
      if (element.id !== selectedElement?.id || activeTool !== 'select') return null;

      const handles = [];
      if (element.type === 'rect') {
        const x = parseFloat(element.attributes.x || '0');
        const y = parseFloat(element.attributes.y || '0');
        const width = parseFloat(element.attributes.width || '0');
        const height = parseFloat(element.attributes.height || '0');

        const handlePositions = [
          { id: 'nw', x: x, y: y },
          { id: 'ne', x: x + width, y: y },
          { id: 'se', x: x + width, y: y + height },
          { id: 'sw', x: x, y: y + height }
        ];

        handles.push(...handlePositions.map(pos => (
          <circle
            key={pos.id}
            data-id={element.id}
            data-handle={pos.id}
            cx={pos.x}
            cy={pos.y}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
        )));
      } else if (element.type === 'ellipse') {
        const cx = parseFloat(element.attributes.cx || '0');
        const cy = parseFloat(element.attributes.cy || '0');
        const rx = parseFloat(element.attributes.rx || '0');
        const ry = parseFloat(element.attributes.ry || '0');

        const handlePositions = [
          { id: 'n', x: cx, y: cy - ry },
          { id: 's', x: cx, y: cy + ry },
          { id: 'e', x: cx + rx, y: cy },
          { id: 'w', x: cx - rx, y: cy }
        ];

        handles.push(...handlePositions.map(pos => (
          <circle
            key={pos.id}
            data-id={element.id}
            data-handle={pos.id}
            cx={pos.x}
            cy={pos.y}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
        )));
      } else if (element.type === 'line') {
        const x1 = parseFloat(element.attributes.x1 || '0');
        const y1 = parseFloat(element.attributes.y1 || '0');
        const x2 = parseFloat(element.attributes.x2 || '0');
        const y2 = parseFloat(element.attributes.y2 || '0');

        handles.push(
          <circle
            key="start"
            data-id={element.id}
            data-handle="start"
            cx={x1}
            cy={y1}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />,
          <circle
            key="end"
            data-id={element.id}
            data-handle="end"
            cx={x2}
            cy={y2}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
        );
      }

      return handles;
    };

    const renderMeasurements = (element: Element) => {
      if (!showMeasurements) return null;

      if (element.type === 'rect') {
        const x = parseFloat(element.attributes.x || '0');
        const y = parseFloat(element.attributes.y || '0');
        const width = parseFloat(element.attributes.width || '0');
        const height = parseFloat(element.attributes.height || '0');

        return (
          <>
            <text x={x + width/2} y={y - 5} textAnchor="middle" fill="white">
              {Math.round(width)}
            </text>
            <text x={x - 5} y={y + height/2} textAnchor="end" fill="white">
              {Math.round(height)}
            </text>
          </>
        );
      } else if (element.type === 'ellipse') {
        const rx = parseFloat(element.attributes.rx || '0');
        const ry = parseFloat(element.attributes.ry || '0');
        const cx = parseFloat(element.attributes.cx || '0');
        const cy = parseFloat(element.attributes.cy || '0');

        return (
          <>
            <text x={cx + rx + 5} y={cy} fill="white">
              r: {Math.round(rx)}x{Math.round(ry)}
            </text>
          </>
        );
      } else if (element.type === 'line') {
        const x1 = parseFloat(element.attributes.x1 || '0');
        const y1 = parseFloat(element.attributes.y1 || '0');
        const x2 = parseFloat(element.attributes.x2 || '0');
        const y2 = parseFloat(element.attributes.y2 || '0');
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        return (
          <text x={midX} y={midY - 5} textAnchor="middle" fill="white">
            {Math.round(length)}
          </text>
        );
      }

      return null;
    };

    const renderElement = (element: Element) => {
      const isSelected = selectedElement?.id === element.id;
      const props = {
        key: element.id,
        'data-id': element.id,
        ...element.attributes,
        style: {
          cursor: activeTool === 'select' ? 'move' : 'default'
        },
        ...(isSelected && {
          strokeDasharray: '5,5',
          stroke: '#00ff00',
          strokeWidth: '2'
        })
      };

      return (
        <g key={element.id}>
          {element.type === 'rect' && <rect {...props} />}
          {element.type === 'ellipse' && <ellipse {...props} />}
          {element.type === 'path' && <path {...props} />}
          {element.type === 'text' && <text {...props} />}
          {element.type === 'line' && <line {...props} />}
          {isSelected && renderResizeHandles(element)}
          {showMeasurements && renderMeasurements(element)}
        </g>
      );
    };

    return (
      <div className="flex-1 bg-gray-700 overflow-hidden">
        <svg
          ref={ref}
          className="w-full h-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
        >
          <g>
            {elements.map(renderElement)}
            {currentElement && renderElement(currentElement)}
            {cutPath.length > 0 && (
              <path
                d={`M ${cutPath[0].x} ${cutPath[0].y} ${cutPath.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')}`}
                stroke="red"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
              />
            )}
          </g>
        </svg>
      </div>
    );
  }
);