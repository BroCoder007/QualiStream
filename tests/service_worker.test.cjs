const {test}=require('node:test'); const assert=require('node:assert/strict'); const vm=require('node:vm'); const fs=require('node:fs');
function setup(){
  const values={}; let listener; const data={};
  const chrome={storage:{session:{async get(k){return {[k]:data[k]}},async set(v){Object.assign(data,v)},async remove(k){delete data[k]}}},webNavigation:{async getAllFrames(){return [{frameId:0},{frameId:3},{frameId:4}]}},tabs:{async query(){return [{id:42}]},async sendMessage(id,msg,opt){if(opt.frameId===4)throw new Error('restricted'); if(msg.type==='GET_STATUS')return {detected:opt.frameId===0?1:2,applied:opt.frameId===0?1:2};values[opt.frameId]=msg.settings;return {}},onRemoved:{addListener(){}}},runtime:{onMessage:{addListener(f){listener=f}}}};
  vm.runInNewContext(fs.readFileSync('background/service_worker.js','utf8'),{chrome,Promise,Number,Math,String});
  async function call(message,sender={}){return new Promise((resolve,reject)=>{if(listener(message,sender,resolve)!==true)reject(Error('missing async response'))})}
  return {call,values,data};
}
test('per-tab updates reach each accessible frame and status aggregates',async()=>{
 const {call,values,data}=setup(); let r=await call({type:'SET_TAB',settings:{enabled:true,brightness:180,sharpness:40}});
 assert.equal(r.settings.brightness,150); assert.equal(r.detected,3); assert.equal(r.applied,3); assert.equal(values[3].enabled,true); assert.equal(data['tab:42'].sharpness,40);
 r=await call({type:'GET_SETTINGS'},{tab:{id:42}}); assert.equal(r.enabled,true); assert.equal(r.sharpness,40);
});
test('tabs remain independent and invalid numbers are ignored',async()=>{
 const {call}=setup(); await call({type:'SET_TAB',settings:{enabled:true,contrast:NaN}});
 const other=await call({type:'GET_SETTINGS'},{tab:{id:7}}); assert.equal(other.enabled,false); assert.equal(other.contrast,110);
});
