import React, { forwardRef, useState, useCallback, useEffect } from 'react';
import type { Tool, Element, Point } from '../types';
import { cutShape } from '../utils/shapeOperations';

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
    const [dragStart, setDragStart] = useState<Point | null>(null);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [cutPath, setCutPath] = useState<Point[]>([]);
    const [curvePoints, setCurvePoints] = useState<Point[]>([]);
    const [controlPoints, setControlPoints] = useState<Point[]>([]);
    const [isDraggingControl, setIsDraggingControl] = useState(false);
    const [activeControlPoint, setActiveControlPoint] = useState<number | null>(null);
    const [originalPosition, setOriginalPosition] = useState<Point | null>(null);
    const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);

    const [curveStartPoint, setCurveStartPoint] = useState<Point | null>(null);
    const [curveEndPoint, setCurveEndPoint] = useState<Point | null>(null);
    const [curveControlPoint1, setCurveControlPoint1] = useState<Point | null>(null);
    const [curveControlPoint2, setCurveControlPoint2] = useState<Point | null>(null);
    const [isDrawingCurve, setIsDrawingCurve] = useState(false);

    const [rotationAngle, setRotationAngle] = useState(0);
    const [isRotating, setIsRotating] = useState(false);
    const [rotationCenter, setRotationCenter] = useState<Point | null>(null);
    const [rotationStartAngle, setRotationStartAngle] = useState(0);
    const [cutStartElement, setCutStartElement] = useState<Element | null>(null);

    const getMousePosition = useCallback((e: React.MouseEvent): Point => {
      const svg = ref as React.RefObject<SVGSVGElement>;
      if (!svg.current) return { x: 0, y: 0 };

      const rect = svg.current.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom
      };
    }, [zoom]);

    const getElementCenter = (element: Element): Point => {
      if (element.type === 'ellipse') {
        return {
          x: parseFloat(element.attributes.cx || '0'),
          y: parseFloat(element.attributes.cy || '0')
        };
      }
      const box = getElementBoundingBox(element);
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };
    };

    const getCurrentRotation = (element: Element): number => {
      const transform = element.attributes.transform || '';
      const match = transform.match(/rotate\(([-\d.]+)/);
      return match ? parseFloat(match[1]) : 0;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      const point = getMousePosition(e);
      const target = e.target as SVGElement;
      const elementId = target.getAttribute('data-element-id');
      const handle = target.getAttribute('data-handle');

      if (activeTool === 'cut') {
        const clickedElement = elements.find(el => el.id === elementId);
        if (clickedElement) {
          setCutStartElement(clickedElement);
          setCutPath([point]);
        }
        return;
      }

      if (handle === 'rotation') {
        setIsRotating(true);
        const element = elements.find(el => el.id === elementId);
        if (element) {
          const center = getElementCenter(element);
          setRotationCenter(center);
          const currentAngle = getCurrentRotation(element);
          const mouseAngle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
          setRotationStartAngle(mouseAngle - currentAngle);
          setRotationAngle(currentAngle);
        }
        return;
      }

      if (activeTool === 'curve') {
        if (!isDrawingCurve) {
          setIsDrawingCurve(true);
          setCurveStartPoint(point);
          setCurveEndPoint(point);
          const initialControlPoint1 = { x: point.x, y: point.y - 50 };
          const initialControlPoint2 = { x: point.x, y: point.y - 50 };
          setCurveControlPoint1(initialControlPoint1);
          setCurveControlPoint2(initialControlPoint2);
          
          const newElement: Element = {
            id: Date.now().toString(),
            type: 'path',
            attributes: {
              d: `M ${point.x} ${point.y}`,
              fill: 'none',
              stroke: '#000',
              strokeWidth: '2'
            }
          };
          setCurrentElement(newElement);
          onElementsChange([...elements, newElement]);
        } else if (target.getAttribute('data-control-point')) {
          setIsDraggingControl(true);
          setActiveControlPoint(target.getAttribute('data-control-point') as any);
        } else {
          setIsDrawingCurve(false);
          setCurveStartPoint(null);
          setCurveEndPoint(null);
          setCurveControlPoint1(null);
          setCurveControlPoint2(null);
          setCurrentElement(null);
        }
        return;
      }

      if (activeTool === 'select') {
        const element = elements.find(el => el.id === elementId);
        if (element) {
          const handle = target.getAttribute('data-handle');
          if (handle) {
            setResizeHandle(handle);
            setDragStart(point);
            setOriginalPosition(getElementPosition(element));
            setOriginalDimensions(getElementDimensions(element));
          } else {
            setDragStart(point);
            setOriginalPosition(getElementPosition(element));
          }
          onElementSelect(element);
        } else {
          onElementSelect(null);
        }
        return;
      }

      setDrawing(true);
      const newElement = createNewElement(point, activeTool);
      if (newElement) {
        setCurrentElement(newElement);
        onElementsChange([...elements, newElement]);
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      const point = getMousePosition(e);

      if (activeTool === 'cut' && cutPath.length > 0) {
        setCutPath([...cutPath, point]);
        return;
      }

      if (isRotating && selectedElement && rotationCenter) {
        const mouseAngle = Math.atan2(point.y - rotationCenter.y, point.x - rotationCenter.x) * 180 / Math.PI;
        const newAngle = mouseAngle - rotationStartAngle;
        
        const updatedElement = {
          ...selectedElement,
          attributes: {
            ...selectedElement.attributes,
            transform: `rotate(${newAngle} ${rotationCenter.x} ${rotationCenter.y})`
          }
        };

        onElementsChange(elements.map(el =>
          el.id === selectedElement.id ? updatedElement : el
        ));
        setRotationAngle(newAngle);
        return;
      }

      if (activeTool === 'curve' && isDrawingCurve) {
        if (isDraggingControl && activeControlPoint) {
          if (activeControlPoint === 'cp1') {
            setCurveControlPoint1(point);
          } else {
            setCurveControlPoint2(point);
          }
        } else {
          setCurveEndPoint(point);
          if (!isDraggingControl) {
            const dx = point.x - (curveStartPoint?.x || 0);
            const dy = point.y - (curveStartPoint?.y || 0);
            setCurveControlPoint1({
              x: (curveStartPoint?.x || 0) + dx / 3,
              y: (curveStartPoint?.y || 0) + dy / 3
            });
            setCurveControlPoint2({
              x: (curveStartPoint?.x || 0) + 2 * dx / 3,
              y: (curveStartPoint?.y || 0) + 2 * dy / 3
            });
          }
        }

        if (currentElement && curveStartPoint && curveEndPoint && curveControlPoint1 && curveControlPoint2) {
          const pathData = `M ${curveStartPoint.x} ${curveStartPoint.y} C ${curveControlPoint1.x} ${curveControlPoint1.y}, ${curveControlPoint2.x} ${curveControlPoint2.y}, ${curveEndPoint.x} ${curveEndPoint.y}`;
          const updatedElement = {
            ...currentElement,
            attributes: {
              ...currentElement.attributes,
              d: pathData
            }
          };
          setCurrentElement(updatedElement);
          onElementsChange(elements.map(el => 
            el.id === currentElement.id ? updatedElement : el
          ));
        }
        return;
      }

      if (!drawing && !dragStart) return;

      if (dragStart && selectedElement) {
        if (resizeHandle) {
          handleResize(selectedElement, point);
        } else {
          handleDrag(selectedElement, point);
        }
        return;
      }

      if (currentElement) {
        updateCurrentElement(point);
      }
    };

    const handleMouseUp = () => {
      if (activeTool === 'cut' && cutPath.length > 1 && cutStartElement) {
        const newElements = cutShape(cutStartElement, cutPath);
        onElementsChange(
          elements.map(el =>
            el.id === cutStartElement.id ? newElements[0] : el
          ).concat(newElements.slice(1))
        );
        setCutPath([]);
        setCutStartElement(null);
        return;
      }

      if (activeTool === 'curve') {
        setIsDraggingControl(false);
        setActiveControlPoint(null);
        return;
      }

      setIsRotating(false);
      setRotationCenter(null);
      setDrawing(false);
      setDragStart(null);
      setResizeHandle(null);
      setOriginalPosition(null);
      setOriginalDimensions(null);
      setCurrentElement(null);
    };

    const createNewElement = (point: Point, tool: Tool): Element | null => {
      const baseAttributes = {
        fill: 'none',
        stroke: '#000',
        strokeWidth: '2'
      };

      switch (tool) {
        case 'rect':
          return {
            id: Date.now().toString(),
            type: 'rect',
            attributes: {
              ...baseAttributes,
              x: point.x.toString(),
              y: point.y.toString(),
              width: '0',
              height: '0'
            }
          };
        case 'ellipse':
          return {
            id: Date.now().toString(),
            type: 'ellipse',
            attributes: {
              ...baseAttributes,
              cx: point.x.toString(),
              cy: point.y.toString(),
              rx: '0',
              ry: '0'
            }
          };
        case 'line':
          return {
            id: Date.now().toString(),
            type: 'line',
            attributes: {
              ...baseAttributes,
              x1: point.x.toString(),
              y1: point.y.toString(),
              x2: point.x.toString(),
              y2: point.y.toString()
            }
          };
        default:
          return null;
      }
    };

    const getElementPosition = (element: Element): Point => {
      if (element.type === 'ellipse') {
        return {
          x: parseFloat(element.attributes.cx || '0'),
          y: parseFloat(element.attributes.cy || '0')
        };
      }
      return {
        x: parseFloat(element.attributes.x || '0'),
        y: parseFloat(element.attributes.y || '0')
      };
    };

    const getElementDimensions = (element: Element) => {
      if (element.type === 'rect') {
        return {
          width: parseFloat(element.attributes.width || '0'),
          height: parseFloat(element.attributes.height || '0')
        };
      }
      if (element.type === 'ellipse') {
        return {
          width: parseFloat(element.attributes.rx || '0') * 2,
          height: parseFloat(element.attributes.ry || '0') * 2
        };
      }
      return { width: 0, height: 0 };
    };

    const handleResize = (element: Element, point: Point) => {
      if (!originalPosition || !originalDimensions || !dragStart) return;

      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      const updatedElement = { ...element };

      if (element.type === 'rect') {
        const { x, y } = originalPosition;
        const { width, height } = originalDimensions;

        switch (resizeHandle) {
          case 'nw':
            updatedElement.attributes = {
              ...updatedElement.attributes,
              x: (x + dx).toString(),
              y: (y + dy).toString(),
              width: Math.max(1, width - dx).toString(),
              height: Math.max(1, height - dy).toString()
            };
            break;
          case 'ne':
            updatedElement.attributes = {
              ...updatedElement.attributes,
              y: (y + dy).toString(),
              width: Math.max(1, width + dx).toString(),
              height: Math.max(1, height - dy).toString()
            };
            break;
          case 'se':
            updatedElement.attributes = {
              ...updatedElement.attributes,
              width: Math.max(1, width + dx).toString(),
              height: Math.max(1, height + dy).toString()
            };
            break;
          case 'sw':
            updatedElement.attributes = {
              ...updatedElement.attributes,
              x: (x + dx).toString(),
              width: Math.max(1, width - dx).toString(),
              height: Math.max(1, height + dy).toString()
            };
            break;
        }
      } else if (element.type === 'ellipse') {
        const cx = parseFloat(element.attributes.cx || '0');
        const cy = parseFloat(element.attributes.cy || '0');

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
      }

      onElementsChange(elements.map(el => 
        el.id === element.id ? updatedElement : el
      ));
    };

    const handleDrag = (element: Element, point: Point) => {
      if (!dragStart || !originalPosition) return;

      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      const updatedElement = { ...element };

      if (element.type === 'ellipse') {
        const cx = parseFloat(originalPosition.x.toString());
        const cy = parseFloat(originalPosition.y.toString());
        updatedElement.attributes = {
          ...updatedElement.attributes,
          cx: (cx + dx).toString(),
          cy: (cy + dy).toString()
        };
      } else if (element.type === 'line') {
        const x1 = parseFloat(element.attributes.x1 || '0');
        const y1 = parseFloat(element.attributes.y1 || '0');
        const x2 = parseFloat(element.attributes.x2 || '0');
        const y2 = parseFloat(element.attributes.y2 || '0');
        updatedElement.attributes = {
          ...updatedElement.attributes,
          x1: (x1 + dx).toString(),
          y1: (y1 + dy).toString(),
          x2: (x2 + dx).toString(),
          y2: (y2 + dy).toString()
        };
      } else {
        const x = parseFloat(originalPosition.x.toString());
        const y = parseFloat(originalPosition.y.toString());
        updatedElement.attributes = {
          ...updatedElement.attributes,
          x: (x + dx).toString(),
          y: (y + dy).toString()
        };
      }

      onElementsChange(elements.map(el => 
        el.id === element.id ? updatedElement : el
      ));
    };

    const updateCurrentElement = (point: Point) => {
      if (!currentElement) return;

      const updatedElement = { ...currentElement };

      if (currentElement.type === 'ellipse') {
        const cx = parseFloat(currentElement.attributes.cx || '0');
        const cy = parseFloat(currentElement.attributes.cy || '0');
        updatedElement.attributes = {
          ...updatedElement.attributes,
          rx: Math.abs(point.x - cx).toString(),
          ry: Math.abs(point.y - cy).toString()
        };
      } else if (currentElement.type === 'line') {
        updatedElement.attributes = {
          ...updatedElement.attributes,
          x2: point.x.toString(),
          y2: point.y.toString()
        };
      } else if (currentElement.type === 'rect') {
        const x = parseFloat(currentElement.attributes.x || '0');
        const y = parseFloat(currentElement.attributes.y || '0');
        updatedElement.attributes = {
          ...updatedElement.attributes,
          width: Math.abs(point.x - x).toString(),
          height: Math.abs(point.y - y).toString(),
          x: (point.x < x ? point.x : x).toString(),
          y: (point.y < y ? point.y : y).toString()
        };
      }

      setCurrentElement(updatedElement);
      onElementsChange(elements.map(el => 
        el.id === currentElement.id ? updatedElement : el
      ));
    };

    const createCurvePath = (points: Point[], controls: Point[]): string => {
      if (points.length < 2) return '';
      
      let path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        if (controls.length >= i * 2) {
          const control1 = controls[i * 2 - 2];
          const control2 = controls[i * 2 - 1];
          path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${points[i].x} ${points[i].y}`;
        } else {
          path += ` L ${points[i].x} ${points[i].y}`;
        }
      }
      
      return path;
    };

    const getElementBoundingBox = (element: Element) => {
      if (element.type === 'rect') {
        return {
          x: parseFloat(element.attributes.x || '0'),
          y: parseFloat(element.attributes.y || '0'),
          width: parseFloat(element.attributes.width || '0'),
          height: parseFloat(element.attributes.height || '0')
        };
      } else if (element.type === 'ellipse') {
        const cx = parseFloat(element.attributes.cx || '0');
        const cy = parseFloat(element.attributes.cy || '0');
        const rx = parseFloat(element.attributes.rx || '0');
        const ry = parseFloat(element.attributes.ry || '0');
        return {
          x: cx - rx,
          y: cy - ry,
          width: rx * 2,
          height: ry * 2
        };
      }
      return { x: 0, y: 0, width: 0, height: 0 };
    };

    const getRotationAngle = (point: Point, box: { x: number; y: number; width: number; height: number }) => {
      const center = {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2
      };
      return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
    };

    const renderRotationHandle = (element: Element) => {
      if (element.id !== selectedElement?.id || activeTool !== 'select') return null;

      const center = getElementCenter(element);
      const handleY = center.y - 40;

      return (
        <g>
          <line
            x1={center.x}
            y1={center.y}
            x2={center.x}
            y2={handleY}
            stroke="#00ff00"
            strokeWidth="2"
          />
          <circle
            data-element-id={element.id}
            data-handle="rotation"
            cx={center.x}
            cy={handleY}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
        </g>
      );
    };

    const renderElement = (element: Element) => {
      const isSelected = element.id === selectedElement?.id;
      const commonProps = {
        'data-element-id': element.id,
        style: { cursor: activeTool === 'select' ? 'move' : 'default' },
        ...element.attributes,
        stroke: isSelected ? '#00ff00' : element.attributes.stroke,
        strokeWidth: isSelected ? '2' : element.attributes.strokeWidth,
        strokeDasharray: isSelected ? '5,5' : undefined
      };

      return (
        <g key={element.id}>
          {element.type === 'rect' && <rect {...commonProps} />}
          {element.type === 'ellipse' && <ellipse {...commonProps} />}
          {element.type === 'line' && <line {...commonProps} />}
          {element.type === 'path' && <path {...commonProps} />}
          {isSelected && renderResizeHandles(element)}
          {isSelected && renderRotationHandle(element)}
          {showMeasurements && renderMeasurements(element)}
        </g>
      );
    };

    const renderResizeHandles = (element: Element) => {
      if (element.id !== selectedElement?.id || activeTool !== 'select') return null;

      const handles = [];
      if (element.type === 'rect') {
        const x = parseFloat(element.attributes.x || '0');
        const y = parseFloat(element.attributes.y || '0');
        const width = parseFloat(element.attributes.width || '0');
        const height = parseFloat(element.attributes.height || '0');

        const positions = [
          { id: 'nw', x, y },
          { id: 'ne', x: x + width, y },
          { id: 'se', x: x + width, y: y + height },
          { id: 'sw', x, y: y + height }
        ];

        positions.forEach(pos => {
          handles.push(
            <circle
              key={pos.id}
              data-element-id={element.id}
              data-handle={pos.id}
              cx={pos.x}
              cy={pos.y}
              r="4"
              fill="#00ff00"
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
            />
          );
        });
      } else if (element.type === 'ellipse') {
        const cx = parseFloat(element.attributes.cx || '0');
        const cy = parseFloat(element.attributes.cy || '0');
        const rx = parseFloat(element.attributes.rx || '0');
        const ry = parseFloat(element.attributes.ry || '0');

        const positions = [
          { id: 'n', x: cx, y: cy - ry },
          { id: 's', x: cx, y: cy + ry },
          { id: 'e', x: cx + rx, y: cy },
          { id: 'w', x: cx - rx, y: cy }
        ];

        positions.forEach(pos => {
          handles.push(
            <circle
              key={pos.id}
              data-element-id={element.id}
              data-handle={pos.id}
              cx={pos.x}
              cy={pos.y}
              r="4"
              fill="#00ff00"
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
            />
          );
        });
      }

      return handles;
    };

    const renderMeasurements = (element: Element) => {
      if (!showMeasurements) return null;

      if (element.type === 'rect') {
        const width = parseFloat(element.attributes.width || '0');
        const height = parseFloat(element.attributes.height || '0');
        const x = parseFloat(element.attributes.x || '0');
        const y = parseFloat(element.attributes.y || '0');

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
      }

      if (element.type === 'ellipse') {
        const rx = parseFloat(element.attributes.rx || '0');
        const ry = parseFloat(element.attributes.ry || '0');
        const cx = parseFloat(element.attributes.cx || '0');
        const cy = parseFloat(element.attributes.cy || '0');

        return (
          <text x={cx + rx + 5} y={cy} fill="white">
            {Math.round(rx)}×{Math.round(ry)}
          </text>
        );
      }

      return null;
    };

    const renderCurveControls = () => {
      if (!isDrawingCurve || !curveStartPoint || !curveEndPoint || !curveControlPoint1 || !curveControlPoint2) {
        return null;
      }

      return (
        <g>
          <line
            x1={curveStartPoint.x}
            y1={curveStartPoint.y}
            x2={curveControlPoint1.x}
            y2={curveControlPoint1.y}
            stroke="#666"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <line
            x1={curveEndPoint.x}
            y1={curveEndPoint.y}
            x2={curveControlPoint2.x}
            y2={curveControlPoint2.y}
            stroke="#666"
            strokeWidth="1"
            strokeDasharray="5,5"
          />

          <circle
            data-control-point="cp1"
            cx={curveControlPoint1.x}
            cy={curveControlPoint1.y}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
          <circle
            data-control-point="cp2"
            cx={curveControlPoint2.x}
            cy={curveControlPoint2.y}
            r="4"
            fill="#00ff00"
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          />
        </g>
      );
    };

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && activeTool === 'curve' && drawing) {
          setDrawing(false);
          setCurvePoints([]);
          setControlPoints([]);
          setCurrentElement(null);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawing, activeTool]);

    return (
      <div className="flex-1 overflow-hidden bg-white text-black">
        <svg
          ref={ref}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`scale(${zoom})`}>
            {elements.map(renderElement)}
            {currentElement && renderElement(currentElement)}
            {activeTool === 'curve' && renderCurveControls()}
            {cutPath.length > 1 && (
              <path
                d={`M ${cutPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
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