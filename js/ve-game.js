/* Mì Quảng Bách Khoa · js/ve-game.js: màn "Về game" (bản 2.16.0) gồm thông tin game, chính sách dữ liệu và bảo mật,
   các bên liên quan và trách nhiệm. Sửa nội dung ở đây thì cập nhật cả VE_GAME_CAP_NHAT. */
const VE_GAME_CAP_NHAT = '28/10/2026';
const VE_GAME_RA_MAT = '24/10/2026';
function veGameScreen(back = home){
  nhoMan('vegame');
  const a = (url, t) => `<a href="${url}" target="_blank" rel="noopener">${t}</a>`;
  openOv(`<div class="row" style="justify-content:space-between;align-items:center"><div class="eyebrow">Về game</div><button class="link" id="back">Đóng</button></div>
  <h2>Mì Quảng Bách Khoa</h2>
  <div class="ve-game">
  <section class="card-s"><h3>Thông tin chung</h3>
    <div class="ve-tt">
      <span>Ra mắt</span><b>Online lần đầu ngày ${VE_GAME_RA_MAT}</b>
      <span>Phiên bản</span><b>${PHIEN_BAN}</b>
      <span>Địa chỉ</span><b>miquangbk.com</b>
      <span>Người làm</span><b>${CONTACT.ten}, sinh viên ${CONTACT.lop}, Đại học Bách Khoa, Đại học Đà Nẵng</b>
    </div>
    <p>Game bán mì Quảng trên trình duyệt, chơi trên điện thoại và laptop, dành cho sinh viên Bách Khoa Đà Nẵng. Quán trong game lấy cảm hứng từ quán Mì Quảng Bích (1-3 Đặng Dung, Hòa Khánh Bắc).</p>
    <p>Game miễn phí, không quảng cáo, không bán vật phẩm. Mục "Ủng hộ game" là tự nguyện và không đổi lấy bất kỳ lợi thế nào trong game.</p>
    <p class="muted">Đây là dự án cá nhân của sinh viên. Game không phải sản phẩm chính thức của Trường Đại học Bách Khoa, Đại học Đà Nẵng, và không có liên kết thương mại với quán Mì Quảng Bích.</p>
  </section>

  <section class="card-s"><h3>Dữ liệu game thu thập</h3>
    <p><b>Khi chơi thử (không đăng nhập):</b> không cần tài khoản. Game chỉ lưu trên máy bạn các cài đặt (giao diện, âm thanh, độ khó), quán đang mở dở và chuỗi ngày chơi. Để đếm số người ghé, game tạo một mã ngẫu nhiên lưu trên máy bạn. Mã này không gắn với tên hay email.</p>
    <p><b>Khi có tài khoản, game lưu trên máy chủ:</b></p>
    <ul>
      <li>Email và mật khẩu để đăng nhập. Mật khẩu được mã hoá một chiều (bcrypt) bởi Supabase, người làm game không xem được.</li>
      <li>Hồ sơ: tên hiển thị, bạn có phải sinh viên Bách Khoa Đà Nẵng không, khoa và lớp (chỉ khi là sinh viên), ảnh đại diện (nếu bạn tải lên). Game không hỏi MSSV, số điện thoại hay địa chỉ.</li>
      <li>Kết quả chơi: từng lượt bán, ĐBK, chuỗi ngày, trận solo, Elo.</li>
      <li>Bản ghi thao tác để xem lại từng lượt bán và trận solo (giữ 50 lượt bán gần nhất, giữ hết các trận solo).</li>
      <li>Bạn bè, lời mời kết bạn và thông báo (giữ 100 thông báo gần nhất).</li>
      <li>Nếu bật thông báo thách đấu: địa chỉ nhận thông báo do trình duyệt cấp. Tắt thông báo hoặc đăng xuất thì địa chỉ này bị xoá.</li>
    </ul>
    <p><b>Chống bot cho bộ đếm truy cập:</b> máy chủ lưu mã băm của địa chỉ mạng (không lưu IP gốc) khi có người mới ghé, và tự xoá sau 1 ngày.</p>
    <p>Game không dùng công cụ theo dõi hay phân tích của bên thứ ba, không bán hay cho thuê dữ liệu.</p>
  </section>

  <section class="card-s"><h3>Ai thấy được gì</h3>
    <ul>
      <li><b>Mọi người, kể cả chưa đăng nhập:</b> tên hiển thị, khoa, lớp hoặc nhãn "Ngoài BK", ảnh đại diện, ĐBK, số lượt chơi, chuỗi ngày, Elo, thành tích solo và thứ hạng trên bảng xếp hạng.</li>
      <li><b>Người đã đăng nhập:</b> thêm lịch sử các lượt bán và trận solo đã kết thúc, bản ghi xem lại, trạng thái đang mở game / đang bán / đang solo, và xem trực tiếp khi bạn đang chơi.</li>
      <li><b>Chỉ bạn:</b> email, danh sách bạn bè và lời mời, thông báo, trận đang đấu và lời thách đang chờ.</li>
    </ul>
  </section>

  <section class="card-s"><h3>Bảo mật</h3>
    <ul>
      <li>Mọi kết nối dùng HTTPS.</li>
      <li>Trình duyệt chỉ được đọc dữ liệu theo quy tắc phân quyền của cơ sở dữ liệu. Mọi thao tác ghi (nộp điểm, solo, kết bạn) phải qua các hàm trên máy chủ, có kiểm tra người gọi và chặn số liệu vô lý.</li>
      <li>Khoá bí mật của máy chủ không nằm trong mã của trang.</li>
      <li>Người làm game không bao giờ hỏi mật khẩu của bạn qua tin nhắn hay email. Nên dùng mật khẩu riêng cho game, không trùng với tài khoản khác.</li>
    </ul>
  </section>

  <section class="card-s"><h3>Các bên liên quan và trách nhiệm</h3>
    <p><b>Người làm game (${CONTACT.ten})</b> quyết định dữ liệu nào được thu thập và dùng để làm gì, vận hành game, trả lời và xử lý yêu cầu về dữ liệu của bạn.</p>
    <p>Game dùng dịch vụ của các bên dưới đây. Mỗi bên tự chịu trách nhiệm về hệ thống của mình theo chính sách riêng:</p>
    <ul class="ve-ben">
      <li><b>Supabase</b>: lưu cơ sở dữ liệu, đăng nhập, ảnh đại diện, cập nhật tức thì và gửi thông báo đẩy. Máy chủ đặt tại Singapore. ${a('https://supabase.com/privacy', 'Chính sách của Supabase')}</li>
      <li><b>GitHub Pages</b>: phục vụ các file của trang web. GitHub có thể ghi nhận địa chỉ IP người truy cập để bảo đảm an ninh. ${a('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', 'Chính sách của GitHub')}</li>
      <li><b>Resend</b>: gửi email xác nhận tài khoản và đặt lại mật khẩu, nên nhận được địa chỉ email của bạn. ${a('https://resend.com/legal/privacy-policy', 'Chính sách của Resend')}</li>
      <li><b>jsDelivr</b> và <b>Google Fonts</b>: cung cấp thư viện và phông chữ. Trình duyệt tải trực tiếp từ hai bên này nên họ thấy địa chỉ IP của bạn. ${a('https://jsdelivr.com/privacy-policy-jsdelivr-net', 'Chính sách của jsDelivr')} · ${a('https://policies.google.com/privacy', 'Chính sách của Google')}</li>
      <li><b>Dịch vụ thông báo của trình duyệt</b> (Google cho Chrome và Android, Apple cho Safari và iPhone, Mozilla cho Firefox): chuyển thông báo thách đấu tới máy bạn, gồm tên, lớp, Elo người thách và độ khó trận. Chỉ dùng khi bạn bật thông báo.</li>
    </ul>
    <p><b>Người chơi</b> chịu trách nhiệm về tên hiển thị và ảnh đại diện của mình (không xúc phạm, không mạo danh), và không gian lận hay tấn công hệ thống. Tài khoản vi phạm có thể bị xoá điểm hoặc xoá tài khoản.</p>
  </section>

  <section class="card-s"><h3>Quyền của bạn</h3>
    <ul>
      <li>Sửa tên, khoa, lớp, đổi hoặc xoá ảnh đại diện bất cứ lúc nào: bấm vào thẻ tên ở màn chính.</li>
      <li>Tắt thông báo thách đấu trong mục Sửa hồ sơ, huỷ kết bạn trong hồ sơ người đó.</li>
      <li>Muốn xem lại dữ liệu của mình hoặc xoá hẳn tài khoản cùng toàn bộ dữ liệu: gửi email tới ${a('mailto:' + CONTACT.email, CONTACT.email)} từ chính email đã đăng ký. Mình sẽ xử lý và báo lại cho bạn.</li>
      <li>Có thể chơi thử mà không cần tạo tài khoản.</li>
    </ul>
  </section>

  <p class="muted">Chính sách có thể thay đổi khi game thêm tính năng mới. Mọi thay đổi được ghi ở trang này. Cập nhật lần cuối: ${VE_GAME_CAP_NHAT}.</p>
  </div>
  <div class="col grow"><button class="btn ghost" id="lienHe2">Liên hệ người làm game</button></div>`);
  $('back').onclick = back;
  $('lienHe2').onclick = () => contactScreen(() => veGameScreen(back));
}
