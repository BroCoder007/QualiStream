const {test}=require('node:test'); const assert=require('node:assert/strict'); const vm=require('node:vm');const fs=require('node:fs');
function style(initial='') { let v=initial,p=''; return {getPropertyValue(){return v},getPropertyPriority(){return p},setProperty(k,x,q){v=x;p=q},removeProperty(){v='';p=''}} }
function setup(){
 let listener; let children=[]; const root={querySelectorAll(){return children},appendChild(el){el.parent=this},documentElement:null}; root.documentElement=root;
 const video={tagName:'VIDEO',style:style('grayscale(1)'),getRootNode(){return root}}; children=[video];
 class E{constructor(){this.style={};this.attrs={};this.children=[]}setAttribute(k,v){this.attrs[k]=v}appendChild(n){this.children.push(n)}remove(){this.removed=true}}
 root.createElementNS=()=>new E();
 class MO{observe(){}}
 const chrome={runtime:{onMessage:{addListener(f){listener=f}},sendMessage(){return Promise.resolve({enabled:false,brightness:100,contrast:110,saturation:105,sharpness:35})}}};
 const ctx={document:root,window:{},chrome,MutationObserver:MO,getComputedStyle:e=>({filter:e.style.getPropertyValue()||'none'}),setInterval(){},setTimeout(){return 1},Date,Map,Set,WeakSet,Math,Number};
 vm.runInNewContext(fs.readFileSync('content_scripts/detector.js','utf8'),ctx);
 return {video,send(message){let result;listener(message,{},r=>result=r);return result},remove(){children=[]}};
}
test('enable, update, disable and restore an existing filter',()=>{
 const x=setup(); const settings={enabled:true,brightness:105,contrast:110,saturation:120,sharpness:40};
 let status=x.send({type:'APPLY_SETTINGS',settings}); assert.equal(status.detected,1);assert.equal(status.applied,1);
 assert.match(x.video.style.getPropertyValue(),/grayscale\(1\).*url\(#qualistream-sharpen-/);assert.match(x.video.style.getPropertyValue(),/saturate\(120%\)/);
 status=x.send({type:'APPLY_SETTINGS',settings:{...settings,enabled:false}});assert.equal(status.applied,0);assert.equal(x.video.style.getPropertyValue(),'grayscale(1)');
});
test('preserves a filter replaced by the page when disabling',()=>{
 const x=setup();x.send({type:'APPLY_SETTINGS',settings:{enabled:true,brightness:100,contrast:100,saturation:100,sharpness:0}});
 x.video.style.setProperty('filter','sepia(1)','');x.send({type:'APPLY_SETTINGS',settings:{enabled:false}});assert.equal(x.video.style.getPropertyValue(),'sepia(1)');
});
