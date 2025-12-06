// "use client";

// import { useEffect } from "react";
// import Script from "next/script";

// import { apiKey } from "./API";
// import { MapQueryPanel } from "./MapQueryPanel";

// export default function MapPanel() {
//     useEffect(() => {
//         if (typeof window === "undefined") return;
//         const w = window as any;

//         if (w.google && w.google.maps && typeof w.initMap === "function") {
//         w.initMap();
//         }
//     }, []);

//     if (!apiKey) {
//         return (
//             <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
//                 Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
//             </div>
//         );
//     }

//     return (
//         <>
        
//             <Script src="/gmap_init.js" strategy="afterInteractive" />

//             {/* Load Maps JS API – will call window.initMap when ready */}
//             <Script
//                 src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing&callback=initMap`}
//                 strategy="afterInteractive"
//             />

//             {/* Layout */}
//             <div className="flex w-full h-full">
//                 <div className="w-[360px] h-full">
//                     <MapQueryPanel />
//                 </div>

//                 <div className="flex-1 h-full relative">
//                     <div id="map" className="w-full h-full" />
//                     </div>
            
//             </div>
//         </>
//     );
// }

"use client";

import { useEffect } from "react";
import Script from "next/script";

import { apiKey } from "./API";
import { MapQueryPanel } from "./MapQueryPanel";

export default function MapPanel() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        const w = window as any;

        if (w.google && w.google.maps && typeof w.initMap === "function") {
            w.initMap();
        }
    }, []);

    if (!apiKey) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
                Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
            </div>
        );
    }

    return (
        <>
            {/* 1. Our custom Google Maps init script */}
            <Script src="/gmap_init.js" strategy="afterInteractive" />

            {/* 2. Load Google Maps JS API – will call window.initMap when ready */}
            <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing&callback=initMap`}
                strategy="afterInteractive"
            />

            {/* 3. Layout: left = query panel, right = map */}
            <div className="flex w-full h-full">
                {/* Left column – fixed width, full height */}
                <div className="w-[360px] h-full">
                    <MapQueryPanel />
                </div>

                {/* Right column – map fills remaining space */}
                <div className="flex-1 h-full relative">
                    <div id="map" className="w-full h-full" />
                </div>
            </div>
        </>
    );
}
