// Reusable Canvas renderer. Part positions and masks are calibrated 2D estimates.
export const SLOT_LABELS = {muzzle:'Muzzle',barrel:'Barrel',optic:'Optic',underbarrel:'Underbarrel',magazine:'Magazine',rear_grip:'Rear grip',stock:'Stock',laser:'Laser / light',comb:'Comb',apex:'APEX',ammunition:'Ammunition',bolt:'Bolt',trigger:'Trigger',hammer:'Hammer',guard:'Guard',receiver:'Receiver',cylinder:'Cylinder'};
// Rear grips must remain above both the receiver assembly and magazines. Some
// magazine card sprites include a white upper body which otherwise hides the
// selected grip even though the grip is the foreground component in game.
const ORDER = ['stock','receiver','barrel','cylinder','underbarrel','guard','magazine','rear_grip','bolt','trigger','hammer','apex','muzzle','optic','laser','comb'];
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
function opticSize(id,width,height){
  // Shared menu icons fill their source canvas independently of physical size.
  // Fit the icon first, then include the user-checked 1.49x correction in
  // the baseline so the adjustment control remains neutral at 1.0x.
  const targetHeight=/_(minireddot|reflex)/.test(id)?20:id.includes('_holo')?24:28;
  const scale=Math.min(targetHeight/height,90/width)*1.49;
  return [width*scale,height*scale];
}
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
    const t=value.transforms?.[slot];if(t){out.transforms[slot]={dx:clamp(t.dx,-400,400),dy:clamp(t.dy,-250,250),scale:clamp(t.scale||1,.1,5),rotation:clamp(t.rotation,-30,30)};if(slot==='barrel'&&Number.isFinite(t.muzzleCut))out.transforms[slot].muzzleCut=clamp(t.muzzleCut,0,.45);}}
  if(value.autoParts?.receiver&&out.parts.receiver)out.autoParts.receiver='barrel';
  return out;
}
const imageCache=new Map();
function loadImage(src){if(imageCache.has(src))return imageCache.get(src);const promise=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{imageCache.delete(src);reject(new Error(`Could not load ${src}`));};im.src=src;});imageCache.set(src,promise);return promise;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function rotatedPoint(x,y,angle){const c=Math.cos(angle),s=Math.sin(angle);return [x*c-y*s,x*s+y*c];}
// The Warlord's dual-tube magazine is part of its factory silhouette, but its
// rex_mag_xsh1 image was not recovered with the attachment sprites. Rebuild
// the visible shell tube from the official side-view reference at card scale.
function drawWarlordShellTube(ctx){
  const x=58,y=92,width=224,height=19;
  ctx.save();
  ctx.fillStyle='rgba(31,34,35,.88)';ctx.fillRect(x,y,width,height);
  for(let i=0;i<7;i++){
    const left=x+3+i*31;
    const body=ctx.createLinearGradient(0,y+3,0,y+height-3);
    body.addColorStop(0,'#8b6660');body.addColorStop(.55,'#613234');body.addColorStop(1,'#3e2528');
    ctx.fillStyle=body;ctx.fillRect(left,y+4,26,height-8);
    ctx.fillStyle='#b9a078';ctx.fillRect(left+25,y+4,4,height-8);
    ctx.fillStyle='rgba(235,218,189,.45)';ctx.fillRect(left+1,y+4,2,height-8);
  }
  ctx.fillStyle='rgba(224,231,226,.28)';ctx.fillRect(x,y+1,width,3);
  ctx.fillStyle='rgba(231,236,232,.16)';ctx.fillRect(x,y+height-3,width,2);
  ctx.strokeStyle='rgba(233,236,231,.68)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,width-1,height-1);
  ctx.restore();
}
export class WeaponSpriteCompositor{
  constructor(catalog){this.catalog=catalog;this.assets=new Map(catalog.assets.map(a=>[a.id,a]));this.images=new Map();this.tintCache=new Map();this.referenceMounts=new Map();}
  referenceMount(slot){
    if(this.referenceMounts.has(slot))return this.referenceMounts.get(slot);
    // Factory geometry is the reference even if a user moved the current
    // receiver or barrel. That movement must carry its mounted parts along.
    const baselineCatalog={...this.catalog,placement_overrides:{},slot_mounts:{}};
    const baseline=new WeaponSpriteCompositor(baselineCatalog);
    const placement=baseline.placement(factoryBuild(baselineCatalog),slot);
    this.referenceMounts.set(slot,placement);
    return placement;
  }
  order(){
    // Pistol magazines sit inside the frame/grip. Paint them first so every
    // other component can occlude them, including replacement grips.
    if(this.catalog.group==='Pistols'||this.catalog.weapon?.startsWith('rex_pi_'))return ['magazine',...ORDER.filter(slot=>slot!=='magazine')];
    return ORDER;
  }
  async ensure(state){const ids=[...Object.values(this.catalog.factory_parts||{}),...Object.values(state?.parts||{})],assets=[...new Set(ids)].map(id=>this.assets.get(id)).filter(a=>a?.src);await Promise.all(assets.map(async a=>this.images.set(a.id,await loadImage(a.src))));return this;}
  async load(state){
    // Component recipes never load the flattened weapon card. It is retained
    // only as research metadata and as the fallback for genuinely base-only
    // records such as launchers and melee items.
    if(!this.catalog.component_base){this.base=await loadImage(this.catalog.base_src);this.baseLayer=canvas(512,256);}
    await this.ensure(state);return this;
  }
  part(state,slot){
    const locked=String(state.autoParts?.[slot]||'').startsWith('apex:');
    // An APEX conversion can replace a physical slot (KASTOV ARC is a barrel
    // with slot "apex" and render_slot "barrel"). Draw it in that slot.
    if(locked){const conversion=this.assets.get(state.parts.apex);if(conversion?.render_slot===slot)return conversion;}
    const id=state.parts[slot]||(!locked&&this.catalog.factory_parts?.[slot]);const asset=this.assets.get(id);return asset?.controller_only?null:asset;
  }
  barrelMount(state,barrel){
    // The source probe gives the left muzzle socket for left-facing barrels.
    // Right-facing profiles need a separate right-edge cut calibration.
    if(!barrel?.asset.muzzle_mount||this.catalog.profile.muzzle_right)return null;
    const [l,t,r,b]=barrel.asset.bbox,meta=barrel.asset.muzzle_mount;
    const edit=state.transforms?.barrel||this.catalog.placement_overrides?.[barrel.asset.id]||{};
    const cut=clamp(edit.muzzleCut??(meta.cut_x-l)/(r-l),0,.45);
    const localX=(cut-barrel.anchor[0])*barrel.width;
    const localY=((meta.bore_y-t)/(b-t)-barrel.anchor[1])*barrel.height;
    const q=rotatedPoint(localX,localY,barrel.angle);
    return {cut,point:[barrel.x+q[0],barrel.y+q[1]]};
  }
  placement(state,slot){
    if(this.catalog.family==='pmike63'){
      const dreadline=state.parts?.barrel==='rex_bar_hvy_pmike63';
      if(slot==='guard'&&dreadline)return null;
      if(slot==='underbarrel'&&!dreadline)return null;
    }
    // Ordinary lasers are icon-only. Warlord Lumen supplies a recovered
    // full-width XSH1 laser layer that belongs in the composed preview.
    if(slot==='laser'&&!(this.catalog.family==='xsh1'&&state.parts?.apex==='rex_apex_menu_xsh1_888'&&state.parts?.laser==='rex_laser_xsh1'))return null;
    if(slot==='rear_grip'&&this.catalog.family==='mike4'&&this.part(state,'stock')?.id==='rex_stock_mike4_pdw')return null;
    if(slot==='rear_grip'&&this.catalog.family==='bmike3'&&this.part(state,'stock')?.id!=='rex_stockno_bmike3')return null;
    if(slot==='comb'&&this.catalog.family==='bmike3'&&this.part(state,'stock')?.id==='rex_stockno_bmike3')return null;
    // MOSCAR has no separate magazine layer in its default configuration.
    if(slot==='magazine'&&this.catalog.family==='moscar'&&!state.parts.magazine)return null;
    // MOSCAR's stock sprites supply its visible body. The automatic receiver
    // texture adds a duplicate rail and detached rectangle in every setup.
    if(slot==='receiver'&&this.catalog.family==='moscar')return null;
    // This stock also includes the barrel; keep its selection for restoration.
    if(slot==='barrel'&&this.catalog.family==='moscar'&&this.part(state,'stock')?.id==='rex_stockno_lgt_moscar')return null;
    const asset=this.part(state,slot);
    // The APEX slot only selects the conversion; it is drawn in its render slot.
    if(asset&&asset.slot===slot&&asset.render_slot&&asset.render_slot!==slot)return null;
    // A conversion that replaces a factory part mounts exactly where that part
    // sits, so it inherits the factory part's registration.
    const replacedId=asset&&asset.render_slot&&asset.render_slot!==asset.slot?this.catalog.factory_parts?.[asset.render_slot]:null;
    const registered=this.catalog.profile.asset_placements?.[asset?.id]||(replacedId?this.catalog.profile.asset_placements?.[replacedId]:undefined),preset=registered||this.catalog.profile.placements[slot];if(!asset||!asset.composable||!preset)return null;
    const conversion=this.assets.get(state.parts.apex),variantMount=conversion?.slot_mounts?.[slot];
    const b=asset.bbox,baseSaved=this.catalog.placement_overrides?.[asset.id]||{};
    const variantSaved=variantMount?this.catalog.placement_overrides?.[`${asset.id}@${conversion.id}`]||{}:{};
    // Ordinary positional edits belong to the factory assembly. A conversion
    // may keep an attachment's size/rotation, but receives its own x/y edits.
    const saved=variantMount?{...baseSaved,dx:0,dy:0,...variantSaved}:baseSaved;
    // A conversion that replaces a factory part is adjusted from its APEX slot.
    const editSlot=asset&&asset.slot!==slot?asset.slot:slot;
    const t=state.transforms[editSlot]||saved;
    // DECHO's factory structural sprites register correctly, but its small
    // accessories are authored at a different source scale/offset than the
    // other pistols. Apply family corrections before user overrides.
    const familyTuning=this.catalog.family==='decho'&&!this.catalog.profile.assembly_scale?({
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
    let width=sourceWidth*profileScale*scale,height=sourceHeight*profileScale*scale;
    if(slot==='optic'&&!registered){
      const [mountedWidth,mountedHeight]=opticSize(asset.id,sourceWidth,sourceHeight);
      width=mountedWidth*scale;height=mountedHeight*scale;
    }
    if(slot==='muzzle'&&!registered){
      // Menu-icon crop dimensions are not physical muzzle dimensions. Use
      // the weapon's mounted-size estimate, including its family correction.
      const suppressor=asset.id.includes('_sil_');
      const mountedSize=preset.size*.7*(suppressor?1.35:1);
      const mountedScale=mountedSize/(preset.axis==='height'?sourceHeight:sourceWidth);
      const heightLimit=suppressor?24:22;
      const fittedScale=Math.min(mountedScale,heightLimit/sourceHeight)*(preset.scale_correction||1);
      width=sourceWidth*fittedScale*scale;height=sourceHeight*fittedScale*scale;
    }
    if(slot==='underbarrel'&&!registered){
      // Shared underbarrel menu sprites have independent source framing.
      // Estimate the mounted footprint rather than drawing the full crop.
      const module=asset.id.includes('_ub_');
      const familyFactor=preset.size/52;
      const mountedSize=preset.size*(module?2.1:.67);
      const mountedScale=mountedSize/(preset.axis==='height'?sourceHeight:sourceWidth);
      // User-checked correction: the previous compact baseline needed a
      // manual 1.49x adjustment. Include it after fitting both dimensions.
      const fittedScale=Math.min(mountedScale,(module?48:60)*familyFactor/sourceHeight)*1.49;
      width=sourceWidth*fittedScale*scale;height=sourceHeight*fittedScale*scale;
    }
    let point=[...preset.point],anchor=[...preset.anchor];
    if(slot==='optic'&&this.catalog.family==='psierra41'){
      const barrel=this.placement(state,'barrel');
      // PSIERRA41 barrel variants have different cropped heights. Mount every
      // optic on the selected barrel's actual top edge rather than retaining a
      // fixed Y recovered from the factory receiver.
      point=[211,barrel?barrel.bounds[1]+4:77];
    }
    if(slot==='optic'&&this.catalog.family==='fmgolf'){
      const guard=this.placement(state,'guard');
      if(guard){
        // Mount on the selected guard, including its placement adjustments.
        // The optic's bottom edge overlaps the guard's top by two canvas units.
        const defaults=this.catalog.default_placement_overrides?.[asset.id]||{dx:-24,dy:-24};
        point=[
          (guard.bounds[0]+guard.bounds[2])/2-(defaults.dx||0),
          guard.bounds[1]+2-(1-anchor[1])*height-(defaults.dy||0)
        ];
      }
    }
    if(!registered&&(slot==='stock'||slot==='muzzle'))anchor[1]=asset.connector_y??anchor[1];
    if(slot==='underbarrel'&&asset.id.includes('_ub_'))anchor=[.75,.03];
    if(slot==='muzzle'){
        const barrel=this.placement(state,'barrel');if(barrel){
          const mount=this.barrelMount(state,barrel);
          if(mount){
            point=mount.point;
          }else if(barrel.registered){
            // Registered complete-part sprites use a top-left anchor. Their Y
            // coordinate is not the bore line; retain the recovered weapon bore
            // while attaching X to the visible front edge of the barrel.
            point=[this.catalog.profile.muzzle_right?barrel.bounds[2]-2:barrel.bounds[0]+2,this.catalog.profile.placements.muzzle.point[1]];
          }else{
            const q=rotatedPoint((.02-barrel.anchor[0])*barrel.width,0,barrel.angle);point=[barrel.x+q[0],barrel.y+q[1]];
          }
        }
    }
    // A slot mount is calibrated once against the factory part, then follows
    // the selected receiver, barrel or guard as that part changes or moves.
    // Optics use the receiver mount by default; weapon-specific rail rules
    // above remain in force until a mount is saved for that weapon.
    const configuredMount=this.catalog.slot_mounts?.[slot];
    const mount=configuredMount||(slot==='optic'&&this.catalog.family!=='fmgolf'&&
      this.catalog.family!=='psierra41'?{source:this.catalog.factory_parts?.receiver?'receiver':'barrel'}:null);
    if(mount?.source&&mount.source!==slot&&['receiver','barrel','guard'].includes(mount.source)){
      const reference=this.referenceMount(mount.source),current=this.placement(state,mount.source);
      if(reference&&current){
        const [l,t,r,b]=reference.bounds,[cl,ct,cr,cb]=current.bounds;
        const u=(point[0]-l)/Math.max(1,r-l),v=(point[1]-t)/Math.max(1,b-t);
        point=[cl+u*(cr-cl)+(mount.dx||0),ct+v*(cb-ct)+(mount.dy||0)];
      }else if(configuredMount){point=[point[0]+(mount.dx||0),point[1]+(mount.dy||0)];}
    }
    // Conversion-specific mounts take precedence over the weapon's ordinary
    // slot mount. The receiver variant supplies the local coordinate frame.
    if(variantMount?.source&&variantMount.source!==slot){
      const source=this.placement(state,variantMount.source);
      if(source){
        const [l,top,r,bottom]=source.bounds;
        point=[l+(r-l)*variantMount.u+(variantMount.dx||0),
          top+(bottom-top)*variantMount.v+(variantMount.dy||0)];
      }
    }
    // The barrel establishes the muzzle socket. A correction saved for one
    // barrel moves every compatible muzzle there without shifting other barrel
    // variants (or an APEX receiver's independent muzzle mount).
    const barrel=slot==='muzzle'&&!variantMount?this.part(state,'barrel'):null;
    const barrelOffset=barrel?this.catalog.barrel_muzzle_offsets?.[barrel.id]:null;
    const x=point[0]+(barrelOffset?.dx||0)+(tuning.dx||0)+(t.dx||0),y=point[1]+(barrelOffset?.dy||0)+(tuning.dy||0)+(t.dy||0),angle=((tuning.rotation||0)+(t.rotation||0))*Math.PI/180;
    const corners=[[0,0],[width,0],[width,height],[0,height]].map(([cx,cy])=>{const q=rotatedPoint(cx-anchor[0]*width,cy-anchor[1]*height,angle);return [x+q[0],y+q[1]];});
    const bounds=[Math.min(...corners.map(c=>c[0])),Math.min(...corners.map(c=>c[1])),Math.max(...corners.map(c=>c[0])),Math.max(...corners.map(c=>c[1]))];
    return {slot,asset,x,y,width,height,angle,anchor,bounds,registered:!!registered};
  }
  viewport(state){
    // Keep the factory weapon silhouette as the stable minimum camera, then
    // expand it whenever a selected component extends beyond that silhouette.
    // This avoids the old per-part zoom jitter while still keeping long muzzles,
    // stocks, barrels and drums inside the preview instead of clipping them.
    const b=[...(this.catalog.component_base&&this.catalog.preview_bbox||this.catalog.base_bbox)];
    for(const slot of this.order()){const p=this.placement(state,slot);if(p){b[0]=Math.min(b[0],p.bounds[0]);b[1]=Math.min(b[1],p.bounds[1]);b[2]=Math.max(b[2],p.bounds[2]);b[3]=Math.max(b[3],p.bounds[3]);}}
    const w=Math.max(b[2]-b[0]+34,(b[3]-b[1]+32)*2),h=w/2;
    return {x:(b[0]+b[2]-w)/2,y:(b[1]+b[3]-h)/2,width:w,height:h};
  }
  tinted(asset,color){
    const key=asset.id+color;if(this.tintCache.has(key))return this.tintCache.get(key);
    const [x,y,r,b]=asset.bbox,c=canvas(r-x,b-y),ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.save();
    if(this.catalog.profile.muzzle_right&&asset.slot==='muzzle'){ctx.translate(c.width,0);ctx.scale(-1,1);}
    ctx.drawImage(this.images.get(asset.id),x,y,r-x,b-y,0,0,r-x,b-y);ctx.restore();
    const data=ctx.getImageData(0,0,c.width,c.height),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    for(let i=0;i<data.data.length;i+=4){const l=(data.data[i]+data.data[i+1]+data.data[i+2])/765,shade=.28+.72*l;if(Math.max(data.data[i],data.data[i+1],data.data[i+2])<32)data.data[i+3]=0;for(let k=0;k<3;k++)data.data[i+k]=Math.round(rgb[k]*shade);}
    ctx.putImageData(data,0,0);this.tintCache.set(key,c);return c;
  }
  drawPart(ctx,p,color,state){
    const tuning=ASSET_TUNING[p.asset.id]||{},source=this.tinted(p.asset,color),clipTop=clamp(tuning.clipTop||0,0,.95);
    const sy=source.height*clipTop,dy=-p.anchor[1]*p.height+p.height*clipTop;
    if(tuning.whiteTop&&color!=='#FFFFFF'){
      const white=this.tinted(p.asset,'#FFFFFF');
      ctx.drawImage(white,0,0,white.width,sy,-p.anchor[0]*p.width,-p.anchor[1]*p.height,p.width,p.height*clipTop);
    }
    const mount=p.slot==='barrel'&&state?.parts?.muzzle?this.barrelMount(state,p):null;
    const cut=mount?.cut||0;
    ctx.drawImage(source,source.width*cut,sy,source.width*(1-cut),source.height-sy,-p.anchor[0]*p.width+p.width*cut,dy,p.width*(1-cut),p.height*(1-clipTop));
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
        ctx.translate(p.x,p.y);ctx.rotate(p.angle);
        const replacementBarrel=state.parts.barrel&&state.parts.barrel!==this.catalog.factory_parts?.barrel;
        const apexBarrel=this.assets.get(state.parts.apex)?.render_slot==='barrel';
        if(this.catalog.family==='akilo'&&slot==='receiver'&&(replacementBarrel||apexBarrel)){
          // The first 55 source pixels are the factory front stub/lug marked
          // by the user. Clip only this receiver layer in its local coordinates
          // so replacement barrels remain intact and edits follow scale/rotation.
          const sourceWidth=p.asset.bbox[2]-p.asset.bbox[0];
          const cutWidth=p.width*Math.min(55/sourceWidth,1);
          ctx.beginPath();ctx.rect(-p.anchor[0]*p.width+cutWidth,-p.anchor[1]*p.height,p.width-cutWidth,p.height);ctx.clip();
        }
        this.drawPart(ctx,p,slot==='receiver'||!selected||conversionPart?'#FFFFFF':state.color,state);ctx.restore();}
      if(this.catalog.family==='xsh1')drawWarlordShellTube(ctx);
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
    for(const slot of this.order()){const p=this.placement(state,slot);if(!p||!this.images.has(p.asset.id))continue;base.save();base.translate(p.x,p.y);base.rotate(p.angle);this.drawPart(base,p,'#FFFFFF',state);base.restore();}
    base.globalCompositeOperation='source-over';
    // Paint the retained factory weapon first. Replacement sprites are then
    // layered over it, matching the in-game card: the white receiver sits
    // behind barrels, handguards and other mounted parts instead of clipping
    // their visible pixels.
    ctx.drawImage(this.baseLayer,0,0);
    for(const slot of this.order()){const p=this.placement(state,slot);if(!p||!this.images.has(p.asset.id))continue;const conversionPart=String(state.autoParts?.[slot]||'').startsWith('apex:');ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);this.drawPart(ctx,p,slot==='receiver'||conversionPart?'#FFFFFF':state.color,state);ctx.restore();}
    if(guides){for(const slot of this.order()){const p=this.placement(state,slot);if(!p)continue;const active=slot===selectedSlot;ctx.strokeStyle=active?'#74dfd1':'#93aabd';ctx.lineWidth=1/scale;ctx.setLineDash([3/scale,3/scale]);ctx.strokeRect(p.bounds[0],p.bounds[1],p.bounds[2]-p.bounds[0],p.bounds[3]-p.bounds[1]);ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(p.x,p.y,2/scale,0,Math.PI*2);ctx.fill();}}
    ctx.restore();return {view,scale};
  }
  // The slot whose transform controls a placed part. APEX conversions drawn in
  // a factory slot are adjusted through their APEX slot.
  adjustSlot(state,slot){const p=this.placement(state,slot);return p&&p.asset.slot!==slot?p.asset.slot:slot;}
  hitTest(state,x,y){return [...this.order()].reverse().find(slot=>{const p=this.placement(state,slot);return p&&x>=p.bounds[0]&&x<=p.bounds[2]&&y>=p.bounds[1]&&y<=p.bounds[3];})||null;}
}
