// SERVICE — which camera clip belongs to which process step
// (src/data/cameras/camera-views.json). Files are in public/videos/.
import VIEWS from "../data/cameras/camera-views.json";

/** Clip for a process step, with full paths, or null if there is none. */
export function cameraFor(process, stepId) {
  const view = VIEWS[process]?.[stepId];
  if (!view) return null;
  const base = import.meta.env.BASE_URL; // works on GitHub Pages sub-folders too
  // video can be missing: then only the still (poster) is shown.
  return { ...view, video: view.video ? `${base}${view.video}` : undefined, poster: view.poster ? `${base}${view.poster}` : undefined };
}
