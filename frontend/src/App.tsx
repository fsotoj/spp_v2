import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlobalHeader } from './components/GlobalHeader';
import { Layout } from './components/Layout';
import { MapModule } from './modules/MapModule';
import { CameraModule } from './modules/CameraModule';
import { GraphModule } from './modules/GraphModule';
import { LandingPage } from './modules/LandingPage';
import { MethodologyPage } from './modules/MethodologyPage';

function App() {
  return (
    <BrowserRouter>
      <GlobalHeader />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/explore"
          element={
            <Layout>
              <MapModule />
            </Layout>
          }
        />
        <Route
          path="/camera"
          element={
            <Layout>
              <CameraModule />
            </Layout>
          }
        />
        <Route
          path="/graph"
          element={
            <Layout>
              <GraphModule />
            </Layout>
          }
        />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/data" element={<PlaceholderPage title="Data Portal" />} />
        <Route path="/about" element={<PlaceholderPage title="About SPP" />} />
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 pt-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{title}</h1>
        <p className="text-slate-500">This section is currently being modernized. Check back soon!</p>
      </div>
    </div>
  );
}

export default App;
