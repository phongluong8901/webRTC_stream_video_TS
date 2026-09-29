import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { RoomProvider } from './context/RoomContext';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Room } from './pages/Room';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { VerifyEmail } from './pages/VerifyEmail';
import { ProfileSettings } from './pages/ProfileSettings';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || 'google-oauth-not-configured'}>
        <AuthProvider>
          <RoomProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/room/:id" element={<Room />} />
            </Routes>
          </RoomProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
