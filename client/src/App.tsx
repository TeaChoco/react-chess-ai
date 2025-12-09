// Path: "client/src/App.tsx"
import ChessGame from './components/ChessGame';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
    return (
        <div className="min-h-screen transition-colors duration-300">
            <ThemeToggle />

            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                        ♟️ Chess vs AI
                    </h1>
                    <p className="text-muted-foreground">
                        Play against Stockfish engine
                    </p>
                </header>

                <ChessGame />
            </div>
        </div>
    );
}
