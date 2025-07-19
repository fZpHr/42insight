'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { motion } from 'framer-motion'
import { useAuth } from "@/contexts/AuthContext";
import { StudentCard } from '@/components/trombi-card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useQuery } from '@tanstack/react-query'
import useAuthCheck from "@/hooks/useAuthCheck";
import { Eye, EyeClosed, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const INITIAL_LOAD = 20;
const LOAD_MORE = 10;

export default function Trombinoscope() {
    useAuthCheck()
    const { user, fetchCampusStudents, isAdmin, isStaff } = useAuth();
    const [selectedCampus, setSelectedCampus] = useState<string>(user?.campus || '');
    const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
    const [showingName, setShowingName] = useState(true);
    const observerRef = useRef<HTMLDivElement>(null);

    const { data: students = [], isLoading, error } = useQuery({
        queryKey: ['students', selectedCampus],
        queryFn: () => fetchCampusStudents(selectedCampus),
        enabled: !!selectedCampus,
        staleTime: 10 * 60 * 1000,
    });

    const filteredStudents = students.filter(student => student.photoUrl);
    const visibleStudents = filteredStudents.slice(0, visibleCount);
    const hasMore = visibleCount < filteredStudents.length;

    const loadMore = useCallback(() => {
        if (hasMore) {
            setVisibleCount(prev => Math.min(prev + LOAD_MORE, filteredStudents.length));
        }
    }, [hasMore, filteredStudents.length]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [loadMore, hasMore, isLoading]);

    useEffect(() => {
        setVisibleCount(INITIAL_LOAD);
    }, [selectedCampus]);

    useEffect(() => {
        if (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to load students', {
                duration: 2000,
                position: 'bottom-right',
            });
            console.error('Error fetching students:', error);
        }
    }, [error]);

    const handleCampusChange = (value: string) => {
        setSelectedCampus(value);
    };

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-muted-foreground">
                    {filteredStudents.length} students
                </p>
                <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowingName(prev => !prev)}
                                className="flex items-center gap-2"
                            >   
                                {showingName ?  <Eye className="h-4 w-4" /> : <EyeClosed className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{showingName ? "Hide names" : "Show names"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <Select value={selectedCampus} onValueChange={handleCampusChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="angouleme">{user?.campus === "Angoulême" && <Star className="h-4 w-4 mr-1" />}Angoulême</SelectItem>
                        <SelectItem value="nice">{user?.campus === "Nice" && <Star className="h-4 w-4 mr-1" />}Nice</SelectItem>
                        {(isAdmin || isStaff) && (
                            <>
                                <SelectItem value="amsterdam">Amsterdam</SelectItem>
                                <SelectItem value="paris">Paris</SelectItem>
                                <SelectItem value="lyon">Lyon</SelectItem>
                                <SelectItem value="brussels">Brussels</SelectItem>
                                <SelectItem value="helsinki">Helsinki</SelectItem>
                                <SelectItem value="khouribga">Khouribga</SelectItem>
                                <SelectItem value="moscow">Moscow</SelectItem>
                                <SelectItem value="sao-paulo">São Paulo</SelectItem>
                                <SelectItem value="benguerir">Benguerir</SelectItem>
                                <SelectItem value="madrid">Madrid</SelectItem>
                                <SelectItem value="kazan">Kazan</SelectItem>
                                <SelectItem value="quebec">Quebec</SelectItem>
                                <SelectItem value="tokyo">Tokyo</SelectItem>
                                <SelectItem value="rio-de-janeiro">Rio de Janeiro</SelectItem>
                                <SelectItem value="seoul">Seoul</SelectItem>
                                <SelectItem value="rome">Rome</SelectItem>
                                <SelectItem value="yerevan">Yerevan</SelectItem>
                                <SelectItem value="bangkok">Bangkok</SelectItem>
                                <SelectItem value="kuala-lumpur">Kuala Lumpur</SelectItem>
                                <SelectItem value="adelaide">Adelaide</SelectItem>
                                <SelectItem value="malaga">Malaga</SelectItem>
                                <SelectItem value="lisboa">Lisboa</SelectItem>
                                <SelectItem value="heilbronn">Heilbronn</SelectItem>
                                <SelectItem value="urduliz">Urduliz</SelectItem>
                                <SelectItem value="42network">42Network</SelectItem>
                                <SelectItem value="abu-dhabi">Abu Dhabi</SelectItem>
                                <SelectItem value="wolfsburg">Wolfsburg</SelectItem>
                                <SelectItem value="alicante">Alicante</SelectItem>
                                <SelectItem value="barcelona">Barcelona</SelectItem>
                                <SelectItem value="lausanne">Lausanne</SelectItem>
                                <SelectItem value="mulhouse">Mulhouse</SelectItem>
                                <SelectItem value="istanbul">Istanbul</SelectItem>
                                <SelectItem value="kocaeli">Kocaeli</SelectItem>
                                <SelectItem value="berlin">Berlin</SelectItem>
                                <SelectItem value="florence">Florence</SelectItem>
                                <SelectItem value="vienna">Vienna</SelectItem>
                                <SelectItem value="tetouan">Tétouan</SelectItem>
                                <SelectItem value="prague">Prague</SelectItem>
                                <SelectItem value="london">London</SelectItem>
                                <SelectItem value="porto">Porto</SelectItem>
                                <SelectItem value="le-havre">Le Havre</SelectItem>
                                <SelectItem value="singapore">Singapore</SelectItem>
                                <SelectItem value="antananarivo">Antananarivo</SelectItem>
                                <SelectItem value="warsaw">Warsaw</SelectItem>
                                <SelectItem value="luanda">Luanda</SelectItem>
                                <SelectItem value="gyeongsan">Gyeongsan</SelectItem>
                            </>
                        )}
                    </SelectContent>
                </Select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {Array(10).fill(0).map((_, index) => (
                        <Card key={index} className="overflow-hidden p-0">
                            <CardContent className="p-0">
                                <Skeleton className="aspect-square w-full" />
                                <div className="p-4">
                                    <Skeleton className="h-5 w-3/4 mb-2" />
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {visibleStudents.map((student, index) => (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: (index % LOAD_MORE) * 0.05 }}
                            >
                                <StudentCard student={student} index={index} showingName={showingName} isPool={false} isGame={false}/>
                            </motion.div>
                        ))}
                    </div>
                    
                    {hasMore && (
                        <div 
                            ref={observerRef} 
                            className="flex justify-center py-8"
                        >
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
                                {Array(Math.min(LOAD_MORE, filteredStudents.length - visibleCount)).fill(0).map((_, index) => (
                                    <Card key={`loading-${index}`} className="overflow-hidden p-0">
                                        <CardContent className="p-0">
                                            <Skeleton className="aspect-square w-full" />
                                            <div className="p-4">
                                                <Skeleton className="h-5 w-3/4 mb-2" />
                                                <div className="flex justify-between items-center">
                                                    <Skeleton className="h-4 w-1/3" />
                                                    <Skeleton className="h-3 w-1/4" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}