# --- lib
PeerJS là một thư viện JavaScript cực kỳ mạnh mẽ giúp chúng ta làm việc với công nghệ WebRTC (Web Real-Time Communication) một cách dễ dàng hơn rất nhiều.

Socket.IO (thứ mà chúng ta vừa dùng) giống như một cái hệ thống tổng đài / nhắn tin văn bản. Nó dùng để truyền các thông điệp nhỏ (như: "Ê tạo phòng đi", "Tôi vào phòng rồi"). Nhưng Socket.IO không phù hợp để truyền tải dữ liệu nặng như luồng video và âm thanh trực tiếp giữa hai người vì sẽ làm server bị quá tải.

PeerJS (WebRTC) cho phép trình duyệt của người dùng này kết nối trực tiếp (P2P - Peer-to-Peer) với trình duyệt của người dùng kia. Khi kết nối trực tiếp thành công, hình ảnh webcam và tiếng nói của bạn sẽ bay thẳng từ máy bạn sang máy người bên cạnh mà không cần phải đi vòng qua Server trung gian nữa.

# --- stack

# --- wrokflow
Bước 1: Khởi Tạo Hệ Thống & Xin Quyền (Tại RoomProvider)
Ngay khi ứng dụng được mở lên, RoomProvider chạy hook khởi tạo (useEffect lần 1):

Tạo Định Danh Cá Nhân: Gọi uuidv4() tạo ra một ID ngẫu nhiên, sau đó khởi tạo PeerJS client: const peer = new Peer(meId). Đối tượng này được lưu vào state me.

Xin Quyền Webcam/Mic: Gọi navigator.mediaDevices.getUserMedia({ video: true, audio: true }) để bật camera và micro của máy tính, lưu luồng dữ liệu vào state stream.

Lắng Nghe Sự Kiện Server (Socket.IO): Đăng ký các sự kiện cơ bản như room-created, get-users, và user-disconnected.


Bước 2: Tạo Hoặc Tham Gia Phòng
Khi tạo phòng mới (Client gọi socket.emit("create-room")):

Server nhận sự kiện, chạy hàm createRoom, tạo roomId ngẫu nhiên và đưa socket vào phòng bằng socket.join(roomId).

Server gửi sự kiện room-created về client.

Client nhận sự kiện thông qua hàm enterRoom, gọi navigate(/room/${roomId}) để chuyển hướng trình duyệt sang trang phòng họp.

Khi vào trang Room (Room Component):

Component Room lấy id phòng từ URL thông qua useParams().

Dùng useEffect gọi ws.emit("join-room", { roomId: id, peerId: me._id }) để báo cho server biết mình đã vào phòng kèm theo mã định danh peerId.


Bước 3: Server Xử Lý Khi Có Người Vào Phòng (Server Code)
Khi server nhận được sự kiện join-room:

Hàm joinRoom chạy, kiểm tra xem phòng có tồn tại không.

Thêm peerId của người mới vào mảng quản lý rooms[roomId].

Đưa socket vào phòng Socket.IO: socket.join(roomId).

Phát tín hiệu socket.to(roomId).emit("user-joined", { peerId }) để thông báo cho tất cả những người cũ đang có mặt trong phòng biết có thành viên mới vừa vào.


Bước 4: Thiết Lập Kết Nối P2P WebRTC Giữa Các User (RoomProvider - useEffect lần 2)
Đây là lúc ma thuật WebRTC xảy ra thông qua thư viện PeerJS, chia làm 2 chiều:

Chiều 1: Người Cũ Gọi Cho Người Mới Vừa Vào
Những người cũ trong phòng nhận sự kiện ws.on("user-joined", ({ peerId })).

Ngay lập tức, người cũ gọi điện trực tiếp đến người mới bằng lệnh: const call = me.call(peerId, stream) (kèm theo luồng video/audio stream của chính mình).

Khi người mới chấp nhận và phản hồi lại luồng video của họ, sự kiện call.on("stream", (peerStream)) kích hoạt ở phía người cũ.

Người cũ gọi hàm dispatch(addPeerAction(peerId, peerStream)) để lưu video của người mới vào Redux State (peers).

Chiều 2: Người Mới Nhận Cuộc Gọi Từ Người Cũ
Khi vừa vào phòng, người mới lắng nghe sự kiện cuộc gọi đến từ PeerJS: me.on('call', (call)).

Ngay khi nhận được cuộc gọi từ người cũ, người mới tự động trả lời và gửi kèm luồng video của mình bằng lệnh: call.answer(stream).

Người mới lắng nghe luồng video của người cũ trả về thông qua call.on("stream", (peerStream)).

Người mới lưu video của người cũ vào Redux State bằng lệnh: dispatch(addPeerAction(call.peer, peerStream)).


Bước 5: Hiển Thị Lên Giao Diện (Render UI)
Trong Room Component, danh sách peers trong Redux State giờ đây đã chứa thông tin stream của các thành viên khác.

Hàm Object.values(peers).map(...) duyệt qua từng peer và render ra các thẻ <VideoPlayer stream="{peer.stream}"/>.

Đồng thời, thẻ <VideoPlayer stream="{stream}"/> đầu tiên hiển thị khung hình camera của chính bạn. Tất cả được sắp xếp gọn gàng trong khung lưới grid-cols-4.


Bước 6: Khi Có Người Rời Phòng (Disconnect)
Khi một user đóng tab hoặc mất kết nối, server bắt được sự kiện disconnect và gọi hàm leaveRoom.

Server lọc bỏ peerId khỏi mảng rooms[roomId] và phát sự kiện socket.to(roomId).emit("user-disconnected", peerId) đến những người còn lại.

Client nhận sự kiện thông qua hàm removePeer, gọi dispatch(removePeerAction(peerId)).

Reducer (peersReducer) tiến hành cắt bỏ (REMOVE_PEER) peerId đó ra khỏi state peers, khiến component tự động xóa khung video của người đó khỏi màn hình.