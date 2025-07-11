import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PoolUser, Student } from "@/types"
import React from "react";

interface StudentCardProps {
    student: Student
    poolUser: PoolUser
    showingName?: boolean
    isPool?: boolean
    isGame?: boolean
}


export function StudentCard({ student, poolUser, showingName, isPool, isGame }: StudentCardProps) {
    const [showGuessInput, setShowGuessInput] = React.useState(false)
    const [show, setShow] = React.useState(showingName)
    const [guess, setGuess] = React.useState('')
    const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null)

    const handleCardClick = () => {
        if (isPool && isGame) {
            setShowGuessInput(true)
        } else {
            window.open(`https://profile.intra.42.fr/users/${student.name}`, '_blank')
        }
    }
    React.useEffect(() => {
        if (isGame) {
            setShow(false)
        }
        else {
            setShow(showingName)
        }
    }, [isGame, showingName])

    const handleGuessSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const correct = guess.toLowerCase().trim() === student.name.toLowerCase().trim() || guess.toLowerCase().trim() === poolUser.firstName.toLowerCase().trim()
        setIsCorrect(correct)
        setTimeout(() => {
            setShowGuessInput(false)
            setGuess('')
            setIsCorrect(null)
        }, 1000)
    }

    return (
        <Card
            className={`overflow-hidden hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer p-0 group ${isGame && isCorrect === true ? 'border-2 border-green-500' :
                isGame && isCorrect === false ? 'border-2 border-red-500' : ''
                }`}
            onClick={handleCardClick}
            style={{
                ...(isCorrect === false && {
                    animation: 'shake 0.5s ease-in-out'
                })
            }}
        >
            <CardContent className="p-0">
                <div className="relative aspect-square">
                    <img
                        src={student.photoUrl}
                        alt={`${student.name}'s photo`}
                        className="object-cover w-full h-full"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                    />
                    {(show || (!show && !showGuessInput)) && !isGame && (
                        <div className="absolute bottom-2 left-2">
                            <div className={`bg-black/80 backdrop-blur-sm rounded-lg p-3 transition-all duration-300 ${!show ? 'opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1' : 'opacity-100'
                                }`}>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-sm text-white leading-tight">
                                        {student.name}
                                    </h3>
                                    { isPool && (
                                    <p className="text-xs text-white/80 font-medium">
                                        {poolUser.firstName}
                                    </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {!isPool && show && (
                        <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {student.year}
                            </Badge>
                        </div>
                    )}
                    {showGuessInput && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                            {isCorrect === null ? (
                                <form onSubmit={handleGuessSubmit} className="space-y-3">
                                    <input
                                        type="text"
                                        value={guess}
                                        onChange={(e) => setGuess(e.target.value)}
                                        placeholder="Guess the name..."
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        autoFocus
                                    />
                                </form>
                            ) : (
                                <div className={`text-8xl font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                    {isCorrect ? '✓' : '✗'}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
