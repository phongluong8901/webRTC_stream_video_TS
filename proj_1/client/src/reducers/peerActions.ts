// Định nghĩa các hằng số tên action để tránh gõ nhầm (typo) trong quá trình code
export const ADD_PEER = "ADD_PEER" as const;
export const REMOVE_PEER = "REMOVE_PEER" as const;

// Action Creator: Tạo một action để thêm peer mới (kèm theo video/audio stream của họ) vào state
export const addPeerAction = (peerId: string, stream: MediaStream) => ({
    type: ADD_PEER,
    payload: { peerId, stream },
});

// Action Creator: Tạo một action để xóa peer khỏi state khi họ rời phòng
export const removePeerAction = (peerId: string) => ({
    type: REMOVE_PEER,
    payload: { peerId }
});