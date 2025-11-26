import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface GameCardProps {
    title: string;
    description: string;
    link: string;
    author?: string;
    bgImage?: string;
}

function GameCard({ title, description, link, author, bgImage }: GameCardProps) {
    return (
        <a href={link} className="block group" target="_blank" rel="noopener noreferrer">
            <Card className="relative overflow-hidden p-6 hover:shadow-xl transition-all duration-300 h-full">
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                    style={{ backgroundImage: 'url(' + (bgImage || '/default-game-bg.jpg') + ')' }}
                />
                <div className="relative z-10">
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{title}</h3>
                    <p className="text-muted-foreground">{description}</p>
                    {author && <p className="text-sm text-muted-foreground/70 mt-4">By {author}</p>}
                </div>
            </Card>
        </a>
    );
}

export default function GamesCenter() {

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Games Center</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                <GameCard
                    title="Guess the login"
                    description="Find the correct 42 login based on the avatar!"
                    link="/games/guess-the-login"
                    bgImage="guess-the-login.png"
                    author="bapasqui"
                />
                <GameCard
                    title="Mushroom Clicker"
                    description="Click on mushrooms to earn points and level up!"
                    link="https://acholias.github.io/Mushroom-Clicker/front/mushroom.html"
                    bgImage="https://upoevdcxa3.ufs.sh/f/IN4OjmY4wMHByRj6Abh3g4bLHz1flExrasd69SQcRTVjKFyq"
                    author="lumugot"
                />
                <Card className="relative overflow-hidden p-6 h-full border-dashed border-2 flex items-center justify-center">
                    <div className="text-center space-y-2">
                        <Plus className="w-8 h-8 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                            Want to share your game? Submit a{" "}
                            <a 
                                href="https://github.com/fzphr/42insight/issues/new?title=[ADD_GAMES]&body=Link%20to%20your%20games%20here...&labels=games" 
                                className="text-primary hover:underline font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Pull Request
                            </a>
                            {" "}or contact an admin.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    </div >
  )
  
}
