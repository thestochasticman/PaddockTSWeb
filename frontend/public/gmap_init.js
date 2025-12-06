// let map;
// let drawingManager;
// let currentRectangle = null;

// const rectangleStyle = {
//     strokeColor: "#00FFFF",
//     strokeOpacity: 0.9,
//     strokeWeight: 2,
//     fillColor: "#00FFFF",
//     fillOpacity: 0.15,
// };

// function initMap() {
//     const mapDiv = document.getElementById("map");
//     if (!mapDiv) return;

//     map = new google.maps.Map(mapDiv, {
//         zoom: 3,
//         center: { lat: -33.5, lng: 148.5 },
//         mapTypeId: "terrain",
//     });

//     drawingManager = new google.maps.drawing.DrawingManager({
//         drawingMode: null,
//         drawingControl: false,
//         rectangleOptions: rectangleStyle,
//     });

//     drawingManager.setMap(map);

//     google.maps.event.addListener(
//         drawingManager,
//         "overlaycomplete",
//         function (e) {
//         if (e.type === google.maps.drawing.OverlayType.RECTANGLE) {
//             if (currentRectangle) {
//                 currentRectangle.setMap(null);
//             }
//             currentRectangle = e.overlay;

//             drawingManager.setDrawingMode(null);

//             const bounds = currentRectangle.getBounds();
//             const north = bounds.getNorthEast().lat();
//             const east = bounds.getNorthEast().lng();
//             const south = bounds.getSouthWest().lat();
//             const west = bounds.getSouthWest().lng();

//             window.dispatchEvent(
//             new CustomEvent("bbox-selected", {
//                 detail: { north, south, east, west },
//             }),
//             );
//         }
//         },
//     );
// }

// window.initMap = initMap;

// window.enableRectangleSelection = function () {
//     if (drawingManager) {
//         drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
//     }
// };

// window.setBoundingBoxFromReact = function (north, south, east, west) {
//     if (!map) return;

//     if (currentRectangle) {
//         currentRectangle.setMap(null);
//     }

//     const bounds = new google.maps.LatLngBounds(
//         new google.maps.LatLng(south, west),
//         new google.maps.LatLng(north, east),
//     );

//     currentRectangle = new google.maps.Rectangle({
//         ...rectangleStyle,
//         map,
//         bounds,
//     });

//     map.fitBounds(bounds);
// };


let map;
let drawingManager;
let currentRectangle = null;

const rectangleStyle = {
    strokeColor: "#00FFFF",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: "#00FFFF",
    fillOpacity: 0.15
};

/**
 * Expand the given bounds by a marginFactor (e.g. 0.2 = 20%) and fit the map to that.
 */
function fitBoundsWithMargin(map, bounds, marginFactor = 0.5) {
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

    map.fitBounds(extendedBounds);
}

function initMap() {
    const mapDiv = document.getElementById("map");
    if (!mapDiv) return;

    map = new google.maps.Map(mapDiv, {
        zoom: 3,
        center: { lat: -33.5, lng: 148.5 },
        mapTypeId: "terrain"
    });

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        rectangleOptions: rectangleStyle
    });

    drawingManager.setMap(map);

    google.maps.event.addListener(
        drawingManager,
        "overlaycomplete",
        function (e) {
            if (e.type === google.maps.drawing.OverlayType.RECTANGLE) {
                if (currentRectangle) {
                    currentRectangle.setMap(null);
                }
                currentRectangle = e.overlay;

                drawingManager.setDrawingMode(null);

                const bounds = currentRectangle.getBounds();
                const north = bounds.getNorthEast().lat();
                const east = bounds.getNorthEast().lng();
                const south = bounds.getSouthWest().lat();
                const west = bounds.getSouthWest().lng();

                // Optional: also pad the view when user draws a new rectangle
                fitBoundsWithMargin(map, bounds);

                window.dispatchEvent(
                    new CustomEvent("bbox-selected", {
                        detail: { north, south, east, west }
                    })
                );
            }
        }
    );
}

window.initMap = initMap;

window.enableRectangleSelection = function () {
    if (drawingManager) {
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
    }
};

/**
 * Called from React with a bbox; draws rectangle and fits with margin.
 */
window.setBoundingBoxFromReact = function (north, south, east, west) {
    if (!map) return;

    if (currentRectangle) {
        currentRectangle.setMap(null);
    }

    const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(south, west),
        new google.maps.LatLng(north, east)
    );

    currentRectangle = new google.maps.Rectangle({
        ...rectangleStyle,
        map,
        bounds
    });

    // Instead of map.fitBounds(bounds);
    fitBoundsWithMargin(map, bounds);
};
