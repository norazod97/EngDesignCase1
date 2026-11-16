// VIEW — "Cell camera" in "Now in the cell": a short muted clip of the current
// step, looping like a live feed. It plays while the cell runs and freezes when
// the cell stops (alarm, stop button, waiting for the operator).
// Which clip belongs to which step comes from src/data/cameras/camera-views.json
// (through the CellController hook useCameraView). No clip for a step = no panel.
import { useEffect, useRef, useState } from "react";
import { useCameraView } from "../../controllers/CellController.jsx";
import { CAMERA_TEXT as T } from "../../i18n/en.js";
import { Icon } from "../components/Icon.jsx";
import { IconButton } from "../components/primitives.jsx";

export function CameraFeed() {
  const cam = useCameraView(); // { video, poster, label, live } or null
  const ref = useRef(null);
  const [big, setBig] = useState(false);

  // Play while the cell runs; freeze (pause) when it stops.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (cam?.live) v.play().catch(() => { /* autoplay blocked: the poster stays visible */ });
    else v.pause();
  }, [cam?.live, cam?.video]);

  if (!cam) return null;
  return (
    <figure className={`camera ${big ? "is-big" : ""}`}>
      {/* muted + playsInline: required for autoplay, and the study clips have no sound anyway.
          Steps with only a still image (operator steps) show the image instead. */}
      {cam.video
        ? <video ref={ref} key={cam.video} src={cam.video} poster={cam.poster} muted loop playsInline preload="auto" aria-label={cam.label} />
        : <img className="camera-still" src={cam.poster} alt={cam.label} />}
      <figcaption className="camera-bar">
        <span className={`camera-live ${cam.live && cam.video ? "is-live" : ""}`}><span className="camera-dot" aria-hidden="true" />{cam.live && cam.video ? T.live : T.paused}</span>
        <span>{cam.label}</span>
        <span className="camera-sim">{T.simulated}</span>
        <IconButton icon={big ? "close" : "eye"} label={big ? T.smaller : T.bigger} className="icon-btn-plain camera-size" onClick={() => setBig((b) => !b)} />
      </figcaption>
      {!cam.live && cam.video && <div className="camera-paused" aria-hidden="true"><Icon name="stop" size={28} /></div>}
    </figure>
  );
}
