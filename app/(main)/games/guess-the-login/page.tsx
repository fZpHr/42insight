"use client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface GameState {
    score: number;
    currentRound: number;
    totalRounds: number;
    guessedLogins: string[];
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
    });
    const [guessInput, setGuessInputValue] = useState("");
    const [shakeInput, setShakeInput] = useState(false);
    const [inputState, setInputState] = useState<"correct" | "incorrect" | null>(null);

    const {
        data: student,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ["students", user?.campus],
        queryFn: () => fetchRandomStudent(user?.campus || "", gameState.guessedLogins),
        enabled: gameStarted,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    });

    const handleGuess = (guess: string) => {
        if (!student) return;

        const isCorrect = CheckResult(guess, student.name);
        let newScore = gameState.score;
        let newGuessedLogins = [...gameState.guessedLogins, student.name];

        if (isCorrect) {
            newScore += 100;
            newGuessedLogins.push(student.name);
            setInputState("correct");
            setGuessInputValue("");
            setTimeout(() => {
                setInputState(null);
                refetch();
            }, 300);
        } else {
            newScore -= 50;
            setInputState("incorrect");
            setShakeInput(true);
            setGuessInputValue("");
            setTimeout(() => {
                setShakeInput(false);
                setInputState(null);
            }, 500);
        }

        gameState.score = newScore;
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
                </div>


                {student && (
                    <div className="my-8">
                        <p className="mb-4 text-lg">{student.name}</p>
                        <img
                            src={student.photoUrl}
                            alt="Student Avatar"
                            className="w-48 h-48 rounded-full mx-auto border-4 border-primary/20 object-cover shadow-lg"
                        />
                    </div>
                )}


                <div className={`max-w-sm mx-auto `}>
                    <div className={shakeInput ? "shake" : ""}>
                        <Input
                            type="text"
                            placeholder="Enter a login..."
                            className={`mb-4 transition-colors ${inputState === "correct"
                                ? "border-green-700 focus-visible:ring-green-700"
                                : inputState === "incorrect"
                                    ? "border-red-500 focus-visible:ring-red-500"
                                    : ""
                                }`}
                            value={guessInput}
                            onChange={(e) => setGuessInputValue(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter' && guessInput.trim()) {
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
                        disabled={!student}
                    >
                        Submit Guess (or press Enter)
                    </Button>
                </div>
            </div>
        </div>
    );
}