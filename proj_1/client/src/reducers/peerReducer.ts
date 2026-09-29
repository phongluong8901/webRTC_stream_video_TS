import { ADD_PEER, REMOVE_PEER } from "./peerActions";

// Định nghĩa kiểu dữ liệu cho State: một object với key là peerId (string) và value là object chứa stream
export type PeerState = Record<string, { stream: MediaStream | undefined }>;

// Định nghĩa kiểu dữ liệu cho Action (Union Type): hỗ trợ 2 hành động ADD_PEER hoặc REMOVE_PEER
type peerAction =
    | {
        type: typeof ADD_PEER;
        payload: {
            peerId: string;
            stream?: MediaStream; // Stream có thể là tùy chọn
        };
    } | {
        type: typeof REMOVE_PEER;
        payload: {
            peerId: string;
            stream?: MediaStream;
        };
    };

// Reducer function: Xử lý thay đổi state dựa vào action được dispatch
export const peersReducer = (state: PeerState, action: peerAction) => {
    switch (action.type) {
        case ADD_PEER:
            // Thêm hoặc cập nhật peer mới vào state hiện tại
            return {
                ...state,
                [action.payload.peerId]: {
                    stream: action.payload.stream
                }
            };

        case REMOVE_PEER:
            // Sử dụng cú pháp Destructuring để tách peer cần xóa ra khỏi state, phần còn lại lưu vào biến rest
            const { [action.payload.peerId]: deleted, ...rest } = state;
            // Trả về state mới không chứa peer đã rời đi
            return rest;

        default:
            // Nếu không khớp action nào, giữ nguyên state cũ
            return { ...state };
    }
}