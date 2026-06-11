import L from 'leaflet'

declare module 'leaflet' {
  interface HeatMapOptions extends LayerOptions {
    minOpacity?: number
    maxZoom?: number
    max?: number
    radius?: number
    blur?: number
    gradient?: { [key: number]: string }
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: L.LatLngTuple[]): this
    addLatLng(latlng: L.LatLngTuple): this
    setOptions(options: HeatMapOptions): this
  }

  function heatLayer(
    latlngs: L.LatLngTuple[],
    options?: HeatMapOptions
  ): HeatLayer
}
