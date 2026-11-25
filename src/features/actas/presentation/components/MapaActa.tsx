// ADR-04: mapa gratuito con WebView + Leaflet + OpenStreetMap (con atribución).
// La app envía los datos por mensajes y el HTML dibuja recinto, acta y distancia.
import { useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';
import { formatearDistancia } from '@/shared/presentation/hooks/useFormatos';

type Punto = { latitud: number; longitud: number };
type Props = { recinto: Punto & { nombre: string }; acta: Punto; margenMetros: number; distanciaM: number | null; fueraDeMargen: boolean };

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#mapa{height:100%;margin:0;background:#EEF2F6}</style>
</head><body><div id="mapa"></div><script>
var mapa = L.map('mapa', { zoomControl: true, attributionControl: true });
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);
var capa = L.layerGroup().addTo(mapa);
function dibujar(d) {
  capa.clearLayers();
  var r = [d.recinto.latitud, d.recinto.longitud], a = [d.acta.latitud, d.acta.longitud];
  L.circle(r, { radius: d.margen, color: '#1769AA', weight: 2, fillOpacity: 0.08 }).addTo(capa);
  L.circleMarker(r, { radius: 9, color: '#fff', weight: 3, fillColor: '#1769AA', fillOpacity: 1 }).addTo(capa).bindTooltip(d.recinto.nombre, { permanent: false });
  var colorActa = d.fuera ? '#C62F3B' : '#168A4A';
  L.circleMarker(a, { radius: 9, color: '#fff', weight: 3, fillColor: colorActa, fillOpacity: 1 }).addTo(capa).bindTooltip('Acta registrada aquí', { permanent: true, direction: 'top' });
  L.polyline([r, a], { color: colorActa, dashArray: '6 6', weight: 3 }).addTo(capa).bindTooltip(d.distancia, { permanent: true, direction: 'center' });
  mapa.fitBounds(L.latLngBounds([r, a]).pad(0.4), { maxZoom: 18 });
}
function recibir(e) { try { dibujar(JSON.parse(e.data)); } catch (x) {} }
document.addEventListener('message', recibir);
window.addEventListener('message', recibir);
window.ReactNativeWebView.postMessage('listo');
</script></body></html>`;

export function MapaActa({ recinto, acta, margenMetros, distanciaM, fueraDeMargen }: Props) {
  const ref = useRef<WebView>(null);
  const enLinea = useConexionStore((s) => s.enLinea);
  const datos = useMemo(
    () => JSON.stringify({ recinto, acta, margen: margenMetros, fuera: fueraDeMargen, distancia: formatearDistancia(distanciaM) }),
    [recinto, acta, margenMetros, fueraDeMargen, distanciaM],
  );

  return (
    <View className="h-64 rounded-3xl overflow-hidden border border-borde bg-gris-claro">
      {enLinea ? (
        <WebView
          ref={ref}
          originWhitelist={['*']}
          // URL base definida: OpenStreetMap exige un Referer válido para servir las teselas
          source={{ html: HTML, baseUrl: 'https://controlelectoral.ec/' }}
          onMessage={(e) => {
            if (e.nativeEvent.data === 'listo') ref.current?.postMessage(datos);
          }}
          javaScriptEnabled
          scrollEnabled={false}
          setSupportMultipleWindows={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-gris text-base text-center">El mapa necesita conexión. Distancia al recinto: {formatearDistancia(distanciaM)}</Text>
        </View>
      )}
    </View>
  );
}
