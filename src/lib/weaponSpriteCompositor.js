// Reusable Canvas renderer. Part positions and masks are calibrated 2D estimates.
export const SLOT_LABELS = {muzzle:'Muzzle',barrel:'Barrel',optic:'Optic',underbarrel:'Underbarrel',magazine:'Magazine',rear_grip:'Rear grip',stock:'Stock',laser:'Laser / light',comb:'Comb',apex:'APEX',ammunition:'Ammunition',bolt:'Bolt',trigger:'Trigger',hammer:'Hammer',guard:'Guard',receiver:'Receiver',cylinder:'Cylinder',iron_sights:'Iron sights',other:'Other'};
// Rear grips must remain above both the receiver assembly and magazines. Some
// magazine card sprites include a white upper body which otherwise hides the
// selected grip even though the grip is the foreground component in game.
const ORDER = ['stock','receiver','barrel','cylinder','underbarrel','magazine','rear_grip','trigger','hammer','apex','muzzle','optic','laser','comb'];
// Asset-specific corrections are kept separate from the factory registration so
// one unusually framed sprite does not distort every variant in the same slot.
const ASSET_TUNING = {
  rex_stock_hvy_spier9:{dx:-5,dy:-5},
  // The KILO437 APEX stock is authored as one wide 256 px layer containing a
  // long internal rail and a compact triangular butt. Treating its left edge
  // like a conventional stock leaves the visible butt tiny and far behind the
  // receiver. Enlarge the complete layer and slide the rail underneath the
  // receiver; receiver-over-stock draw order hides the intended overlap.
  rex_stocksaw_kilo437:{dx:-191,dy:-10},
  // The linked PDW magazine source is authored horizontally. It mounts down
  // from the conversion receiver in the weapon card.
  rex_mag_mike4_pdw:{},
  // MPAPA7 measurements taken from the in-game Heavy Barrel + Heavy Short
  // Stock + Drum card. These sprites share the right source files with the
  // game, but the generic family registration cannot infer their variant
  // extents from the factory configuration.
  rex_bar_hvy_mpapa7:{dx:-27,dy:-3},
  rex_stock_hvysht_mpapa7:{dx:-49,dy:0},
  // In game the drum is an extension below the retained white magazine body.
  // The extracted card sprite contains that body too, so only its lower part
  // should be tinted/composed and it must not erase the factory magazine.
  rex_drum_mpapa7:{dx:0,dy:4,overlayOnly:true,clipTop:.54,whiteTop:true},
  // The base card's curved magazine belongs to another receiver assembly.
  // Clear it together with the old receiver before drawing the standard or
  // quickdraw receiver sprite.
  rex_rec_mpapa7:{eraseBounds:[209,46,363,221]},
  rex_rec_mpapa7_quickdraw:{eraseBounds:[209,46,363,221]}
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
export function factoryBuild(catalog){const receiver=catalog.component_base&&catalog.factory_parts?.receiver;return {version:2,weapon:catalog.weapon,mode:catalog.mode,color:catalog.color_default,parts:receiver?{receiver}:{},transforms:{},autoParts:receiver?{receiver:'factory_component'}:{}};}
export function exampleBuild(catalog,previous){
  const create=()=>{
    const state=factoryBuild(catalog),groups=new Map();
    for(const asset of catalog.assets){
      if(asset.slot==='receiver'||asset.factory_component||asset.dependency_only)continue;
      if(!groups.has(asset.slot))groups.set(asset.slot,[]);
      groups.get(asset.slot).push(asset);
    }
    const apex=groups.get('apex');
    // Occasionally demonstrate a conversion; dependency and lock rules are
    // applied by the app immediately after this randomized state is returned.
    if(apex?.length&&Math.random()<.22)state.parts.apex=apex[Math.floor(Math.random()*apex.length)].id;
    const slots=[...groups.keys()].filter(slot=>slot!=='apex').sort(()=>Math.random()-.5);
    const target=Math.min(slots.length,3+Math.floor(Math.random()*3));
    for(const slot of slots.slice(0,target)){
      const options=groups.get(slot),chosen=options[Math.floor(Math.random()*options.length)];
      if(chosen)state.parts[slot]=chosen.id;
    }
    return state;
  };
  const before=JSON.stringify(previous?.parts||{});
  let state=create();
  for(let attempt=0;attempt<7&&JSON.stringify(state.parts)===before;attempt++)state=create();
  return state;
}
export function validateBuild(value,catalog){
  if(!value||value.weapon!==catalog.weapon)throw new Error('The build belongs to a different weapon.');
  const out=factoryBuild(catalog),byId=new Map(catalog.assets.map(a=>[a.id,a]));
  if(/^#[0-9a-f]{6}$/i.test(value.color||''))out.color=value.color;
  for(const slot of catalog.slots){const id=value.parts?.[slot];if(id){if(byId.get(id)?.slot!==slot)throw new Error(`Unknown ${slot} sprite.`);out.parts[slot]=id;}
    const t=value.transforms?.[slot];if(t)out.transforms[slot]={dx:clamp(t.dx,-400,400),dy:clamp(t.dy,-250,250),scale:clamp(t.scale||1,.1,5),rotation:clamp(t.rotation,-30,30)};}
  if(value.autoParts?.receiver&&out.parts.receiver)out.autoParts.receiver='barrel';
  return out;
}
const imageCache=new Map();
function loadImage(src){if(imageCache.has(src))return imageCache.get(src);const promise=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{imageCache.delete(src);reject(new Error(`Could not load ${src}`));};im.src=src;});imageCache.set(src,promise);return promise;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rotatedPoint(x,y,angle){const c=Math.cos(angle),s=Math.sin(angle);return [x*c-y*s,x*s+y*c];}
export class WeaponSpriteCompositor{
  constructor(catalog){this.catalog=catalog;this.assets=new Map(catalog.assets.map(a=>[a.id,a]));this.images=new Map();this.tintCache=new Map();}
  order(){
    // DECHO magazines sit inside the grip assembly. Their visible body/base
    // must be painted after a replacement grip; the general rifle ordering
    // hides them completely.
    if(this.catalog.family==='decho')return ['stock','receiver','barrel','cylinder','underbarrel','rear_grip','magazine','trigger','hammer','apex','muzzle','optic','laser','comb'];
    return ORDER;
  }
  async ensure(state){const ids=[...Object.values(this.catalog.factory_parts||{}),...Object.values(state?.parts||{})],assets=[...new Set(ids)].map(id=>this.assets.get(id)).filter(Boolean);await Promise.all(assets.map(async a=>this.images.set(a.id,await loadImage(a.src))));return this;}
  async load(state){
    // Component recipes never load the flattened weapon card. It is retained
    // only as research metadata and as the fallback for genuinely base-only
    // records such as launchers and melee items.
    if(!this.catalog.component_base){this.base=await loadImage(this.catalog.base_src);this.baseLayer=canvas(512,256);}
    await this.ensure(state);return this;
  }
  part(state,slot){const locked=String(state.autoParts?.[slot]||'').startsWith('apex:'),id=state.parts[slot]||(!locked&&this.catalog.factory_parts?.[slot]);const asset=this.assets.get(id);return asset?.controller_only?null:asset;}
  placement(state,slot){
    const asset=this.part(state,slot),registered=this.catalog.profile.asset_placements?.[asset?.id],preset=registered||this.catalog.profile.placements[slot];if(!asset||!asset.composable||!preset)return null;
    const b=asset.bbox,saved=this.catalog.placement_overrides?.[asset.id]||{},t=state.transforms[slot]||saved;
    // DECHO's factory structural sprites register correctly, but its small
    // accessories are authored at a different source scale/offset than the
    // other pistols. Apply family corrections before user overrides.
    const familyTuning=this.catalog.family==='decho'?({
      // DECHO sprites were already authored for the pistol card camera. Do
      // not shrink them again here: the general pistol and muzzle reductions
      // below previously compounded to roughly 0.37x, forcing manual ~3x
      // corrections even though the factory receiver was correctly sized.
      muzzle:{dx:7,dy:20},
      optic:{dy:14},
      trigger:{dy:-7},
      laser:{dy:20}
    }[slot]||{}):{};
    const tuning={...familyTuning,...(ASSET_TUNING[asset.id]||{})};
    // An asset_placements entry belongs to this exact weapon/asset pair.
    // Restore its fitted size for receivers and attachments. Shared candidates
    // without an explicit pair keep native 1x; generic slot estimates are not
    // evidence for an individual part's scale.
    const scale=t.scale||1;
    const sourceWidth=b[2]-b[0],sourceHeight=b[3]-b[1];
    const profileScale=registered&&Number.isFinite(registered.size)&&registered.size>0
      ?registered.size/(registered.axis==='height'?sourceHeight:sourceWidth):1;
    const width=sourceWidth*profileScale*scale,height=sourceHeight*profileScale*scale;
    let point=[...preset.point],anchor=[...preset.anchor];
    if(slot==='optic'&&this.catalog.family==='psierra41'){
      const barrel=this.placement(state,'barrel');
      // PSIERRA41 barrel variants have different cropped heights. Mount every
      // optic on the selected barrel's actual top edge rather than retaining a
      // fixed Y recovered from the factory receiver.
      point=[211,barrel?barrel.bounds[1]+4:77];
    }
    if(!registered&&(slot==='stock'||slot==='muzzle'))anchor[1]=asset.connector_y??anchor[1];
    if(slot==='underbarrel'&&asset.id.includes('_ub_'))anchor=[.75,.03];
    if(slot==='muzzle'){
        const barrel=this.placement(state,'barrel');if(barrel){
          if(barrel.registered){
            // Registered complete-part sprites use a top-left anchor. Their Y
            // coordinate is not the bore line; retain the recovered weapon bore
            // while attaching X to the visible front edge of the barrel.
            point=[barrel.bounds[0]+2,this.catalog.profile.placements.muzzle.point[1]];
          }else{
            const q=rotatedPoint((.02-barrel.anchor[0])*barrel.width,0,barrel.angle);point=[barrel.x+q[0],barrel.y+q[1]];
          }
        }
    }
    const x=point[0]+(tuning.dx||0)+(t.dx||0),y=point[1]+(tuning.dy||0)+(t.dy||0),angle=((tuning.rotation||0)+(t.rotation||0))*Math.PI/180;
    const corners=[[0,0],[width,0],[width,height],[0,height]].map(([cx,cy])=>{const q=rotatedPoint(cx-anchor[0]*width,cy-anchor[1]*height,angle);return [x+q[0],y+q[1]];});
    const bounds=[Math.min(...corners.map(c=>c[0])),Math.min(...corners.map(c=>c[1])),Math.max(...corners.map(c=>c[0])),Math.max(...corners.map(c=>c[1]))];
    return {slot,asset,x,y,width,height,angle,anchor,bounds,registered:!!registered};
  }
  viewport(state){
    // Keep the factory weapon silhouette as the stable minimum camera, then
    // expand it whenever a selected component extends beyond that silhouette.
    // This avoids the old per-part zoom jitter while still keeping long muzzles,
    // stocks, barrels and drums inside the preview instead of clipping them.
    const b=[...this.catalog.base_bbox];
    for(const slot of this.order()){const p=this.placement(state,slot);if(p){b[0]=Math.min(b[0],p.bounds[0]);b[1]=Math.min(b[1],p.bounds[1]);b[2]=Math.max(b[2],p.bounds[2]);b[3]=Math.max(b[3],p.bounds[3]);}}
    const w=Math.max(b[2]-b[0]+34,(b[3]-b[1]+32)*2),h=w/2;
    return {x:(b[0]+b[2]-w)/2,y:(b[1]+b[3]-h)/2,width:w,height:h};
  }
  tinted(asset,color){
    const key=asset.id+color;if(this.tintCache.has(key))return this.tintCache.get(key);
    const [x,y,r,b]=asset.bbox,c=canvas(r-x,b-y),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.images.get(asset.id),x,y,r-x,b-y,0,0,r-x,b-y);
    const data=ctx.getImageData(0,0,c.width,c.height),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    for(let i=0;i<data.data.length;i+=4){const l=(data.data[i]+data.data[i+1]+data.data[i+2])/765,shade=.28+.72*l;if(Math.max(data.data[i],data.data[i+1],data.data[i+2])<32)data.data[i+3]=0;for(let k=0;k<3;k++)data.data[i+k]=Math.round(rgb[k]*shade);}
    ctx.putImageData(data,0,0);this.tintCache.set(key,c);return c;
  }
  drawPart(ctx,p,color){
    const tuning=ASSET_TUNING[p.asset.id]||{},source=this.tinted(p.asset,color),clipTop=clamp(tuning.clipTop||0,0,.95);
    const sy=source.height*clipTop,dy=-p.anchor[1]*p.height+p.height*clipTop;
    if(tuning.whiteTop&&color!=='#FFFFFF'){
      const white=this.tinted(p.asset,'#FFFFFF');
      ctx.drawImage(white,0,0,white.width,sy,-p.anchor[0]*p.width,-p.anchor[1]*p.height,p.width,p.height*clipTop);
    }
    ctx.drawImage(source,0,sy,source.width,source.height-sy,-p.anchor[0]*p.width,dy,p.width,p.height*(1-clipTop));
  }
  render(target,state,{guides=false,selectedSlot=null,viewport=null}={}){
    const ctx=target.getContext('2d'),view=viewport||this.viewport(state),scale=target.width/view.width;ctx.clearRect(0,0,target.width,target.height);ctx.save();ctx.scale(scale,scale);ctx.translate(-view.x,-view.y);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(this.catalog.component_base){
      // Component-mode weapons are rendered exclusively from recovered part
      // sprites. The flattened weapon card is never painted or mask-cut here.
      for(const slot of this.order()){const p=this.placement(state,slot);if(!p||!this.images.has(p.asset.id))continue;const selected=state.parts[slot]===p.asset.id,conversionPart=String(state.autoParts?.[slot]||'').startsWith('apex:');ctx.save();
        // Both recovered XAR1 receiver cards include its factory foregrip in
        // the same bitmap. No receiver-only texture exists in the decoded REX
        // XImage set. When another underbarrel is installed, derive that missing
        // state by excluding only the integral foregrip before drawing the new
        // attachment over the factory barrel/receiver assembly.
        if(this.catalog.family==='xar1'&&slot==='receiver'&&state.parts.underbarrel){
          ctx.beginPath();ctx.rect(-2048,-2048,4096,4096);ctx.rect(122,116,98,76);ctx.rect(220,124,28,68);ctx.clip('evenodd');
        }
        ctx.translate(p.x,p.y);ctx.rotate(p.angle);this.drawPart(ctx,p,slot==='receiver'||!selected||conversionPart?'#FFFFFF':state.color);ctx.restore();}
      if(guides){for(const slot of this.order()){const p=this.placement(state,slot);if(!p)continue;const active=slot===selectedSlot;ctx.strokeStyle=active?'#74dfd1':'#93aabd';ctx.lineWidth=1/scale;ctx.setLineDash([3/scale,3/scale]);ctx.strokeRect(p.bounds[0],p.bounds[1],p.bounds[2]-p.bounds[0],p.bounds[3]-p.bounds[1]);ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(p.x,p.y,2/scale,0,Math.PI*2);ctx.fill();}}
      ctx.restore();return {view,scale};
    }
    // Remove the factory regions being replaced, then also cut the selected
    // sprite's real alpha silhouette. The latter prevents the retained base from
    // hiding larger variant assemblies whose shape exceeds the factory mask.
    const base=this.baseLayer.getContext('2d');base.clearRect(0,0,512,256);base.drawImage(this.base,0,0,512,256);base.globalCompositeOperation='destination-out';
    for(const slot of Object.keys(state.parts)){
      // Barrel icons frequently contain open space beneath a rail or gas tube.
      // A rectangular factory mask turns that transparency into a receiver-sized
      // hole. Their exact sprite alpha is removed in the next pass instead.
      const tuning=ASSET_TUNING[this.part(state,slot)?.id]||{};
      if(slot==='barrel'||tuning.overlayOnly)continue;
      if(tuning.eraseBounds){const [x0,y0,x1,y1]=tuning.eraseBounds;base.fillRect(x0,y0,x1-x0,y1-y0);continue;}
      const mask=this.catalog.profile.masks[slot];if(!mask||!this.placement(state,slot))continue;base.beginPath();mask.forEach(([x,y],i)=>i?base.lineTo(x,y):base.moveTo(x,y));base.closePath();base.fill();
    }
    for(const slot of this.order()){const p=this.placement(state,slot);if(!p||!this.images.has(p.asset.id))continue;base.save();base.translate(p.x,p.y);base.rotate(p.angle);this.drawPart(base,p,'#FFFFFF');base.restore();}
    base.globalCompositeOperation='source-over';
    // Paint the retained factory weapon first. Replacement sprites are then
    // layered over it, matching the in-game card: the white receiver sits
    // behind barrels, handguards and other mounted parts instead of clipping
    // their visible pixels.
    ctx.drawImage(this.baseLayer,0,0);
    for(const slot of this.order()){const p=this.placement(state,slot);if(!p||!this.images.has(p.asset.id))continue;const conversionPart=String(state.autoParts?.[slot]||'').startsWith('apex:');ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);this.drawPart(ctx,p,slot==='receiver'||conversionPart?'#FFFFFF':state.color);ctx.restore();}
    if(guides){for(const slot of this.order()){const p=this.placement(state,slot);if(!p)continue;const active=slot===selectedSlot;ctx.strokeStyle=active?'#74dfd1':'#93aabd';ctx.lineWidth=1/scale;ctx.setLineDash([3/scale,3/scale]);ctx.strokeRect(p.bounds[0],p.bounds[1],p.bounds[2]-p.bounds[0],p.bounds[3]-p.bounds[1]);ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(p.x,p.y,2/scale,0,Math.PI*2);ctx.fill();}}
    ctx.restore();return {view,scale};
  }
  hitTest(state,x,y){return [...this.order()].reverse().find(slot=>{const p=this.placement(state,slot);return p&&x>=p.bounds[0]&&x<=p.bounds[2]&&y>=p.bounds[1]&&y<=p.bounds[3];})||null;}
}
