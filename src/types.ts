export type Tool = 'select' | 'rect' | 'ellipse' | 'path' | 'text' | 'pen' | 'line' | 'curve' | 'cut';

export interface Point {
  x: number;
  y: number;
}

export interface SVGAttributes {
  id?: string;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  strokeDasharray?: string;
  d?: string;
  cx?: string;
  cy?: string;
  rx?: string;
  ry?: string;
  transform?: string;
  x1?: string;
  y1?: string;
  x2?: string;
  y2?: string;
  [key: string]: string | undefined;
}

export type Element = {
  id: string;
  type: 'rect' | 'ellipse' | 'path' | 'text' | 'line';
  attributes: SVGAttributes;
  points?: Point[];
  controlPoints?: Point[];
};

export type HistoryState = {
  elements: Element[];
};