import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Scanner from './pages/Scanner';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Scanner />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/learn" element={<Learn />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
