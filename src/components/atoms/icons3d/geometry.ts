import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

// lucide icons share a 24x24 viewBox -- centering on 12,12 and flipping Y
// (SVG is y-down, three.js is y-up) is all that's needed to line every icon
// up on the same scale/origin, no per-icon fitting.
const VIEW_CENTER = 12;
// Shrinks the 24-unit viewBox down to roughly a -1..1 three.js unit cube.
const SCALE = 1 / 12;

function toShapes(d: string): THREE.Shape[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
  const { paths } = new SVGLoader().parse(svg);
  return paths.flatMap((path) => SVGLoader.createShapes(path));
}

// All of these are in the *raw* 0-24 lucide viewBox space (like the path
// data itself) -- `normalize()` applies the shared SCALE down to three.js
// units afterwards, so a depth of 6 here (1/4 of the icon's ~24-wide extent)
// ends up a proportionate ~0.5 three.js units once scaled.
const SOLID_DEPTH = 6;
const TUBE_RADIUS = 1.3;

/** Extrudes a closed lucide path into a solid 3D shape with a slight bevel. */
export function solidGeometry(d: string, depth = SOLID_DEPTH): THREE.BufferGeometry[] {
  return toShapes(d).map((shape) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.8,
      bevelSize: 0.6,
      bevelSegments: 2,
      curveSegments: 12,
    });
    normalize(geometry, depth);
    return geometry;
  });
}

/** Renders an open lucide stroke path as a round 3D tube (matches its round line caps). */
export function tubeGeometry(d: string, radius = TUBE_RADIUS): THREE.BufferGeometry[] {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
  const { paths } = new SVGLoader().parse(svg);

  return paths.flatMap((path) =>
    path.subPaths.map((subPath) => {
      const points2D = subPath.getPoints(24);
      const points3D = points2D.map(
        (p) => new THREE.Vector3((p.x - VIEW_CENTER) * SCALE, -(p.y - VIEW_CENTER) * SCALE, 0)
      );
      const curve = new THREE.CatmullRomCurve3(points3D);
      return new THREE.TubeGeometry(curve, 24, radius * SCALE, 8, false);
    })
  );
}

/** Centers an extruded shape's depth around z=0 and applies the shared viewBox scale/flip. */
function normalize(geometry: THREE.BufferGeometry, depth: number) {
  geometry.translate(-VIEW_CENTER, -VIEW_CENTER, -depth / 2);
  geometry.scale(SCALE, -SCALE, SCALE);
}

// Camera in Scene3D/LoaderScene3D uses fov 32 at distance 3.4, which only
// shows roughly +/-0.975 of vertical extent at the object's depth -- lucide
// icons never hit that edge because their artwork has built-in padding
// within the 24x24 viewBox, but a logo mark like the loader typically fills
// its viewBox edge-to-edge, so mapping it to a literal +/-1 clips top and
// bottom against the camera frustum. This margin backs it off to ~0.8 so it
// sits comfortably inside frame like the icons do.
const FRAME_MARGIN = 1.22;

// Same extrusion pipeline as solidGeometry()/normalize() above, generalized
// to an arbitrary source viewBox instead of the fixed 24x24 lucide grid --
// for one-off marks (e.g. the loading spinner) that aren't lucide icons.
// Depth/bevel are kept proportional to the viewBox's longer side so the
// result reads the same as the lucide-derived icons despite the different
// source scale.
export function solidGeometryFromViewBox(
  d: string,
  viewBox: { width: number; height: number },
  depthRatio: number = SOLID_DEPTH / (VIEW_CENTER * 2)
): THREE.BufferGeometry[] {
  const size = Math.max(viewBox.width, viewBox.height);
  const depth = depthRatio * size;
  const scale = 1 / ((size * FRAME_MARGIN) / 2);
  return toShapes(d).map((shape) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.133,
      bevelSize: depth * 0.1,
      bevelSegments: 2,
      curveSegments: 12,
    });
    geometry.translate(-viewBox.width / 2, -viewBox.height / 2, -depth / 2);
    geometry.scale(scale, -scale, scale);
    return geometry;
  });
}
