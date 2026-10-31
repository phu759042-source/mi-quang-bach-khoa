/* Mì Quảng Bách Khoa · js/ngon-ngu.js (bản 2.19.0): song ngữ Việt / Anh. Nạp ĐẦU TIÊN, trước mọi file khác.
   - tl('chuỗi tiếng Việt', 'English'): trả chuỗi theo ngôn ngữ đang chọn (thiếu bản Anh thì dùng bản Việt).
   - Ngôn ngữ lưu ở localStorage 'mqbk-lang' ('vi' mặc định | 'en'). Đổi ngôn ngữ thì tải lại trang, vì dữ liệu game
     (khách, sự kiện, nâng cấp…) được dịch một lần lúc nạp. Màn đang mở được giữ nhờ nhoMan (dieu-huong.js).
   - HTML tĩnh trong index.html dùng thuộc tính data-en / data-en-aria / data-en-title.
   - Lỗi server (raise exception tiếng Việt) được dịch ở lớp sb.rpc (cau-hinh.js); bản gốc giữ ở error.vi. */
const LANG = (() => { try{ return localStorage.getItem('mqbk-lang') === 'en' ? 'en' : 'vi' }catch(e){ return 'vi' } })();
const EN = LANG === 'en';
const tl = (vi, en) => EN && en != null ? en : vi;
const LOCALE = EN ? 'en-US' : 'vi-VN';
const soVN = n => Number(n || 0).toLocaleString(LOCALE);
document.documentElement.lang = LANG;

function doiNgonNgu(l){ try{ localStorage.setItem('mqbk-lang', l) }catch(e){} location.reload() }
// Bản 2.19.2: nút gọn VI | EN ở góc trên bên phải (màn đăng nhập / đăng ký; màn chính đặt bên trái chuông thông báo)
const langHTML = () => `<div class="lang-sw" role="group" aria-label="Ngôn ngữ / Language">
  <button type="button" data-lang="vi" aria-pressed="${!EN}" lang="vi" aria-label="Tiếng Việt" title="Tiếng Việt">VI</button><button type="button" data-lang="en" aria-pressed="${EN}" lang="en" aria-label="English" title="English">EN</button></div>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if(b && b.dataset.lang !== LANG) doiNgonNgu(b.dataset.lang) });

// HTML tĩnh trong index.html
(function dichTinh(){
  if(!EN) return;
  document.title = 'Bach Khoa Quang Noodles';
  document.querySelectorAll('[data-en]').forEach(el => { el.innerHTML = el.dataset.en });
  document.querySelectorAll('[data-en-aria]').forEach(el => el.setAttribute('aria-label', el.dataset.enAria));
  document.querySelectorAll('[data-en-title]').forEach(el => el.setAttribute('title', el.dataset.enTitle));
})();

// Lỗi do server trả về (supabase/schema.sql) → tiếng Anh
const LOI_EN = [
  ['Bạn thách đấu nhiều quá', 'Too many challenges, try again in a few minutes'],
  ['Bạn vừa xin hoà', 'You just offered a draw, wait for your opponent to answer'],
  ['Bạn đang chờ một lời thách khác', 'You are waiting on another challenge'],
  ['Bạn đang có quá nhiều lời mời', 'You have too many unanswered friend requests'],
  ['Bạn đang có trận solo. Đấu xong', 'You are in a solo match. Finish or leave it before deleting your account'],
  ['Bạn đang trong một trận solo', 'You are already in a solo match'],
  ['Bản ghi không hợp lệ', 'Invalid recording'], ['Bản ghi phải thuộc', 'A recording must belong to a match or a run'],
  ['Bản ghi quá lớn', 'Recording too large'], ['Chưa có hồ sơ', 'No profile yet'],
  ['Chưa xác nhận xoá tài khoản', 'Account deletion not confirmed'], ['Chưa đăng nhập', 'Not signed in'],
  ['Chế độ không hợp lệ', 'Invalid mode'], ['Gửi lời mời nhanh quá', 'Sending requests too fast, try again in a few minutes'],
  ['Không thể tự kết bạn', 'You cannot friend yourself'], ['Không thể tự thách đấu', 'You cannot challenge yourself'],
  ['Không tìm thấy lượt chơi', 'Finished run not found'], ['Không tìm thấy lời thách', 'Challenge not found'],
  ['Không tìm thấy người chơi', 'Player not found'], ['Không tìm thấy trận đã kết thúc', 'Finished match not found'],
  ['Không tìm thấy trận', 'Match not found'], ['Kết quả không hợp lệ', 'Invalid result'],
  ['Link avatar không hợp lệ', 'Invalid avatar link'], ['Lượt chơi không tồn tại hoặc đã nộp', 'Run does not exist or was already submitted'],
  ['Lời thách đã hết hạn', 'The challenge expired or was cancelled'], ['Lời xin hoà đã hết hạn', 'The draw offer expired'],
  ['Mỗi trận chỉ được xin hoà 3 lần', 'You can offer a draw at most 3 times per match'],
  ['Một trong hai người đang ở trận khác', 'One of you is in another match'],
  ['Người này đang solo với người khác', 'This player is in a solo match with someone else'],
  ['Sinh viên Bách Khoa cần chọn khoa', 'Bach Khoa students must pick a faculty and enter a class'],
  ['Thao tác quá nhanh', 'Too fast, try again in a few seconds'], ['Thời gian chơi không khớp', 'Play time does not match the number of days'],
  ['Thời gian không khớp', 'Time does not match'], ['Tiến độ không hợp lệ', 'Invalid progress'], ['Trận chưa bắt đầu', 'The match has not started'],
  ['Trận đã kết thúc', 'The match is over'], ['Đăng ký thông báo không hợp lệ', 'Invalid notification subscription'],
  ['Độ khó không hợp lệ', 'Invalid difficulty']];
function tLoi(m){ if(!EN || !m) return m; for(const [vi, en] of LOI_EN) if(m.includes(vi)) return en; return m }
// Tên game trên màn chính / đăng nhập: tiếng Việt "Mì Quảng" xanh + "Bách Khoa" vàng; tiếng Anh "Bach Khoa" vàng + "Noodles" xanh
const TEN_H1 = EN ? '<em>Bach Khoa</em>Quang Noodles' : 'Mì Quảng <em>Bách Khoa</em>';
// Tên khoa lấy từ database (tiếng Việt) → tiếng Anh; tra theo mã khoa hoặc theo tên tiếng Việt
const KHOA_EN = {ck:['Cơ khí','Mechanical Engineering'], ckgt:['Cơ khí Giao thông','Transportation Mechanical Engineering'],
  nhiet:['Công nghệ Nhiệt – Điện lạnh','Thermal & Refrigeration Engineering'], cntt:['Công nghệ Thông tin','Information Technology'],
  dien:['Điện','Electrical Engineering'], dtvt:['Điện tử – Viễn thông','Electronics & Telecommunications'], hoa:['Hóa','Chemical Engineering'],
  fast:['Khoa học Công nghệ tiên tiến','Advanced Science & Technology'], kt:['Kiến trúc','Architecture'], mt:['Môi trường','Environmental Engineering'],
  qlda:['Quản lý Dự án','Project Management'], xdcd:['Xây dựng Cầu đường','Bridge & Road Engineering'],
  xdtl:['Xây dựng Công trình thủy','Water Resources Engineering'], xddd:['Xây dựng Dân dụng & Công nghiệp','Civil & Industrial Construction']};
const chuanKhoa = s => String(s).replace(/[\s–&-]+/g, ' ').trim().toLowerCase();
const tKhoa = x => { if(!EN || !x) return x; if(KHOA_EN[x]) return KHOA_EN[x][1];
  for(const k in KHOA_EN) if(chuanKhoa(KHOA_EN[k][0]) === chuanKhoa(x)) return KHOA_EN[k][1]; return x };
