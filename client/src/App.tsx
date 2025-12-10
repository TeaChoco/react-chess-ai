// Path: "client/src/App.tsx"
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import { HashRouter, Route, Routes } from 'react-router-dom';

export default function App() {
    return (
        <HashRouter>
            <Routes>
                <Route
                    path="/"
                    element={<HomePage />}
                />
                <Route
                    path="/play"
                    element={<GamePage />}
                />
            </Routes>
        </HashRouter>
    );
}
