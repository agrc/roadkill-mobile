import { useLoaderData } from '@remix-run/react';
import { useEffect } from 'react';
import styles from '~/styles/notification-map.css';

export function meta() {
  return { title: 'Notification Map' };
}

export function links() {
  return [
    {
      rel: 'stylesheet',
      href: 'https://js.arcgis.com/4.22/esri/themes/light/main.css',
    },
    {
      rel: 'stylesheet',
      href: styles,
    },
  ];
}

export async function loader() {
  return {
    quadWord: process.env.QUAD_WORD,
  };
}

export default function NotificationMap() {
  const data = useLoaderData();
  useEffect(() => {
    require([
      'esri/Graphic',
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/WebTileLayer',
      'esri/layers/support/LOD',
    ], function (Graphic, Map, MapView, WebTileLayer, LOD) {
      const locationParam = new URLSearchParams(window.location.search).get('location');
      let [x, y] = [-112, 40];
      if (locationParam) {
        [x, y] = locationParam.split(' ');
      }

      const tileSize = 256;
      const earthCircumference = 40075016.685568;
      const inchesPerMeter = 39.37;
      const initialResolution = earthCircumference / tileSize;

      const dpi = 96;
      const maxLevel = 18;
      const squared = 2;
      const lods = [];
      for (let level = 0; level <= maxLevel; level++) {
        const resolution = initialResolution / Math.pow(squared, level);
        const scale = resolution * dpi * inchesPerMeter;
        lods.push(
          new LOD({
            level: level,
            scale: scale,
            resolution: resolution,
          })
        );
      }

      const tileInfo = {
        dpi: dpi,
        size: tileSize,
        origin: {
          x: -20037508.342787,
          y: 20037508.342787,
        },
        spatialReference: {
          wkid: 3857,
        },
        lods: lods,
      };
      const map = new Map();

      const layer = new WebTileLayer({
        urlTemplate: `https://discover.agrc.utah.gov/login/path/${data.quadWord}/tiles/lite_basemap/{level}/{col}/{row}`,
        tileInfo,
      });

      map.add(layer);

      const view = new MapView({
        container: 'viewDiv',
        map: map,
        center: [x, y],
        zoom: 15,
      });

      if (locationParam) {
        const graphic = new Graphic({
          geometry: {
            type: 'point',
            x,
            y,
          },
          symbol: { type: 'picture-marker', url: '/Google_Maps_pin.png', width: 21, height: 37, yoffset: 37 / 2 },
        });

        view.graphics.add(graphic);
      }
    });
  }, [data.quadWord]);

  return (
    <>
      <div id="viewDiv" className="p-0 m-0 h-full w-full"></div>
      <script src="https://js.arcgis.com/4.22/"></script>
    </>
  );
}
