/* Mì Quảng Bách Khoa · js/mang.js: Gọi RPC có thử lại (Safari iOS hay lỗi "Load failed").
   Script thường (không phải module): mọi file dùng chung biến toàn cục, nạp theo thứ tự trong index.html. */
/* ================= Mạng: gửi lại khi lỗi (Safari iOS hay hỏng kết nối cũ) ================= */
const isNetErr=err=>!err.code&&/load failed|failed to fetch|networkerror|network request|fetch/i.test(err.message||'');
async function rpcRetry(fn,args,tries=4){
  let res;
  for(let i=0;i<tries;i++){
    try{res=await sb.rpc(fn,args)}catch(e){res={data:null,error:{message:String(e)}}}
    if(!res.error||!isNetErr(res.error)) return res;
    await new Promise(r=>setTimeout(r,[400,1200,2500][i]||2500));
  }
  return res;
}
function savePending(p){try{localStorage.setItem('mqbk-pending',JSON.stringify(p))}catch(e){}}
function loadPending(){try{return JSON.parse(localStorage.getItem('mqbk-pending'))}catch(e){return null}}
function clearPending(){try{localStorage.removeItem('mqbk-pending')}catch(e){}}
let memPending=null;
async function submitPending(p){
  memPending=p;
  const res=await rpcRetry('nop_ket_qua',{p_run_id:p.run,p_so_ngay:p.so_ngay,p_doanh_thu:p.doanh_thu,p_tim_mat:p.tim_mat});
  if(!res.error){clearPending();memPending=null;return res}
  if(isNetErr(res.error)) return res;              // giữ lại để nộp sau
  clearPending();memPending=null;                  // lỗi từ server: không thử lại nữa
  if(/đã nộp/.test(res.error.vi||res.error.message)){await loadProfile();return {data:{delta:null,diem:profile?.diem??0,hang:myRank}}}
  return res;
}
// Nộp kết quả còn treo trước khi mở lượt mới, để lượt cũ không bị tính là bỏ dở
async function flushPending(){
  const p=loadPending()||memPending;
  if(!p||!user||p.uid!==user.id) return true;
  const {error}=await submitPending(p);
  if(!error){await loadProfile();return true}
  return !isNetErr(error);
}
