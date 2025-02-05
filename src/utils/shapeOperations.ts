import type { Element, Point } from '../types';

function lineIntersection(
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  x4: number, y4: number
): Point | null {
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

function getShapeBoundingBox(element: Element): { x: number; y: number; width: number; height: number } {
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
}

function getRotationTransform(element: Element): { angle: number; cx: number; cy: number } {
  const transform = element.attributes.transform || '';
  const match = transform.match(/rotate\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)/);
  if (match) {
    return {
      angle: parseFloat(match[1]),
      cx: parseFloat(match[2]),
      cy: parseFloat(match[3])
    };
  }
  const box = getShapeBoundingBox(element);
  return {
    angle: 0,
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2
  };
}

export function cutShape(element: Element, cutPath: Point[]): Element[] {
  if (cutPath.length < 2) return [element];

  const startPoint = cutPath[0];
  const endPoint = cutPath[cutPath.length - 1];

  if (element.type === 'ellipse') {
    const cx = parseFloat(element.attributes.cx || '0');
    const cy = parseFloat(element.attributes.cy || '0');
    const rx = parseFloat(element.attributes.rx || '0');
    const ry = parseFloat(element.attributes.ry || '0');

    // Calculate angles for the cut line endpoints relative to the circle center
    const angle1 = Math.atan2(startPoint.y - cy, startPoint.x - cx);
    const angle2 = Math.atan2(endPoint.y - cy, endPoint.x - cx);

    // Calculate the sweep flag based on the direction of the cut
    const sweepFlag = (angle2 - angle1 + 2 * Math.PI) % (2 * Math.PI) > Math.PI ? 0 : 1;

    // Create two paths that split the circle
    const path1 = `
      M ${cx + rx * Math.cos(angle1)} ${cy + ry * Math.sin(angle1)}
      A ${rx} ${ry} 0 ${sweepFlag} 1 ${cx + rx * Math.cos(angle2)} ${cy + ry * Math.sin(angle2)}
      L ${cx} ${cy}
      Z
    `;

    const path2 = `
      M ${cx + rx * Math.cos(angle1)} ${cy + ry * Math.sin(angle1)}
      A ${rx} ${ry} 0 ${1 - sweepFlag} 1 ${cx + rx * Math.cos(angle2)} ${cy + ry * Math.sin(angle2)}
      L ${cx} ${cy}
      Z
    `;

    return [
      {
        id: Date.now().toString(),
        type: 'path',
        attributes: {
          ...element.attributes,
          d: path1.trim(),
          fill: element.attributes.fill || 'none'
        }
      },
      {
        id: (Date.now() + 1).toString(),
        type: 'path',
        attributes: {
          ...element.attributes,
          d: path2.trim(),
          fill: element.attributes.fill || 'none'
        }
      }
    ];
  }

  // Get the shape's bounding box and rotation
  const box = getShapeBoundingBox(element);
  const rotation = getRotationTransform(element);

  // Create points for the shape's edges
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height }
  ];

  // Rotate points if needed
  if (rotation.angle !== 0) {
    corners.forEach(point => {
      const dx = point.x - rotation.cx;
      const dy = point.y - rotation.cy;
      const angle = rotation.angle * Math.PI / 180;
      point.x = rotation.cx + dx * Math.cos(angle) - dy * Math.sin(angle);
      point.y = rotation.cy + dx * Math.sin(angle) + dy * Math.cos(angle);
    });
  }

  // Find intersections
  const intersections: Point[] = [];
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

  if (intersections.length !== 2) return [element];

  // Create two new shapes based on the cut
  const [int1, int2] = intersections;
  const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
  const isMoreHorizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));

  if (element.type === 'rect') {
    if (isMoreHorizontal) {
      // Split horizontally
      const newHeight1 = int1.y - box.y;
      const newHeight2 = box.y + box.height - int1.y;

      return [
        {
          ...element,
          id: Date.now().toString(),
          attributes: {
            ...element.attributes,
            height: newHeight1.toString()
          }
        },
        {
          ...element,
          id: (Date.now() + 1).toString(),
          attributes: {
            ...element.attributes,
            y: int1.y.toString(),
            height: newHeight2.toString()
          }
        }
      ];
    } else {
      // Split vertically
      const newWidth1 = int1.x - box.x;
      const newWidth2 = box.x + box.width - int1.x;

      return [
        {
          ...element,
          id: Date.now().toString(),
          attributes: {
            ...element.attributes,
            width: newWidth1.toString()
          }
        },
        {
          ...element,
          id: (Date.now() + 1).toString(),
          attributes: {
            ...element.attributes,
            x: int1.x.toString(),
            width: newWidth2.toString()
          }
        }
      ];
    }
  }

  return [element];
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