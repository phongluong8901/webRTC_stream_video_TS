import { IMessage } from "../types/chat";

// Định nghĩa các hằng số tên action để tránh gõ nhầm (typo) trong quá trình code
export const ADD_MESSAGE = "ADD_MESSAGE" as const;
export const ADD_HISTORY = "ADD_HISTORY" as const;
export const TOGGLE_CHAT = "TOGGLE_CHAT" as const;

// Action Creator: Tạo một action để thêm peer mới (kèm theo video/audio stream của họ) vào state
export const addMessageAction = (message: IMessage) => ({
    type: ADD_MESSAGE,
    payload: { message },
});

// Action Creator: Tạo một action để xóa peer khỏi state khi họ rời phòng
export const addHistoryAction = (history: IMessage[]) => ({
    type: ADD_HISTORY,
    payload: { history }
});

export const toggleChatAction = (isOpen: boolean) => ({
    type: TOGGLE_CHAT,
    payload: { isOpen }
});