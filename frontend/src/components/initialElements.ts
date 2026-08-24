import { Position } from "@xyflow/react";

function getCenter(node: any) {
  const { positionAbsolute } = node.internals;
  const { width, height } = node.measured;

  return {
    x: positionAbsolute.x + width / 2,
    y: positionAbsolute.y + height / 2,
    r: Math.max(width, height) / 2, // circle radius
  };
}

function getCircleIntersection(source: any, target: any) {
  const s = getCenter(source);
  const t = getCenter(target);

  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  const ux = dx / dist;
  const uy = dy / dist;

  return {
    x: s.x + ux * s.r,
    y: s.y + uy * s.r,
  };
}

function getPositionFromVector(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Position.Right : Position.Left;
  }
  return dy > 0 ? Position.Bottom : Position.Top;
}

export function getEdgeParams(source: any, target: any) {
  if (!source?.measured || !target?.measured) return null;

  const sCenter = getCenter(source);
  const tCenter = getCenter(target);

  const sourcePoint = getCircleIntersection(source, target);
  const targetPoint = getCircleIntersection(target, source);

  const sourcePos = getPositionFromVector(
    tCenter.x - sCenter.x,
    tCenter.y - sCenter.y
  );

  const targetPos = getPositionFromVector(
    sCenter.x - tCenter.x,
    sCenter.y - tCenter.y
  );

  return {
    sx: sourcePoint.x,
    sy: sourcePoint.y,
    tx: targetPoint.x,
    ty: targetPoint.y,
    sourcePos,
    targetPos,
  };
}
