// public/PaddockTS/gmap_init.js
// ES5-only (production-safe)

(function () {
  "use strict";

  var STATE_KEY = "__PADDOCKTS_GMAP_STATE__";
  var LS_KEY = "PaddockTS:last_bbox";

  var rectangleStyle = {
    strokeColor: "#00FFFF",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#00FFFF",
    fillOpacity: 0.15,
    clickable: false,
    editable: true,
    draggable: true,
  };

  var DEFAULT_BBOX = {
    north: -33.0,
    south: -34.0,
    east: 149.0,
    west: 148.0,
  };

  function getState() {
    var w = window;
    if (!w[STATE_KEY]) {
      w[STATE_KEY] = {
        map: null,
        drawingManager: null,
        rectangle: null,
        resizeObserver: null,

        // single source of truth for bbox across route changes
        bbox: null,
        pendingBBox: null,

        // gmaps listener handles (so initMap() is idempotent)
        listeners: [],
        rectListeners: [],

        // suppress echo when bbox is set programmatically
        suppressEmitN: 0,
      };
    }
    return w[STATE_KEY];
  }

  function safeParseJSON(s) {
    try {
      return JSON.parse(s);
    } catch (e) {
      return null;
    }
  }

  function normalizeBbox(b) {
    if (!b) return null;

    var n = Number(b.north);
    var s = Number(b.south);
    var e = Number(b.east);
    var w = Number(b.west);

    if (!isFinite(n) || !isFinite(s) || !isFinite(e) || !isFinite(w)) return null;

    return {
      north: Math.max(n, s),
      south: Math.min(n, s),
      east: Math.max(e, w),
      west: Math.min(e, w),
    };
  }

  function loadInitialBbox() {
    var st = getState();
    if (st.bbox) return st.bbox;
    if (st.pendingBBox) return st.pendingBBox;

    try {
      var raw = localStorage.getItem(LS_KEY);
      var parsed = safeParseJSON(raw);
      var nb = normalizeBbox(parsed);
      if (nb) return nb;
    } catch (e) {}

    return DEFAULT_BBOX;
  }

  function persistBbox(bbox) {
    var st = getState();
    st.bbox = bbox;
    st.pendingBBox = bbox;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(bbox));
    } catch (e) {}
  }

  function clearGmapsListeners(handles) {
    if (!handles || !handles.length) return;
    for (var i = 0; i < handles.length; i++) {
      try {
        google.maps.event.removeListener(handles[i]);
      } catch (e) {}
    }
    handles.length = 0;
  }

  function makeBounds(b) {
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(b.south, b.west),
      new google.maps.LatLng(b.north, b.east)
    );
  }

  function boundsToBbox(bounds) {
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();
    return normalizeBbox({
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    });
  }

  function fitBoundsWithMargin(map, bounds, marginFactor) {
    if (!map) return;

    var mf = typeof marginFactor === "number" ? marginFactor : 0.25;

    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();

    var latDiff = ne.lat() - sw.lat();
    var lngDiff = ne.lng() - sw.lng();

    var latMargin = latDiff * mf;
    var lngMargin = lngDiff * mf;

    var extendedBounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(sw.lat() - latMargin, sw.lng() - lngMargin),
      new google.maps.LatLng(ne.lat() + latMargin, ne.lng() + lngMargin)
    );

    requestAnimationFrame(function () {
      map.fitBounds(extendedBounds);
    });

    setTimeout(function () {
      try {
        google.maps.event.trigger(map, "resize");
      } catch (e) {}
      map.fitBounds(extendedBounds);
    }, 0);
  }

  function emitBboxSelected(bbox) {
    // Keep your existing event name + payload shape
    window.dispatchEvent(new CustomEvent("bbox-selected", { detail: bbox }));
  }

  function ensureRectangle(map) {
    var st = getState();

    if (!st.rectangle) {
      st.rectangle = new google.maps.Rectangle({
        map: map,
        strokeColor: rectangleStyle.strokeColor,
        strokeOpacity: rectangleStyle.strokeOpacity,
        strokeWeight: rectangleStyle.strokeWeight,
        fillColor: rectangleStyle.fillColor,
        fillOpacity: rectangleStyle.fillOpacity,
        clickable: rectangleStyle.clickable,
        editable: true,
        draggable: true,
      });
    } else {
      st.rectangle.setOptions(rectangleStyle);
      st.rectangle.setMap(map);
      st.rectangle.setEditable(true);
      st.rectangle.setDraggable(true);
    }

    return st.rectangle;
  }

  function bindRectangleSync() {
    var st = getState();
    if (!st.rectangle) return;

    clearGmapsListeners(st.rectListeners);

    var rafPending = false;

    function syncFromRect() {
      if (rafPending) return;
      rafPending = true;

      requestAnimationFrame(function () {
        rafPending = false;

        var rect = st.rectangle;
        if (!rect) return;

        var bounds = rect.getBounds && rect.getBounds();
        if (!bounds) return;

        var bbox = boundsToBbox(bounds);
        if (!bbox) return;

        persistBbox(bbox);

        if (st.suppressEmitN > 0) {
          st.suppressEmitN -= 1;
          return;
        }

        emitBboxSelected(bbox);
      });
    }

    st.rectListeners.push(google.maps.event.addListener(st.rectangle, "bounds_changed", syncFromRect));
    st.rectListeners.push(google.maps.event.addListener(st.rectangle, "dragend", syncFromRect));
  }

  function applyBBox(bbox, opts) {
    var st = getState();
    opts = opts || {};

    var b = normalizeBbox(bbox);
    if (!b || !st.map) return;

    var rect = ensureRectangle(st.map);
    var bounds = makeBounds(b);

    // If this is a programmatic update, suppress the next few bounds_changed emissions
    if (opts.silent) st.suppressEmitN = 6;

    rect.setBounds(bounds);
    persistBbox(b);

    bindRectangleSync();

    if (opts.fit !== false) {
      fitBoundsWithMargin(st.map, bounds, opts.marginFactor);
    }
  }

  function teardownMap() {
    var st = getState();

    if (st.resizeObserver) {
      try {
        st.resizeObserver.disconnect();
      } catch (e) {}
      st.resizeObserver = null;
    }

    clearGmapsListeners(st.listeners);
    clearGmapsListeners(st.rectListeners);

    if (st.rectangle) {
      try {
        st.rectangle.setMap(null);
      } catch (e) {}
      st.rectangle = null;
    }

    if (st.drawingManager) {
      try {
        st.drawingManager.setMap(null);
      } catch (e) {}
      st.drawingManager = null;
    }

    st.map = null;
    // Keep st.bbox / st.pendingBBox (durable state)
  }

  function initMap() {
    var st = getState();

    var mapDiv = document.getElementById("map");
    if (!mapDiv) {
      requestAnimationFrame(initMap);
      return;
    }

    // If we have a map but it’s attached to an old/removed div, recreate.
    if (st.map && typeof st.map.getDiv === "function" && st.map.getDiv() !== mapDiv) {
      teardownMap();
    }

    // If map already exists for this div, just re-apply bbox and return.
    if (st.map) {
      applyBBox(st.pendingBBox || st.bbox, { fit: true, silent: true });
      return;
    }

    st.map = new google.maps.Map(mapDiv, {
      zoom: 3,
      center: { lat: -33.5, lng: 148.5 },
      mapTypeId: "terrain",
    });

    st.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      rectangleOptions: rectangleStyle,
    });
    st.drawingManager.setMap(st.map);

    clearGmapsListeners(st.listeners);

    st.listeners.push(
      google.maps.event.addListener(st.drawingManager, "overlaycomplete", function (e) {
        if (e.type !== google.maps.drawing.OverlayType.RECTANGLE) return;

        if (st.rectangle) {
          try {
            st.rectangle.setMap(null);
          } catch (err) {}
          st.rectangle = null;
        }

        st.rectangle = e.overlay;
        st.rectangle.setOptions(rectangleStyle);
        st.rectangle.setEditable(true);
        st.rectangle.setDraggable(true);

        try {
          st.drawingManager.setDrawingMode(null);
        } catch (err2) {}

        bindRectangleSync();

        var bounds = st.rectangle.getBounds && st.rectangle.getBounds();
        if (!bounds) return;

        var bbox = boundsToBbox(bounds);
        if (!bbox) return;

        persistBbox(bbox);
        fitBoundsWithMargin(st.map, bounds, 0.25);

        // user action -> emit
        emitBboxSelected(bbox);
      })
    );

    // Resize handling (silent to avoid echo)
    st.resizeObserver = new ResizeObserver(function () {
      if (!st.map) return;
      try {
        google.maps.event.trigger(st.map, "resize");
      } catch (e) {}
      applyBBox(st.pendingBBox || st.bbox, { fit: true, silent: true });
    });
    st.resizeObserver.observe(mapDiv);

    // Initial bbox
    applyBBox(loadInitialBbox(), { fit: true, silent: true });
  }

  // ---- Public API (same names you already use) ----
  window.initMap = initMap;

  window.enableRectangleSelection = function () {
    var st = getState();
    if (st.drawingManager) {
      st.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
    }
  };

  window.setBoundingBoxFromReact = function (north, south, east, west) {
    var st = getState();
    var bbox = normalizeBbox({ north: north, south: south, east: east, west: west });
    if (!bbox) return;

    persistBbox(bbox);

    if (!st.map) return; // queued
    applyBBox(bbox, { fit: true, silent: true });
  };

  window.forceMapResize = function () {
    var st = getState();
    if (!st.map) return;
    try {
      google.maps.event.trigger(st.map, "resize");
    } catch (e) {}
    applyBBox(st.pendingBBox || st.bbox, { fit: true, silent: true });
  };

  // Helpful debug hook
  window.getBoundingBox = function () {
    var st = getState();
    return st.bbox || st.pendingBBox || null;
  };
})();
