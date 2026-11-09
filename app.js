const START = { center: [114.587575, -3.305288], zoom: 14 };
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: START.center,
  zoom: START.zoom
});
map.addControl(new maplibregl.NavigationControl({showCompass:true}), "bottom-right");
map.addControl(new maplibregl.ScaleControl({unit:"metric"}), "bottom-left");

const fileInput = document.getElementById("fileInput");
const layerList = document.getElementById("layerList");
const emptyState = document.getElementById("emptyState");
const featureCount = document.getElementById("featureCount");
const resultCount = document.getElementById("resultCount");
const results = document.getElementById("results");
const searchInput = document.getElementById("searchInput");
const statusText = document.getElementById("statusText");
let importedLayers = [];
let allFeatures = [];
let activePopup = null;

function safeText(value) {
  return String(value ?? "").replace(/[<>]/g, "").trim();
}
function featureName(feature, index) {
  const p = feature.properties || {};
  return safeText(p.name || p.Name || p.title || p.Title || p.nama || `Lokasi ${index + 1}`);
}
function getFeatureCenter(feature) {
  const g = feature.geometry;
  if (!g) return null;
  let coords = [];
  function walk(v) {
    if (Array.isArray(v) && typeof v[0] === "number" && typeof v[1] === "number") coords.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
  }
  walk(g.coordinates);
  if (!coords.length) return null;
  const lng = coords.reduce((s,c)=>s+c[0],0)/coords.length;
  const lat = coords.reduce((s,c)=>s+c[1],0)/coords.length;
  return [lng,lat];
}
function boundsFromFeatures(features) {
  const pts = features.map(getFeatureCenter).filter(Boolean);
  if (!pts.length) return null;
  const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
  pts.forEach(p=>b.extend(p));
  return b;
}
function popupHTML(feature, index) {
  const p = feature.properties || {};
  const name = featureName(feature,index);
  const desc = safeText(p.description || p.desc || p.keterangan || "");
  const center = getFeatureCenter(feature);
  const mapsUrl = center ? `https://www.google.com/maps?q=${center[1]},${center[0]}` : "https://maps.google.com";
  return `<div class="popup-title">${name}</div><div class="popup-meta">${desc || "Tidak ada keterangan tambahan."}</div><a class="popup-link" href="${mapsUrl}" target="_blank" rel="noopener">Buka di Google Maps ↗</a>`;
}
function clearMapLayers() {
  importedLayers.forEach((layer,i)=>{
    const sourceId = `import-${i}`;
    [`${sourceId}-points`,`${sourceId}-lines`,`${sourceId}-polygons`].forEach(id=>{
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });
  importedLayers = [];
}
function addImportedLayer(name, features) {
  const id = importedLayers.length;
  const sourceId = `import-${id}`;
  const collection = {type:"FeatureCollection",features};
  importedLayers.push({id,name,features,visible:true,sourceId});
  map.addSource(sourceId,{type:"geojson",data:collection,cluster:true,clusterRadius:48,clusterMaxZoom:14});
  map.addLayer({id:`${sourceId}-polygons`,type:"fill",source:sourceId,filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#2781b8","fill-opacity":0.20,"fill-outline-color":"#176093"}});
  map.addLayer({id:`${sourceId}-lines`,type:"line",source:sourceId,filter:["==",["geometry-type"],"LineString"],paint:{"line-color":"#176da6","line-width":3}});
  map.addLayer({id:`${sourceId}-points`,type:"circle",source:sourceId,filter:["==",["geometry-type"],"Point"],paint:{"circle-radius":6,"circle-color":"#e06d3c","circle-stroke-color":"#fff","circle-stroke-width":1.7}});
  [`${sourceId}-points`,`${sourceId}-lines`,`${sourceId}-polygons`].forEach(layerId=>{
    map.on("click",layerId,(e)=>{
      const f=e.features?.[0]; if(!f) return;
      if(activePopup) activePopup.remove();
      const coords=e.lngLat;
      activePopup=new maplibregl.Popup({closeButton:true,maxWidth:"280px"}).setLngLat(coords).setHTML(popupHTML(f,0)).addTo(map);
    });
    map.on("mouseenter",layerId,()=>map.getCanvas().style.cursor="pointer");
    map.on("mouseleave",layerId,()=>map.getCanvas().style.cursor="");
  });
}
function renderLayers() {
  layerList.innerHTML="";
  emptyState.style.display=importedLayers.length?"none":"block";
  importedLayers.forEach(layer=>{
    const row=document.createElement("label"); row.className="layer-row";
    const check=document.createElement("input"); check.type="checkbox"; check.checked=layer.visible;
    check.addEventListener("change",()=>{
      layer.visible=check.checked;
      [`${layer.sourceId}-points`,`${layer.sourceId}-lines`,`${layer.sourceId}-polygons`].forEach(id=>map.setLayoutProperty(id,"visibility",layer.visible?"visible":"none"));
      renderResults();
    });
    const name=document.createElement("span"); name.className="layer-name"; name.textContent=layer.name;
    const num=document.createElement("span"); num.className="layer-num"; num.textContent=layer.features.length;
    row.append(check,name,num); layerList.append(row);
  });
  const count=importedLayers.reduce((s,l)=>s+l.features.length,0);
  featureCount.textContent=`${count} fitur`;
}
function renderResults() {
  const q=searchInput.value.toLowerCase().trim();
  const visible=importedLayers.filter(l=>l.visible).flatMap(l=>l.features.map((f,i)=>({f,i,layer:l.name})));
  const found=visible.filter(o=>!q || (featureName(o.f,o.i)+" "+JSON.stringify(o.f.properties||{})).toLowerCase().includes(q));
  resultCount.textContent=found.length;
  results.innerHTML="";
  if(!found.length){results.innerHTML='<p class="muted">Tidak ada lokasi yang cocok.</p>';return;}
  found.slice(0,100).forEach(o=>{
    const b=document.createElement("button"); b.className="result-item";
    const title=document.createElement("strong"); title.textContent=featureName(o.f,o.i);
    const meta=document.createElement("small"); meta.textContent=o.layer;
    b.append(title,meta);
    b.addEventListener("click",()=>{
      const c=getFeatureCenter(o.f); if(!c)return;
      map.flyTo({center:c,zoom:16});
      if(activePopup)activePopup.remove();
      activePopup=new maplibregl.Popup({maxWidth:"280px"}).setLngLat(c).setHTML(popupHTML(o.f,o.i)).addTo(map);
    });
    results.append(b);
  });
  if(found.length>100){const more=document.createElement("p");more.className="muted";more.textContent=`Menampilkan 100 dari ${found.length} hasil.`;results.append(more);}
}
async function parseFile(file) {
  const lower=file.name.toLowerCase();
  let xmlText;
  if(lower.endsWith(".kmz")){
    const zip=await JSZip.loadAsync(file);
    const kmlPath=Object.keys(zip.files).find(n=>n.toLowerCase().endsWith(".kml"));
    if(!kmlPath) throw new Error("File KMZ tidak berisi dokumen KML.");
    xmlText=await zip.files[kmlPath].async("text");
  } else {
    xmlText=await file.text();
  }
  const xml=new DOMParser().parseFromString(xmlText,"text/xml");
  if(xml.querySelector("parsererror")) throw new Error("Format KML tidak dapat dibaca.");
  const geo=toGeoJSON.kml(xml);
  return geo.features || [];
}
fileInput.addEventListener("change",async(e)=>{
  const files=[...e.target.files]; if(!files.length)return;
  statusText.textContent="Membaca file…";
  try{
    const parsed=[];
    for(const file of files){
      const features=await parseFile(file);
      parsed.push({name:file.name.replace(/\.(kml|kmz)$/i,""),features});
    }
    clearMapLayers();
    parsed.forEach(item=>addImportedLayer(item.name,item.features));
    allFeatures=parsed.flatMap(p=>p.features);
    renderLayers(); renderResults();
    const bounds=boundsFromFeatures(allFeatures);
    if(bounds && !bounds.isEmpty()) map.fitBounds(bounds,{padding:70,maxZoom:16,duration:900});
    statusText.textContent=`${allFeatures.length} fitur berhasil dimuat`;
  }catch(err){
    console.error(err);
    statusText.textContent="Gagal membaca file";
    alert("Gagal mengimpor file: "+err.message);
  }finally{fileInput.value="";}
});
searchInput.addEventListener("input",renderResults);
document.getElementById("clearSearch").addEventListener("click",()=>{searchInput.value="";renderResults();});
document.getElementById("zoomIn").addEventListener("click",()=>map.zoomIn());
document.getElementById("zoomOut").addEventListener("click",()=>map.zoomOut());
document.getElementById("resetView").addEventListener("click",()=>map.flyTo({center:START.center,zoom:START.zoom}));
document.getElementById("locateBtn").addEventListener("click",()=>{
  if(!navigator.geolocation){alert("Browser tidak mendukung GPS.");return;}
  navigator.geolocation.getCurrentPosition(pos=>map.flyTo({center:[pos.coords.longitude,pos.coords.latitude],zoom:16}),()=>alert("Lokasi tidak dapat diakses. Periksa izin lokasi browser."));
});
map.on("load",()=>{statusText.textContent="Peta siap — impor KML/KMZ";});


// PWA installation prompt (supported browsers only).
let deferredInstallPrompt = null;
const installButton = document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton) installButton.hidden = false;
});
if (installButton) {
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });
}
window.addEventListener("appinstalled", () => {
  if (installButton) installButton.hidden = true;
});
