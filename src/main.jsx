import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './app/store';
import App from './App';
import './index.css';

// ============================================================
// main.jsx — application entry point
//
// Wraps the entire app in:
// 1. StrictMode — catches common React bugs in development
// 2. Provider — makes the Redux store available to all components
//    via useSelector/useDispatch hooks
//
// The #root element is defined in index.html
// ============================================================

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
