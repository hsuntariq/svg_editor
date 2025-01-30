import type { Element } from '../types';

function lineIntersection(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number
): { x: number; y: number } | null {
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  return null;
}

function splitRectangleByLine(
  rect: Element,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
): Element[] {
  const x = parseFloat(rect.attributes.x || '0');
  const y = parseFloat(rect.attributes.y || '0');
  const width = parseFloat(rect.attributes.width || '0');
  const height = parseFloat(rect.attributes.height || '0');

  // Rectangle corners
  const corners = [
    { x, y }, // top-left
    { x: x + width, y }, // top-right
    { x: x + width, y: y + height }, // bottom-right
    { x, y: y + height } // bottom-left
  ];

  // Find intersections
  const intersections: { x: number; y: number }[] = [];
  for (let i = 0; i < corners.length; i++) {
    const nextIndex = (i + 1) % corners.length;
    const intersection = lineIntersection(
      startPoint.x, startPoint.y,
      endPoint.x, endPoint.y,
      corners[i].x, corners[i].y,
      corners[nextIndex].x, corners[nextIndex].y
    );
    if (intersection) {
      intersections.push(intersection);
    }
  }

  if (intersections.length !== 2) {
    return [rect];
  }

  // Sort intersections
  intersections.sort((a, b) => a.x - b.x || a.y - b.y);

  // Create two new shapes based on the cut
  const [int1, int2] = intersections;
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const isMoreHorizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));

  if (isMoreHorizontal) {
    // Split horizontally
    const newHeight1 = int1.y - y;
    const newHeight2 = y + height - int1.y;

    return [
      {
        id: Date.now().toString(),
        type: 'rect',
        attributes: {
          ...rect.attributes,
          height: newHeight1.toString()
        }
      },
      {
        id: (Date.now() + 1).toString(),
        type: 'rect',
        attributes: {
          ...rect.attributes,
          y: int1.y.toString(),
          height: newHeight2.toString()
        }
      }
    ];
  } else {
    // Split vertically
    const newWidth1 = int1.x - x;
    const newWidth2 = x + width - int1.x;

    return [
      {
        id: Date.now().toString(),
        type: 'rect',
        attributes: {
          ...rect.attributes,
          width: newWidth1.toString()
        }
      },
      {
        id: (Date.now() + 1).toString(),
        type: 'rect',
        attributes: {
          ...rect.attributes,
          x: int1.x.toString(),
          width: newWidth2.toString()
        }
      }
    ];
  }
}

export function splitShape(element: Element, splitPoint: number, isVertical: boolean): Element[] {
  if (element.type === 'rect') {
    const x = parseFloat(element.attributes.x || '0');
    const y = parseFloat(element.attributes.y || '0');
    const width = parseFloat(element.attributes.width || '0');
    const height = parseFloat(element.attributes.height || '0');

    if (isVertical) {
      // Split vertically
      const splitX = x + (width * splitPoint);
      return [
        {
          id: Date.now().toString(),
          type: 'rect',
          attributes: {
            ...element.attributes,
            width: (splitX - x).toString()
          }
        },
        {
          id: (Date.now() + 1).toString(),
          type: 'rect',
          attributes: {
            ...element.attributes,
            x: splitX.toString(),
            width: (x + width - splitX).toString()
          }
        }
      ];
    } else {
      // Split horizontally
      const splitY = y + (height * splitPoint);
      return [
        {
          id: Date.now().toString(),
          type: 'rect',
          attributes: {
            ...element.attributes,
            height: (splitY - y).toString()
          }
        },
        {
          id: (Date.now() + 1).toString(),
          type: 'rect',
          attributes: {
            ...element.attributes,
            y: splitY.toString(),
            height: (y + height - splitY).toString()
          }
        }
      ];
    }
  }
  return [element];
}

export function cutShape(shape: Element, cutPath: { x: number; y: number }[]): Element[] {
  if (cutPath.length < 2) return [shape];

  // For straight line cutting, use the first and last points
  const startPoint = cutPath[0];
  const endPoint = cutPath[cutPath.length - 1];

  if (shape.type === 'rect') {
    return splitRectangleByLine(shape, startPoint, endPoint);
  }

  // Return original shape if cutting is not supported for this shape type
  return [shape];
}