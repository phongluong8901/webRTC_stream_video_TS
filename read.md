# --- source
https://github.com/nim-f/webrtc-react

# --- setup
-- cd proj_1/server
yarn init
yarn add -D typescript tslint
yarn add -D nodemon
yarn add _D concurrently

tsc --init

yarn add express socket.io
yarn add -D @types/express @types/node

yarn add cors
yarn add -d types/cors

yarn add -D tsx

-- cd proj_1/client
npx create-react-app . --template typescript

yarn add socket.io-client
yarn add socket.io-client --ignore-engines

# --- install
-- cd proj_1/server

-- cd proj_1/client

# --- run
-- cd proj_1/server
tsc
yarn start

-- cd proj_1/client
yarn start

# --- docker

# --- deploy
