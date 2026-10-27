/* Mì Quảng Bách Khoa · js/dieu-huong.js: nhớ màn đang mở để tải lại trang vẫn ở đúng chỗ.
   Mỗi màn gọi nhoMan(tên, ...tham số) lúc mở; home() gọi nhoMan(null). Lưu trong sessionStorage
   (riêng từng tab, đóng tab là quên). Lượt chơi / trận solo đang dở vẫn được ưu tiên vào lại trước. */
const MAN_KEY = 'mqbk-man';
function nhoMan(ten, ...a){
  try{ ten ? sessionStorage.setItem(MAN_KEY, JSON.stringify([ten, ...a])) : sessionStorage.removeItem(MAN_KEY) }catch(e){}
}
function manDaNho(){ try{ return JSON.parse(sessionStorage.getItem(MAN_KEY)) }catch(e){ return null } }
// Mở lại màn đã nhớ. Nút "Đóng" của màn mở lại dẫn về màn cha hợp lý (vì không biết người chơi đi từ đâu tới).
async function moLaiMan(){
  const m = manDaNho(); if(!Array.isArray(m)) return false;
  const [ten, a, b, c, d, e] = m;
  const bxh = () => leaderboard('sv');
  const hoSo = (tab, uid) => () => hoSoScreen(tab, uid, uid && uid !== user?.id ? bxh : home);
  try{
    switch(ten){
      case 'bxh': await leaderboard(a || 'sv'); return true;
      case 'hoso': if(!ranked) return false; await hoSoScreen(a || 'stats', b || null, b ? bxh : home); return true;
      case 'xemlai': if(!ranked) return false;
        await replayScreen({[a === 'td' ? 'thach_dau' : 'run']: b, first: c || null, title: d || 'Xem lại', sub: e || '',
          back: hoSo(a === 'td' ? 'games' : 'runs', c || null)}); return true;
      case 'xem': if(!ranked || !a) return false; await watchScreen(a, hoSo('stats', a)); return true;
      case 'thach': if(!ranked) return false; await challengeScreen({id: a}, hoSo('stats', a)); return true;
      case 'suahoso': if(!ranked) return false; profileScreen(); return true;
      case 'lienhe': contactScreen(home); return true;
      case 'banbe': if(!ranked) return false; await banBeScreen(a || 'ban', home); return true;
      case 'thongbao': if(!ranked) return false; await thongBaoScreen(home); return true;
      case 'ungho': donateScreen(home); return true;
      case 'vegame': veGameScreen(home); return true;
    }
  }catch(err){ console.warn('Không mở lại được màn cũ', err) }
  nhoMan(null); return false;
}
