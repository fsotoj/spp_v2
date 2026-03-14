import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GlobalHeader } from './components/GlobalHeader';
import { Layout } from './components/Layout';
import { MapModule } from './modules/MapModule';
import { CameraModule } from './modules/CameraModule';
import { GraphModule } from './modules/GraphModule';
import { ClusterModule } from './modules/ClusterModule';
import { LandingPage } from './modules/LandingPage';
import { MethodologyPage } from './modules/MethodologyPage';
import { DataPage } from './modules/DataPage';
import { AboutPage } from './modules/AboutPage';

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
        <Route
          path="/cluster"
          element={
            <Layout>
              <ClusterModule />
            </Layout>
          }
        />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
