"use client";
import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Spinner } from "@/components/ui/spinner";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { Search, TriangleAlert, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Project } from "@/types";
import { useSession } from 'next-auth/react';
import { TransparentBadge } from '@/components/TransparentBadge';
import { useCampus } from "@/contexts/CampusContext";
import { LoadingScreen } from "@/components/LoadingScreen";

async function fetchPeersData() {
    try {
        const response = await fetch('/api/peers');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    } catch (error) {
        console.error('Error fetching peers data:', error);
        throw error;
    }
}



const PROJECT_ORDER: { [key: string]: number } = {
    "libft": 1314,
    "Born2beroot": 1994,
    "ft_printf": 1316,
    "get_next_line": 1327,
    "push_swap": 1471,
    "minitalk": 2005,
    "pipex": 2004,
    "so_long": 2009,
    "FdF": 2008,
    "fract-ol": 1476,
    "minishell": 1331,
    "Philosophers": 1334,
    "miniRT": 1315,
    "cub3d": 1326,
    "CPP module 00": 1338,
    "CPP module 01": 1339,
    "CPP module 02": 1340,
    "CPP module 03": 1341,
    "CPP module 04": 1342,
    "CPP module 05": 1343,
    "CPP module 06": 1344,
    "CPP module 07": 1345,
    "CPP module 08": 1346,
    "CPP module 09": 2309,
    "NetPractice": 2007,
    "Inception": 1983,
    "ft_irc": 1336,
    "webserv": 1332,
    "ft_containers": 1335,
    "ft_transcendence": 1337,
    "Internship I": 1638,
    "Internship I - Contract Upload": 1640,
    "Internship I - Duration": 1639,
    "Internship I - Company Mid Evaluation": 1641,
    "Internship I - Company Final Evaluation": 1642,
    "Internship I - Peer Video": 1643,
    "startup internship": 1662,
    "startup internship - Contract Upload": 1663,
    "startup internship - Duration": 1664,
    "startup internship - Company Mid Evaluation": 1665,
    "startup internship - Company Final Evaluation": 1666,
    "startup internship - Peer Video": 1667,
    "Piscine Python Django": 1483,
    "camagru": 1396,
    "darkly": 1405,
    "Piscine Swift iOS": 1486,
    "swifty-proteins": 1406,
    "ft_hangouts": 1379,
    "matcha": 1401,
    "swifty-companion": 1395,
    "swingy": 1436,
    "red-tetris": 1428,
    "music-room": 1427,
    "hypertube": 1402,
    "rt": 1855,
    "scop": 1390,
    "zappy": 1463,
    "doom_nukem": 1853,
    "abstract-vm": 1461,
    "humangl": 1394,
    "guimp": 1455,
    "nibbler": 1386,
    "42run": 1387,
    "Piscine Unity": 1485,
    "gbmu": 1411,
    "bomberman": 1389,
    "particle-system": 1410,
    "in-the-shadows": 1409,
    "ft_newton": 1962,
    "ft_vox": 1449,
    "xv": 1408,
    "shaderpixel": 1454,
    "ft_ping": 1397,
    "libasm": 1330,
    "malloc": 1468,
    "nm": 1467,
    "strace": 1388,
    "ft_traceroute": 1399,
    "dr-quine": 1418,
    "ft_ssl_md5": 1451,
    "snow-crash": 1404,
    "ft_nmap": 1400,
    "woody-woodpacker": 1419,
    "ft_ssl_des": 1452,
    "rainfall": 1417,
    "ft_malcolm": 1840,
    "famine": 1430,
    "ft_ssl_rsa": 1450,
    "boot2root": 1446,
    "matt-daemon": 1420,
    "pestilence": 1443,
    "override": 1448,
    "war": 1444,
    "death": 1445,
    "lem_in": 1470,
    "computorv1": 1382,
    "Piscine OCaml": 1484,
    "n-puzzle": 1385,
    "ready set boole": 2076,
    "computorv2": 1433,
    "expert-system": 1384,
    "rubik": 1393,
    "ft_turing": 1403,
    "h42n42": 1429,
    "matrix": 2077,
    "mod1": 1462,
    "gomoku": 1383,
    "ft_ality": 1407,
    "krpsim": 1392,
    "fix-me": 1437,
    "ft_linear_regression": 1391,
    "dslr": 1453,
    "total-perspective-vortex": 1460,
    "multilayer-perceptron": 1457,
    "ft_kalman": 2098,
    "ft_ls": 1479,
    "ft_select": 1469,
    "ft_script": 1466,
    "42sh": 1854,
    "lem-ipc": 1464,
    "corewar": 1475,
    "taskmaster": 1381,
    "ft_linux": 1415,
    "little-penguin-1": 1416,
    "drivers-and-interrupts": 1422,
    "process-and-memory": 1421,
    "userspace_digressions": 1456,
    "filesystem": 1423,
    "kfs-1": 1425,
    "kfs-2": 1424,
    "kfs-3": 1426,
    "kfs-4": 1431,
    "kfs-5": 1432,
    "kfs-6": 1438,
    "kfs-7": 1439,
    "kfs-8": 1440,
    "kfs-9": 1441,
    "kfs-x": 1442,
    "Part_Time I": 1650,
    "Open Project": 1635,
    "Internship II": 1644,
    "Inception-of-Things": 2064,
    "C Piscine Shell 00": 1255,
    "C Piscine Shell 01": 1256,
    "C Piscine C 00": 1257,
    "C Piscine C 01": 1258,
    "C Piscine C 02": 1259,
    "C Piscine C 03": 1260,
    "C Piscine C 04": 1261,
    "C Piscine C 05": 1262,
    "C Piscine C 06": 1263,
    "C Piscine C 07": 1270,
    "C Piscine C 08": 1264,
    "C Piscine C 09": 1265,
    "C Piscine C 10": 1266,
    "C Piscine C 11": 1267,
    "C Piscine C 12": 1268,
    "C Piscine C 13": 1271,
    "C Piscine Rush 00": 1308,
    "C Piscine Rush 01": 1310,
    "C Piscine Rush 02": 1309,
    "C Piscine BSQ": 1305
};

export default function PeersPage() {
    const { data: session, status } = useSession();
    const user = session?.user;
    const { selectedCampus } = useCampus();
    const effectiveCampus = selectedCampus || user?.campus;
    const [showTimeoutError, setShowTimeoutError] = React.useState(false);


    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowTimeoutError(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, [effectiveCampus]);
    
    const { data, error, isLoading, isSuccess, isFetching } = useQuery<Project[]>({
        queryKey: ['peersData'],
        queryFn: fetchPeersData,
        staleTime: 30 * 60 * 1000,
        refetchOnMount: 'always',
    });


    if (!showTimeoutError && ((isLoading || isFetching) && !isSuccess)) {
        return <LoadingScreen message="Loading peers..." />;
    }


    function formatDate(isoString: string) {
        const d = new Date(isoString);

        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();

        const hour = String(d.getHours()).padStart(2, "0");
        const minute = String(d.getMinutes()).padStart(2, "0");

        return `${day}/${month}/${year} - ${hour}:${minute}`;
    }

    const filteredProjects = data?.map((project) => {
        let filteredSubscribers = project.subscribers;
        filteredSubscribers = project.subscribers?.filter(sub =>
            effectiveCampus ? sub.campus?.toLowerCase() === effectiveCampus.toLowerCase() : true
        );
        return { ...project, subscribers: filteredSubscribers };
    })?.filter(project => project.subscribers && project.subscribers.length > 0) ?? [];

    const sortedProjects = filteredProjects?.slice().sort((a, b) => {
        const orderA = Object.values(PROJECT_ORDER).indexOf(a.id);
        const orderB = Object.values(PROJECT_ORDER).indexOf(b.id);

        if (orderA !== -1 && orderB !== -1) {
            return orderA - orderB;
        }
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        return 0;
    });

    const handleLoginClick = (login: string) => {
        window.open(`https://profile.intra.42.fr/users/${login}`, '_blank');
    };

    if (error || !sortedProjects || sortedProjects.length === 0) {
        return <div className="flex items-center justify-center h-full w-full">
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <TriangleAlert />
                    </EmptyMedia>
                    <EmptyTitle>No Peers found</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                    <Button variant="outline" size="sm">
                        Refresh
                    </Button>
                </EmptyContent>
            </Empty>
        </div>;
    }

    return (
        <div className="container mx-auto px-2 py-6">
            {/* Message d'erreur après timeout */}
            {showTimeoutError && (!isSuccess || !data || data.length === 0) && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>42 API Issue</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            The 42 API is taking longer than expected to respond. Please wait
                            a moment and refresh the page.
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="ml-4 shrink-0"
                        >
                            Refresh
                        </Button>
                    </AlertDescription>
                </Alert>
            )}
            
            <div className="flex items-center justify-between mb-6">
                <p className="text-xl font-bold">
                    {sortedProjects.reduce((acc, project) => acc + project.subscribers.length, 0)} students
                </p>
                <p className="text-sm text-muted-foreground">
                    Last Updated:{" "}
                    {sortedProjects && sortedProjects.length > 0
                        ? formatDate(sortedProjects[0].updatedAt)
                        : "N/A"}
                </p>
            </div>
            {/* <div className="gap-6 mb-5">
                {session?.user?.campus !== 'Angouleme' &&  session?.user.campus !== "Nice" && (
                    <TransparentBadge
                        text="⚠️ Only available for Angouleme campus for now"
                        bgColor="bg-red-400/20"
                        textColor="text-red-300"
                    />
                )}
            </div> */}
            {/* load all people that dont have groups for your current project and make a tinder like choice to send a dm or a mail to the chosen group user */}
            {sortedProjects?.map((project) => {
                const nonValidatedSubscribers = project.subscribers;
                return (
                    <Card key={project.id} className="mb-6 p-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={`project-${project.id}`}>
                                <AccordionTrigger className="text-2xl font-semibold flex items-center gap-2">
                                    <div className="flex items-center gap-3 text-left">
                                        <span className="truncate">{project.name}</span>
                                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/70">
                                            {nonValidatedSubscribers.length == 1 ? "1 subscriber" : `${nonValidatedSubscribers.length} subscribers`}
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pt-4">
                                        <div className="flex gap-4 overflow-x-auto no-scrollbar">
                                            {nonValidatedSubscribers.map((subscriber) => (
                                                <div
                                                    key={subscriber.userId}
                                                    className="flex-shrink-0 flex flex-col items-center space-y-2 gap-2 pb-4"
                                                >
                                                    <img
                                                        className="h-20 w-20 rounded-lg object-cover"
                                                        src={subscriber.photoUrl || undefined}
                                                        alt={subscriber.login}
                                                    />
                                                    <div className="flex flex-col items-center text-center">
                                                        <span
                                                            className="text-lg font-medium cursor-pointer hover:underline transition-colors"
                                                            onClick={() => handleLoginClick(subscriber.login)}
                                                        >
                                                            {subscriber.login}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground mt-1">
                                                            {subscriber.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                );
            })}
        </div>
    );
}