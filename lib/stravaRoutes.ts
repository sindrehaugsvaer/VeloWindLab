export type LatLngTuple = [number, number];

export function formatRouteDistanceKm(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

// Decode Google polyline encoding to lat/lng array
export function decodePolyline(encoded: string): LatLngTuple[] {
  const points: LatLngTuple[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Convert decoded polyline to SVG path
export function polylineToSvgPath(
  encoded: string,
  width: number,
  height: number,
): string {
  const points = decodePolyline(encoded);
  if (points.length < 2) return "";

  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const padding = 2;
  const scaleX = (width - padding * 2) / (maxLng - minLng || 1);
  const scaleY = (height - padding * 2) / (maxLat - minLat || 1);
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (width - (maxLng - minLng) * scale) / 2;
  const offsetY = (height - (maxLat - minLat) * scale) / 2;

  const svgPoints = points.map(([latValue, lngValue]) => {
    const x = (lngValue - minLng) * scale + offsetX;
    const y = height - ((latValue - minLat) * scale + offsetY);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M${svgPoints.join("L")}`;
}
