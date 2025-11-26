"use client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Trophy } from "lucide-react";

interface GameState {
    score: number;
    currentRound: number;
    totalRounds: number;
    guessedLogins: string[];
    lives: number;
}

async function fetchRandomStudent(campus: string, guessedLogins: string[]): Promise<{ name: string; photoUrl: string }> {
    try {
        const response = await fetch(`/api/games/guess-the-login?campus=${campus}&exclude=${guessedLogins.join(",")}`);
        if (!response.ok) {
            throw new Error("Failed to fetch random student");
        }
        return response.json();
    } catch (error) {
        console.error("Error fetching random student:", error);
        throw error;
    }
}

function CheckResult(input: string, correct_login: string): boolean {
    return input.trim().toLowerCase() === correct_login.trim().toLowerCase();
}

export default function GuessTheLoginPage() {
    const { data: session, status } = useSession();
    const user = session?.user;
    const [gameStarted, setGameStarted] = useState(false);
    const [gameState, setGameState] = useState<GameState>({
        score: 0,
        currentRound: 1,
        totalRounds: 10,
        guessedLogins: [],
        lives: 3,
    });
    const [guessInput, setGuessInputValue] = useState("");
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });
    const [gameOver, setGameOver] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);


    const {
        data: student,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["students", user?.campus],
        queryFn: () => fetchRandomStudent(user?.campus || "", gameState.guessedLogins),
        enabled: gameStarted && !!user?.campus && !gameOver,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    });

    const handleGuess = (value: string) => {
        if (!student || !value.trim() || isProcessing) return;

        setIsProcessing(true);
        const isCorrect = CheckResult(value, student.name);

        if (isCorrect) {
            setFeedback({ type: 'success', message: `Correct! The login is ${student.name}` });
            const newScore = gameState.score + 100;
            const newRound = gameState.currentRound + 1;
            const newGuessedLogins = [...gameState.guessedLogins, student.name];

            setGameState({
                ...gameState,
                score: newScore,
                currentRound: newRound,
                guessedLogins: newGuessedLogins,
            });

            if (newRound > gameState.totalRounds) {
                setTimeout(() => {
                    setGameOver(true);
                    setIsProcessing(false);
                }, 1500);
            } else {
                setTimeout(() => {
                    setFeedback({ type: null, message: "" });
                    setGuessInputValue("");
                    setIsProcessing(false);
                    refetch();
                }, 1500);
            }
        } else {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);

            const newLives = gameState.lives - 1;

            if (newLives <= 0) {
                setFeedback({ type: 'error', message: `Game Over! The correct answer was ${student.name}` });
                setGameState({
                    ...gameState,
                    lives: newLives,
                });
                setTimeout(() => {
                    setGameOver(true);
                    setIsProcessing(false);
                }, 2000);
            } else {
                //setFeedback({ type: 'error', message: `Wrong! It was ${student.name}` });
                const newRound = gameState.currentRound + 1;
                const newGuessedLogins = [...gameState.guessedLogins, student.name];

                setGameState({
                    ...gameState,
                    lives: newLives,
                    currentRound: newRound,
                    guessedLogins: newGuessedLogins,
                });

                if (newRound > gameState.totalRounds) {
                    setTimeout(() => {
                        setGameOver(true);
                        setIsProcessing(false);
                    }, 2000);
                } else {
                    setTimeout(() => {
                        setFeedback({ type: null, message: "" });
                        setGuessInputValue("");
                        setIsProcessing(false);
                        refetch();
                    }, 2000);
                }
            }
        }
    };

    const resetGame = () => {
        setGameState({
            score: 0,
            currentRound: 1,
            totalRounds: 10,
            guessedLogins: [],
            lives: 3,
        });
        setGameStarted(false);
        setGameOver(false);
        setFeedback({ type: null, message: "" });
        setGuessInputValue("");
        setIsProcessing(false);
        setIsShaking(false);
    };

    if (status === "loading") {
        return <div className="text-center py-20">Loading...</div>;
    }

    if (!user) {
        return <div className="text-center py-20">Please login to play</div>;
    }

    if (gameOver) {
        return (
            <div className="max-w-7xl mx-auto px-4 space-y-6">
                <div className="text-center py-20">
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle className="text-3xl flex items-center justify-center gap-2">
                                <Trophy className="w-8 h-8 text-yellow-500" />
                                Game Over!
                            </CardTitle>
                            <CardDescription>
                                {gameState.lives <= 0 ? "Better luck next time!" : "Congratulations!"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-center">
                                <p className="text-5xl font-bold text-primary">{gameState.score}</p>
                                <p className="text-muted-foreground">Final Score</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-semibold">{gameState.currentRound - 1}/{gameState.totalRounds}</p>
                                <p className="text-muted-foreground">Rounds Completed</p>
                            </div>
                            <Button onClick={resetGame} className="w-full" size="lg">
                                Play Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!gameStarted) {
        return (
            <div className="max-w-7xl mx-auto px-4 space-y-6">
                <div className="text-center py-20">
                    <h1 className="text-4xl font-bold mb-4">Guess the Login</h1>
                    <p className="text-lg text-muted-foreground mb-8">
                        Can you match the avatar to the correct 42 login?
                    </p>
                    <Card className="max-w-md mx-auto">
                        <CardHeader>
                            <CardTitle>Game Rules</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-left">
                            <p>• You have <strong>3 lives</strong></p>
                            <p>• Each correct answer gives you <strong>100 points</strong></p>
                            <p>• Complete <strong>{gameState.totalRounds} rounds</strong> to win</p>
                            <p>• Guess the login from the avatar shown</p>
                        </CardContent>
                    </Card>
                    <Button variant="default" size="lg" className="mt-8" onClick={() => setGameStarted(true)}>
                        Start Game
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 space-y-6">
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                    20%, 40%, 60%, 80% { transform: translateX(10px); }
                }
                .shake {
                    animation: shake 0.5s;
                }
            `}</style>
            <div className="text-center py-8">
                <h1 className="text-4xl font-bold mb-4">Guess the Login</h1>

                <div className="flex justify-center gap-8 mb-8">
                    <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-2xl font-bold">{gameState.score}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Round</p>
                        <p className="text-2xl font-bold">{gameState.currentRound}/{gameState.totalRounds}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Lives</p>
                        <p className="text-2xl font-bold text-red-500">{"❤️".repeat(gameState.lives)}</p>
                    </div>
                </div>

                {isLoading && <p>Loading next student...</p>}
                {error && <p className="text-red-500">Error loading student</p>}

                {student && (
                    <div className="my-8">
                        <img
                            src={student.photoUrl}
                            alt="Student Avatar"
                            className="w-48 h-48 rounded-full mx-auto border-4 border-primary/20 object-cover shadow-lg"
                        />
                    </div>
                )}

                {feedback.type && (
                    <div className={`mb-4 text-sm font-medium ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback.message}
                    </div>
                )}

                <div className={`max-w-sm mx-auto `}>
                    <div className={`${isShaking ? 'shake' : ''}`}>
                        <Input
                            type="text"
                            placeholder="Enter a login..."
                            className="mb-4"
                            value={guessInput}
                            onChange={(e) => setGuessInputValue(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter' && !isProcessing && guessInput.trim()) {
                                    e.preventDefault();
                                    handleGuess(guessInput);
                                }
                            }}
                            disabled={!student}
                            autoFocus
                        />
                    </div>
                    <Button
                        onClick={() => handleGuess(guessInput)}
                        className="w-full"
                        disabled={!student || isProcessing || !guessInput.trim()}
                    >
                        Submit Guess (or press Enter)
                    </Button>
                </div>

                <Button variant="outline" className="mt-4" onClick={resetGame}>
                    Restart Game
                </Button>
            </div>
        </div>
    );
}