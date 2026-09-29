// Electron entry đã chuyển lên root: ../main.js
// Chạy từ gốc project:
//   npm start          -> app PC (cần build client/server/peerjs trước)
//   npm run start:dev  -> load http://localhost:3000 (chạy React riêng)
//   npm run build:win  -> build installer Windows
console.error("Use root main.js: npm start / npm run build:win from project root");
process.exit(1);
