import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import CabinRoot from './presenter/CabinRoot.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CabinRoot />
  </StrictMode>,
);
