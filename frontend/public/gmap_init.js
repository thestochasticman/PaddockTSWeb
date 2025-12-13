
// public/gmap_init.js

let map;
let drawingManager;
let currentRectangle = null;
let pendingBBox = null;
let resizeObserver = null;

const rectangleStyle = {
  strokeColor: "#00FFFF",
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: "#00FFFF",
  fillOpacity: 0.15,
  clickable: false,
};

function makeBounds(north, south, east, west) {
  return new google.maps.LatLngBounds(
    new google.maps.LatLng(south, west),
    new google.maps.LatLng(north, east)
  );
}

function fitBoundsWithMargin(bounds, marginFactor = 0.25) {
  if (!map) return;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latDiff = ne.lat() - sw.lat();
  const lngDiff = ne.lng() - sw.lng();

  const latMargin = latDiff * marginFactor;
  const lngMargin = lngDiff * marginFactor;

  const extendedBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(sw.lat() - latMargin, sw.lng() - lngMargin),
    new google.maps.LatLng(ne.lat() + latMargin, ne.lng() + lngMargin)
  );

  requestAnimationFrame(() => map.fitBounds(extendedBounds));
  setTimeout(() => {
    google.maps.event.trigger(map, "resize");
    map.fitBounds(extendedBounds);
  }, 0);
}

function applyBBox(b) {
  if (!b || !map) return;

  if (!currentRectangle) {
    currentRectangle = new google.maps.Rectangle({ map, ...rectangleStyle });
  } else {
    currentRectangle.setOptions(rectangleStyle);
    currentRectangle.setMap(map);
  }

  const bounds = makeBounds(b.north, b.south, b.east, b.west);
  currentRectangle.setBounds(bounds);
  fitBoundsWithMargin(bounds);
}

function teardownMap() {
  if (resizeObserver) {
    try { resizeObserver.disconnect(); } catch {}
    resizeObserver = null;
  }
  if (currentRectangle) {
    try { currentRectangle.setMap(null); } catch {}
    currentRectangle = null;
  }
  if (drawingManager) {
    try { drawingManager.setMap(null); } catch {}
    drawingManager = null;
  }
  map = null;
}

function initMap() {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    requestAnimationFrame(initMap);
    return;
  }

  // If we have a map but it’s attached to an old/removed div, recreate.
  if (map && typeof map.getDiv === "function" && map.getDiv() !== mapDiv) {
    teardownMap();
  }

  // If map already exists for this div, just re-apply bbox and return.
  if (map) {
    applyBBox(pendingBBox);
    return;
  }

  map = new google.maps.Map(mapDiv, {
    zoom: 3,
    center: { lat: -33.5, lng: 148.5 },
    mapTypeId: "terrain",
  });

  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: false,
    rectangleOptions: rectangleStyle,
  });
  drawingManager.setMap(map);

  google.maps.event.addListener(drawingManager, "overlaycomplete", function (e) {
    if (e.type !== google.maps.drawing.OverlayType.RECTANGLE) return;

    if (currentRectangle) currentRectangle.setMap(null);
    currentRectangle = e.overlay;
    currentRectangle.setOptions(rectangleStyle);

    drawingManager.setDrawingMode(null);

    const bounds = currentRectangle.getBounds();
    const north = bounds.getNorthEast().lat();
    const east = bounds.getNorthEast().lng();
    const south = bounds.getSouthWest().lat();
    const west = bounds.getSouthWest().lng();

    pendingBBox = { north, south, east, west };
    fitBoundsWithMargin(bounds);

    window.dispatchEvent(
      new CustomEvent("bbox-selected", { detail: pendingBBox })
    );
  });

  // When the map div becomes visible / changes size, force a redraw + re-fit.
  resizeObserver = new ResizeObserver(() => {
    if (!map) return;
    google.maps.event.trigger(map, "resize");
    applyBBox(pendingBBox);
  });
  resizeObserver.observe(mapDiv);

  applyBBox(pendingBBox);
}

window.initMap = initMap;

window.enableRectangleSelection = function () {
  if (drawingManager) {
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
  }
};

window.setBoundingBoxFromReact = function (north, south, east, west) {
  pendingBBox = { north, south, east, west };
  if (!map) return; // queued; initMap() will apply
  applyBBox(pendingBBox);
};

// Call this when toggling from results -> search if you hide/show the map.
window.forceMapResize = function () {
  if (!map) return;
  google.maps.event.trigger(map, "resize");
  applyBBox(pendingBBox);
};
