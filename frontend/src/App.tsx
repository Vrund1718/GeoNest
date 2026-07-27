import 'leaflet/dist/leaflet.css';
import { AppRouter } from './router/AppRouter';
import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}

export default App;
