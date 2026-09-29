💡 Ví dụ thực tế dễ hiểu: Quy trình gửi tin nhắn chat

Bạn gõ phím và ấn Gửi ở giao diện $\rightarrow$ Gọi hàm sendMessage("Hello").

RoomProvider nhận được, tạo ra một gói dữ liệu action thông qua file action (addMessageAction).

RoomProvider ra lệnh đẩy gói đó vào bộ xử lý (chatDispatch).

chatReducer nhận được, mở gói hàng ra, lấy tin nhắn "Hello" bỏ vào kho state.messages.

Giao diện tự động cập nhật hiển thị tin nhắn "Hello" lên màn hình nhờ lấy dữ liệu từ RoomContext.

# ---

Bước 1: Định nghĩa hành động (*Actions.ts)
Nó làm gì: Tạo sẵn các "tấm vé" (hành động) ghi rõ tên việc cần làm và kèm theo dữ liệu.

Ví dụ: Gói hàng gửi đến gồm loại hành động là ADD_MESSAGE và nội dung tin nhắn (payload: { message }).


Bước 2: Xử lý quy tắc thay đổi kho (*Reducer.ts)
Nó làm gì: Quy định rõ ràng xem khi nhận được từng loại "tấm vé" (action) ở Bước 1 thì kho chứa (state) phải thay đổi như thế nào.

Ví dụ: Nếu nhận vé ADD_MESSAGE, lấy tin nhắn mới nối vào danh sách tin nhắn cũ.


Bước 3: Thực thi và kết nối (RoomProvider.tsx)
Nó làm gì: Đây là "trung tâm điều phối".

Nó lắng nghe tín hiệu từ bên ngoài (như có tin nhắn từ Socket.IO gửi tới, hoặc có người gọi video qua PeerJS).

Khi có sự kiện xảy ra, nó gọi hàm ném "tấm vé" vào Reducer (chatDispatch hoặc dispatch).

Reducer sẽ cập nhật lại State.


Bước 4: Đưa lên màn hình (Context.Provider)
Nó làm gì: Sau khi State ở Bước 3 đã được cập nhật ngon lành, RoomProvider gói ghém toàn bộ state đó cho vào RoomContext.Provider để truyền ra ngoài cho các component giao diện (UI) hiển thị lên màn hình cho người dùng xem (như khung chat, video stream).