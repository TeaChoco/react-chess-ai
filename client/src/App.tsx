// Path: "client/src/App.tsx"
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export default function App() {
    return (
        <BrowserRouter basename="/react-chess-ai">
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
        </BrowserRouter>
    );
}
