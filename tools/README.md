# tools

## Mascot renders

`public/brand/mascot-raise.png` and `mascot-strike.png` are rendered from the mesh in
`printezy247/designresources` (`Sam/BrandAssets/3DModels/SamBangGoldMascot_v1.obj`) with three.js in headless Chromium.

```bash
mkdir -p /tmp/render && cd /tmp/render && npm init -y && npm i three@0.160.0
cp <designresources>/Sam/BrandAssets/3DModels/SamBangGoldMascot_v1.obj m.obj
cp <website_sam>/tools/mascot-render.html render.html
python3 -m http.server 8765 &
node <website_sam>/tools/mascot-render.mjs   # needs playwright + chromium
```

The strike pose is the mesh as exported. The raise pose rotates the arms and hammer 125° about the shoulder pad. Both frames share one camera and one crop so the CSS two-frame animation lines up.
