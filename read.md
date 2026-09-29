# --- source
https://github.com/nim-f/webrtc-react

# --- setup
-- cd proj_1/server
yarn init
yarn add -D typescript tslint
yarn add -D nodemon
yarn add _D concurrently

tsc --init

yarn add -D tsx

-- cd proj_1/client
npx create-react-app . --template typescript

# --- install
-- cd proj_1/server
yarn add express socket.io
yarn add -D @types/express @types/node

yarn add cors
yarn add -d types/cors

yarn add uuid @types/uuid

-- proj_1/client
yarn add socket.io-client
yarn add socket.io-client --ignore-engines

yarn add -D tailwindcss@3 postcss autoprefixer --ignore-engines
npx tailwindcss init -p

yarn add react-router-dom --ignore-engines

npm install peerjs uuid

yarn add classnames

-- goc du an
npm install peer -g

peerjs --port 9000 --key peerjs --path /myapp

-- proj_1/peerjs
yarn add peerjs
yarn add -D @types/peerjs
yarn add peer

# --- run
-- cd proj_1/server
tsc
yarn start

-- cd proj_1/client
yarn start

-- cd proj_1/peerjs
yarn dev

# --- docker

# --- deploy


# --- convert to App PC (Electron)
-- tai goc project
npm install

-- can co .env o proj_1/server (copy tu .env.example)
-- can install deps: proj_1/client, proj_1/server, proj_1/peerjs

-- chay app PC (build san client/server/peerjs)
npm run build:app
npm start

-- chay Electron kem React dev server (localhost:3000)
npm run start:dev

-- build installer Windows (.exe trong dist_electron)
npm run build:win

-- chay server alone
npm run start:standalone