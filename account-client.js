(function(root){
  'use strict';
  const KEYS = [
    'aruskas_shortcuts_v3_fixed','aruskas_catmem_v1','aruskas_titlemem_v1',
    'aruskas_deleted_categories_v1','aruskas_category_records_v1',
    'aruskas_budget_pockets_v1','aruskas_budget_transfers_v1',
    'aruskas_free_balance_adjustments_v1','aruskas_savings_goals_v1',
    'aruskas_share_wa_prefs_v1','aruskas_add_action_v1','aruskas_pocket_order_v1',
    'aruskas_st_sessions_v1','aruskas_st_mode','aruskas_payday_date_v1',
    'aruskas_receipt_destination','aruskas_cleared','aruskas_pockets_cleared'
  ];
  const TX_KEY='aruskas_transactions_v4_st';
  const OWNER_KEY='aruskas_account_owner_v1';
  const READY_KEY='aruskas_account_ready_v1';
  const USER_KEY='aruskas_account_cache_v1';
  const PENDING_DOCS='aruskas_sync_pending_docs_v1';
  const PENDING_TX='aruskas_sync_pending_transactions_v1';
  const PENDING_DELETED='aruskas_sync_deleted_v1';
  const KNOWN_IDS='aruskas_sync_known_ids_v1';
  const DB_NAME='aruskas_account_cache_v1';
  let user=null, busy=false, applying=false, timer=null, dbPromise=null;

  const el=id=>document.getElementById(id);
  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const accountReady=id=>{const value=readJson(READY_KEY,[]);return Array.isArray(value)?value.includes(id):value===id};
  const markAccountReady=id=>{const value=readJson(READY_KEY,[]),ids=new Set(Array.isArray(value)?value:[]);ids.add(id);writeJson(READY_KEY,[...ids])};
  const setMessage=(text,tone='muted')=>{const box=el('accountMessage');if(box){box.textContent=text;box.dataset.tone=tone;box.style.color=tone==='error'?'var(--danger)':tone==='success'?'var(--green)':tone==='warning'?'var(--ink)':''}};
  const localTransactions=()=>readJson(TX_KEY,[]).filter(item=>item&&item.id);
  const currentDocs=()=>KEYS.flatMap(key=>{const raw=localStorage.getItem(key);if(raw===null)return[];try{return[{key,value:JSON.parse(raw)}]}catch{return[]}});
  const serverCall=async(path,{method='GET',body}={})=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(`/api/account/${path}`,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});
      const data=await response.json().catch(()=>({error:'Respons server tidak terbaca.'}));
      if(!response.ok)throw new Error(data.error||'Permintaan gagal.');
      return data;
    }finally{clearTimeout(timeout)}
  };
  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in root))return reject(new Error('Penyimpanan lokal tidak tersedia.'));
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('accounts'))request.result.createObjectStore('accounts',{keyPath:'id'})};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('Cache akun gagal dibuka.'));
    });
    return dbPromise;
  }
  async function cacheAccount(id){
    if(!id)return;
    const snapshot={docs:currentDocs(),transactions:localTransactions(),pendingTransactions:readJson(PENDING_TX,false),deletedIds:readJson(PENDING_DELETED,[]),pendingDocs:readJson(PENDING_DOCS,{}),knownIds:readJson(KNOWN_IDS,[])};
    const db=await openDb();
    await new Promise((resolve,reject)=>{const tx=db.transaction('accounts','readwrite');tx.objectStore('accounts').put({id,data:snapshot,updatedAt:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  }
  async function restoreAccount(id){
    const db=await openDb();
    const row=await new Promise((resolve,reject)=>{const tx=db.transaction('accounts','readonly');const request=tx.objectStore('accounts').get(id);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error)});
    return row?.data||null;
  }
  function setApply(value){applying=value}
  function noteTransactionChanges(){
    if(applying)return;
    const known=readJson(KNOWN_IDS,null);
    const now=localTransactions();
    if(Array.isArray(known)){
      const current=new Set(now.map(item=>String(item.id)));
      const deleted=new Set(readJson(PENDING_DELETED,[]));
      for(const id of known)if(!current.has(id))deleted.add(String(id));
      writeJson(PENDING_DELETED,[...deleted]);
    }
    writeJson(KNOWN_IDS,[...new Set([...readJson(KNOWN_IDS,[]),...now.map(item=>String(item.id))])]);
    writeJson(PENDING_TX,true);
    if(user){queueSync();saveCacheSoon()}
  }
  function noteDocumentChange(key,removed=false){
    if(applying||!KEYS.includes(key))return;
    const pending=readJson(PENDING_DOCS,{});
    pending[key]=removed?null:new Date().toISOString();
    writeJson(PENDING_DOCS,pending);
    if(user){queueSync();saveCacheSoon()}
  }
  function observeStorage(){
    const originalSet=Storage.prototype.setItem;
    const originalRemove=Storage.prototype.removeItem;
    Storage.prototype.setItem=function(key,value){const result=originalSet.call(this,key,value);if(this===root.localStorage&&KEYS.includes(String(key)))noteDocumentChange(String(key));return result};
    Storage.prototype.removeItem=function(key){const result=originalRemove.call(this,key);if(this===root.localStorage&&KEYS.includes(String(key)))noteDocumentChange(String(key),true);return result};
  }
  let cacheTimer;
  function saveCacheSoon(){if(!user)return;clearTimeout(cacheTimer);const id=user.id;cacheTimer=setTimeout(()=>cacheAccount(id).catch(()=>{}),300)}
  function queueSync(){if(!user||busy)return;if(!navigator.onLine){setMessage('Offline · perubahan tersimpan di HP dan menunggu koneksi.','warning');return}clearTimeout(timer);timer=setTimeout(()=>syncNow().catch(error=>setMessage(`${error.message} Perubahan tetap tersimpan di HP dan akan dicoba lagi.`, 'error')),1200)}
  function renderUser(){
    const signedIn=!!user;
    if(el('accountSignedOut'))el('accountSignedOut').hidden=signedIn;
    if(el('accountSignedIn'))el('accountSignedIn').hidden=!signedIn;
    if(el('accountEmail'))el('accountEmail').textContent=user?.email||'';
    if(el('accountStatusLabel'))el('accountStatusLabel').textContent=signedIn?'Akun aktif':'Belum masuk';
    if(el('accountSyncNow'))el('accountSyncNow').disabled=!signedIn||busy;
    if(el('accountLogout'))el('accountLogout').disabled=!signedIn||busy;
    if(el('accountLogoutAll'))el('accountLogoutAll').disabled=!signedIn||busy;
    const trigger=el('accountOpenBtn');
    if(trigger){const state=!signedIn?'signed-out':!navigator.onLine?'offline':busy?'syncing':'signed-in';trigger.dataset.state=state;trigger.title=state==='offline'?'Offline · perubahan menunggu koneksi':signedIn?'Akun tersambung':'Akun dan sinkronisasi';trigger.setAttribute('aria-label',trigger.title)}
  }
  function setAccountFormMode(mode='login'){
    for(const [name,id] of Object.entries({login:'accountLoginForm',signup:'accountSignupForm',recover:'accountRecoverForm',reset:'accountResetForm'})){const form=el(id);if(form)form.hidden=name!==mode}
    if(el('accountFormLinks'))el('accountFormLinks').hidden=mode!=='login';
  }
  function hasLocalData(){return localTransactions().length>0||currentDocs().length>0}
  function snapshotMeaningful(snapshot){return !!(snapshot&&(snapshot.transactions?.length||snapshot.docs?.length))}
  async function switchLocalAccount(nextId){
    const previousId=localStorage.getItem(OWNER_KEY);
    if(previousId&&previousId!==nextId){await cacheAccount(previousId);const snapshot=await restoreAccount(nextId);setApply(true);try{
      for(const key of KEYS)localStorage.removeItem(key);
      localStorage.setItem(TX_KEY,'[]');
      localStorage.setItem(PENDING_DOCS,'{}');localStorage.setItem(PENDING_TX,'false');localStorage.setItem(PENDING_DELETED,'[]');localStorage.setItem(KNOWN_IDS,'[]');
      if(snapshot){for(const doc of snapshot.docs||[])localStorage.setItem(doc.key,JSON.stringify(doc.value));localStorage.setItem(TX_KEY,JSON.stringify(snapshot.transactions||[]));writeJson(PENDING_DOCS,snapshot.pendingDocs||{});writeJson(PENDING_TX,!!snapshot.pendingTransactions);writeJson(PENDING_DELETED,snapshot.deletedIds||[]);writeJson(KNOWN_IDS,snapshot.knownIds||[])}
    }finally{setApply(false)}}
    localStorage.setItem(OWNER_KEY,nextId);
  }
  function rememberUser(value){user={id:value.id,email:value.email};writeJson(USER_KEY,user);renderUser()}
  function setOnboarding(remote){
    const box=el('accountOnboarding');if(!box)return false;
    const localHas=hasLocalData(),remoteHas=!!(remote.transactions?.length||remote.documents?.length||remote.deletedIds?.length||remote.deletedDocumentKeys?.length);
    if(localHas&&remoteHas){box.hidden=false;setMessage('Data sudah ada di HP dan akun. Pilih cara menyatukannya sebelum sinkronisasi pertama.','warning');root.openAccountModal?.();return true}
    box.hidden=true;return false;
  }
  function mergeById(local,remote){
    if(Array.isArray(local)&&Array.isArray(remote)){
      const result=new Map();
      for(const item of remote){const key=item&&typeof item==='object'?(item.id||item.code||item.name||JSON.stringify(item)):String(item);result.set(String(key),item)}
      for(const item of local){const key=item&&typeof item==='object'?(item.id||item.code||item.name||JSON.stringify(item)):String(item);if(!result.has(String(key)))result.set(String(key),item)}
      return [...result.values()];
    }
    if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)){
      const result={...remote};for(const key of Object.keys(local))result[key]=key in remote?mergeById(local[key],remote[key]):local[key];return result;
    }
    return local;
  }
  function applyRemote(remote,{merge=false,replace=false,preserveDocs=[]}={}){
    setApply(true);
    try{
    const local=localTransactions(), byId=new Map(local.map(item=>[String(item.id),item]));
    const deleted=new Set(remote.deletedIds||[]);
    const incoming=(remote.transactions||[]).map(row=>row.transaction).filter(Boolean);
    const pending=readJson(PENDING_DOCS,{});
    let transactions;
    if(merge){
      for(const item of incoming){const prior=byId.get(String(item.id));if(!prior||(item.updatedAt&&(!prior.updatedAt||item.updatedAt>=prior.updatedAt)))byId.set(String(item.id),item)}
      transactions=[...byId.values()].filter(item=>!deleted.has(String(item.id)));
    }
    if(!merge)transactions=incoming.filter(item=>!deleted.has(String(item.id)));
    const cloudDocs=new Map((remote.documents||[]).map(item=>[item.key,item.value]));
    const removedDocs=new Set(remote.deletedDocumentKeys||[]);
    for(const key of KEYS){if(preserveDocs.includes(key))continue;if(cloudDocs.has(key))localStorage.setItem(key,JSON.stringify(cloudDocs.get(key)));else if(removedDocs.has(key)||(replace&&!merge))localStorage.removeItem(key)}
    root.saveAruskasTransactions?.(transactions);
    writeJson(KNOWN_IDS,[...new Set([...transactions.map(item=>String(item.id)),...(remote.transactions||[]).map(row=>String(row.id))])]);
    if(replace&&!merge){writeJson(PENDING_DELETED,[]);writeJson(PENDING_TX,false);writeJson(PENDING_DOCS,{})}
    }finally{setApply(false)}
    root.refreshAruskas?.();
    saveCacheSoon();
  }
  async function pushLocal(){
    const documents=[];const pending=readJson(PENDING_DOCS,{});
    for(const [key,updatedAt] of Object.entries(pending)){if(!KEYS.includes(key)||updatedAt===null)continue;const raw=localStorage.getItem(key);if(raw===null)continue;try{documents.push({key,value:JSON.parse(raw),updatedAt})}catch{}}
    return serverCall('sync',{method:'POST',body:{transactions:readJson(PENDING_TX,false)?localTransactions():[],deletedIds:readJson(PENDING_DELETED,[]),documents,deletedDocumentKeys:Object.entries(pending).filter(([,value])=>value===null).map(([key])=>key)}});
  }
  async function syncNow(){
    if(!user||busy||!navigator.onLine)return;
    let retry=false;
    busy=true;renderUser();setMessage('Menyinkronkan data…');
    try{
      const sentTransactions=localTransactions();
      const sentPendingTx=readJson(PENDING_TX,false);
      const sentDeleted=readJson(PENDING_DELETED,[]);
      const sentDocs=readJson(PENDING_DOCS,{});
      const hasPending=sentPendingTx||sentDeleted.length||Object.keys(sentDocs).length;
      const remote=hasPending?await pushLocal():await serverCall('sync');
      if(hasPending){
        if(sentPendingTx&&JSON.stringify(localTransactions())===JSON.stringify(sentTransactions))writeJson(PENDING_TX,false);
        const currentDeleted=new Set(readJson(PENDING_DELETED,[]));for(const id of sentDeleted)currentDeleted.delete(id);writeJson(PENDING_DELETED,[...currentDeleted]);
        const pending=readJson(PENDING_DOCS,{});for(const [key,value] of Object.entries(sentDocs))if(pending[key]===value)delete pending[key];writeJson(PENDING_DOCS,pending);
      }
      const preserveDocs=Object.keys(readJson(PENDING_DOCS,{}));
      applyRemote(remote,{merge:true,preserveDocs});
      retry=!!(readJson(PENDING_TX,false)||readJson(PENDING_DELETED,[]).length||Object.keys(readJson(PENDING_DOCS,{})).length);
      const count=(remote.transactions||[]).length;
      setMessage(`Tersinkron · ${count.toLocaleString('id-ID')} transaksi · ${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}`,'success');
    }finally{busy=false;renderUser();if(retry)queueSync()}
  }
  async function initialSync(){
    const remote=await serverCall('sync');
    if(setOnboarding(remote)){
      el('accountMergeLocal').onclick=async()=>{el('accountOnboarding').hidden=true;busy=true;renderUser();try{setApply(true);try{const cloud=new Map((remote.documents||[]).map(item=>[item.key,item.value]));for(const key of KEYS){const raw=localStorage.getItem(key);if(raw===null)continue;let local;try{local=JSON.parse(raw)}catch{continue}if(cloud.has(key))localStorage.setItem(key,JSON.stringify(mergeById(local,cloud.get(key))))}writeJson(PENDING_DOCS,Object.fromEntries(currentDocs().map(doc=>[doc.key,new Date().toISOString()])));writeJson(PENDING_TX,true)}finally{setApply(false)}const result=await pushLocal();applyRemote(result,{replace:true});markAccountReady(user.id);setMessage('Data perangkat dan akun sudah digabung.','success')}finally{busy=false;renderUser()}};
      el('accountUseCloud').onclick=()=>{el('accountOnboarding').hidden=true;applyRemote(remote,{replace:true});markAccountReady(user.id);setMessage('Data akun dimuat di perangkat ini.','success')};
      return;
    }
    if(remote.transactions?.length||remote.documents?.length||remote.deletedIds?.length){applyRemote(remote,{replace:true});await syncNow();markAccountReady(user.id);return}
    if(hasLocalData()){writeJson(PENDING_DOCS,Object.fromEntries(KEYS.filter(key=>localStorage.getItem(key)!==null).map(key=>[key,new Date().toISOString()])));writeJson(PENDING_TX,true);await syncNow();markAccountReady(user.id);return}
    applyRemote(remote);
    markAccountReady(user.id);
  }
  async function activateAccount(value){
    await switchLocalAccount(value.id);
    rememberUser(value);
    if(accountReady(value.id))await syncNow();else await initialSync();
    renderUser();
  }
  async function submitForm(form,route){
    const data=Object.fromEntries(new FormData(form).entries());
    busy=true;renderUser();
    try{
      const result=await serverCall(route,{method:'POST',body:data});
      setMessage(result.message||'Berhasil.','success');
      if(result.authenticated){busy=false;await activateAccount(result)}
      form.reset();
    }catch(error){setMessage(error.message,'error')}
    finally{busy=false;renderUser()}
  }
  async function start(){
    observeStorage();
    el('accountOpenBtn')?.addEventListener('click',()=>root.openAccountModal?.());
    el('accountModalClose')?.addEventListener('click',()=>root.closeAccountModal?.());
    el('accountModal')?.addEventListener('click',event=>{if(event.target===event.currentTarget)root.closeAccountModal?.()});
    el('accountLoginForm')?.addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'login')});
    el('accountSignupForm')?.addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'signup')});
    el('accountResendVerification')?.addEventListener('click',async()=>{const email=String(new FormData(el('accountSignupForm')).get('email')||'').trim();if(!email)return setMessage('Isi email akun terlebih dahulu.','warning');try{const result=await serverCall('resend-verification',{method:'POST',body:{email}});setMessage(result.message,'success')}catch(error){setMessage(error.message,'error')}});
    el('accountRecoverForm')?.addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'recover')});
    el('accountResetForm')?.addEventListener('submit',event=>{event.preventDefault();const token=new URL(location.href).searchParams.get('account_token');submitFormWithToken(event.currentTarget,'reset',{token})});
    el('accountShowSignup')?.addEventListener('click',()=>setAccountFormMode('signup'));
    el('accountShowRecover')?.addEventListener('click',()=>setAccountFormMode('recover'));
    el('accountModal')?.querySelectorAll('[data-account-view="login"]').forEach(button=>button.addEventListener('click',()=>setAccountFormMode('login')));
    el('accountSyncNow')?.addEventListener('click',()=>syncNow().catch(error=>setMessage(`${error.message} Perubahan tetap tersimpan di HP.`,'error')));
    el('accountLogout')?.addEventListener('click',()=>logout('logout'));
    el('accountLogoutAll')?.addEventListener('click',()=>logout('logout-all'));
    root.addEventListener('online',()=>{renderUser();if(user)syncNow().catch(()=>{})});
    root.addEventListener('offline',()=>{renderUser();if(user)setMessage('Offline · perubahan tersimpan di HP dan menunggu koneksi.','warning')});
    setInterval(()=>{if(user&&navigator.onLine)syncNow().catch(()=>{})},300000);
    const params=new URL(location.href).searchParams;
    const token=params.get('account_token'), action=params.get('account_action');
    if(token&&action==='verify_email'){
      try{const result=await serverCall('verify',{method:'POST',body:{token}});setMessage(result.message,'success')}catch(error){setMessage(error.message,'error')}
      params.delete('account_token');params.delete('account_action');history.replaceState({},'',`${location.pathname}${params.toString()?`?${params}`:''}${location.hash}`);
    }else if(token&&action==='reset_password'){
      setAccountFormMode('reset');
      root.openAccountModal?.();
    }
    renderUser();
    let serverAnswered=false;
    try{const check=await serverCall('check',{method:'POST',body:{}});serverAnswered=true;if(check.authenticated){await activateAccount(check);return}}
    catch(error){if(navigator.onLine)setMessage(error.message,'error')}
    if(serverAnswered){localStorage.removeItem(USER_KEY);user=null;renderUser()}
    const cached=readJson(USER_KEY,null);
    if(cached&&localStorage.getItem(OWNER_KEY)===cached.id){user=cached;renderUser();setMessage('Offline · data tersimpan di HP dan menunggu koneksi untuk sinkron.','warning')}
  }
  async function submitFormWithToken(form,route,extra){const body={...Object.fromEntries(new FormData(form).entries()),...extra};busy=true;renderUser();try{const result=await serverCall(route,{method:'POST',body});setMessage(result.message,'success');form.reset();form.hidden=true;if(route==='reset')setAccountFormMode('login');const url=new URL(location.href);url.searchParams.delete('account_token');url.searchParams.delete('account_action');history.replaceState({},'',url.pathname+url.search+url.hash)}catch(error){setMessage(error.message,'error')}finally{busy=false;renderUser()}}
  async function logout(route){if(!user)return;busy=true;renderUser();try{await serverCall(route,{method:'POST',body:{}});user=null;localStorage.removeItem(USER_KEY);if(el('accountOnboarding'))el('accountOnboarding').hidden=true;setMessage('Keluar berhasil. Data yang sudah tersimpan di HP tetap tersedia di perangkat ini.','success')}catch(error){setMessage(error.message,'error')}finally{busy=false;renderUser()}}
  function storageDataChanged(){if(user){queueSync();saveCacheSoon()}}
  root.AccountSync={start,transactionsChanged:noteTransactionChanges,storageDataChanged,syncNow};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>start().catch(error=>setMessage(error.message,'error')),{once:true});else start().catch(error=>setMessage(error.message,'error'));
})(window);
