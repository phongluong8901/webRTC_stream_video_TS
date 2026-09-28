# --- lib
PeerJS là một thư viện JavaScript cực kỳ mạnh mẽ giúp chúng ta làm việc với công nghệ WebRTC (Web Real-Time Communication) một cách dễ dàng hơn rất nhiều.

Socket.IO (thứ mà chúng ta vừa dùng) giống như một cái hệ thống tổng đài / nhắn tin văn bản. Nó dùng để truyền các thông điệp nhỏ (như: "Ê tạo phòng đi", "Tôi vào phòng rồi"). Nhưng Socket.IO không phù hợp để truyền tải dữ liệu nặng như luồng video và âm thanh trực tiếp giữa hai người vì sẽ làm server bị quá tải.

PeerJS (WebRTC) cho phép trình duyệt của người dùng này kết nối trực tiếp (P2P - Peer-to-Peer) với trình duyệt của người dùng kia. Khi kết nối trực tiếp thành công, hình ảnh webcam và tiếng nói của bạn sẽ bay thẳng từ máy bạn sang máy người bên cạnh mà không cần phải đi vòng qua Server trung gian nữa.

# --- stack

# --- wrokflow
