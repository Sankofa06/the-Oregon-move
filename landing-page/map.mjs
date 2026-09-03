export const TILE_SIZE = 256;
export const MAP_MIN_ZOOM = 8;
export const MAP_MAX_ZOOM = 15;
export const DEFAULT_MAP_VIEW = Object.freeze({ latitude: 45.45, longitude: -122.84, zoom: 10 });
export const MAP_LIMITS = Object.freeze({ minLatitude: 44.9, maxLatitude: 46.05, minLongitude: -123.65, maxLongitude: -122.15 });
export const CANDIDATE_LIMITS = Object.freeze({ minLatitude: 44, maxLatitude: 47.5, minLongitude: -124.5, maxLongitude: -121.5 });

const MERCATOR_MAX_LATITUDE = 85.05112878;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function clampZoom(value) {
  return clamp(Math.round(Number(value) || DEFAULT_MAP_VIEW.zoom), MAP_MIN_ZOOM, MAP_MAX_ZOOM);
}

export function projectCoordinate(coordinate, zoom) {
  const safeZoom = clampZoom(zoom);
  const worldSize = TILE_SIZE * (2 ** safeZoom);
  const latitude = clamp(Number(coordinate.latitude), -MERCATOR_MAX_LATITUDE, MERCATOR_MAX_LATITUDE);
  const longitude = Number(coordinate.longitude);
  const sine = Math.sin((latitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - (Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI))) * worldSize,
  };
}

export function unprojectCoordinate(point, zoom) {
  const safeZoom = clampZoom(zoom);
  const worldSize = TILE_SIZE * (2 ** safeZoom);
  const longitude = ((point.x / worldSize) * 360) - 180;
  const mercatorY = Math.PI * (1 - (2 * point.y) / worldSize);
  const latitude = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;
  return { latitude, longitude };
}

export function clampMapCenter(coordinate) {
  return {
    latitude: clamp(Number(coordinate.latitude), MAP_LIMITS.minLatitude, MAP_LIMITS.maxLatitude),
    longitude: clamp(Number(coordinate.longitude), MAP_LIMITS.minLongitude, MAP_LIMITS.maxLongitude),
  };
}

export function candidateCoordinateIsValid(latitude, longitude) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= CANDIDATE_LIMITS.minLatitude
    && latitude <= CANDIDATE_LIMITS.maxLatitude
    && longitude >= CANDIDATE_LIMITS.minLongitude
    && longitude <= CANDIDATE_LIMITS.maxLongitude;
}

export function coordinateAtScreenPoint(center, zoom, width, height, x, y) {
  const centerPoint = projectCoordinate(center, zoom);
  return unprojectCoordinate({ x: centerPoint.x + x - (width / 2), y: centerPoint.y + y - (height / 2) }, zoom);
}

export function centerAfterPan(center, zoom, deltaX, deltaY) {
  const centerPoint = projectCoordinate(center, zoom);
  return clampMapCenter(unprojectCoordinate({ x: centerPoint.x - deltaX, y: centerPoint.y - deltaY }, zoom));
}

export function centerAfterZoom(center, oldZoom, newZoom, width, height, anchorX, anchorY) {
  const anchorCoordinate = coordinateAtScreenPoint(center, oldZoom, width, height, anchorX, anchorY);
  const anchorPoint = projectCoordinate(anchorCoordinate, newZoom);
  return clampMapCenter(unprojectCoordinate({
    x: anchorPoint.x - anchorX + (width / 2),
    y: anchorPoint.y - anchorY + (height / 2),
  }, newZoom));
}

export function screenPosition(coordinate, center, zoom, width, height) {
  const point = projectCoordinate(coordinate, zoom);
  const centerPoint = projectCoordinate(center, zoom);
  return { x: point.x - centerPoint.x + (width / 2), y: point.y - centerPoint.y + (height / 2) };
}

export function visibleTiles(center, zoom, width, height) {
  const safeZoom = clampZoom(zoom);
  const centerPoint = projectCoordinate(center, safeZoom);
  const origin = { x: centerPoint.x - (width / 2), y: centerPoint.y - (height / 2) };
  const tileCount = 2 ** safeZoom;
  const firstX = Math.floor(origin.x / TILE_SIZE) - 1;
  const lastX = Math.floor((origin.x + width) / TILE_SIZE) + 1;
  const firstY = Math.max(0, Math.floor(origin.y / TILE_SIZE) - 1);
  const lastY = Math.min(tileCount - 1, Math.floor((origin.y + height) / TILE_SIZE) + 1);
  const tiles = [];

  for (let tileY = firstY; tileY <= lastY; tileY += 1) {
    for (let drawnX = firstX; drawnX <= lastX; drawnX += 1) {
      const tileX = ((drawnX % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${safeZoom}/${drawnX}/${tileY}`,
        url: `https://tile.openstreetmap.org/${safeZoom}/${tileX}/${tileY}.png`,
        x: (drawnX * TILE_SIZE) - origin.x,
        y: (tileY * TILE_SIZE) - origin.y,
      });
    }
  }
  return tiles;
}
