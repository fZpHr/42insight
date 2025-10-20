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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

interface Subscriber {
    userId: number;
    login: string;
    photoUrl: string | null;
    validated: boolean | null;
}

interface Project {
    id: number;
    name: string;
    subscribers: Subscriber[];
}

// thks find-peers https://github.com/codam-coding-college/find-peers/blob/main/env/projectIDs.json
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

    const { data, error, isLoading } = useQuery<Project[]>({
        queryKey: ['peersData'],
        queryFn: fetchPeersData,
    });

    if (isLoading) {
        return <div className="container mx-auto p-6">Loading...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-6">Error loading peers data.</div>;
    }

    const sortedProjects = data?.slice().sort((a, b) => {
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

    return (
        <div className="container mx-auto p-6">
            {sortedProjects?.map((project) => {
                const nonValidatedSubscribers = project.subscribers.filter(
                    subscriber => subscriber.validated === false
                );

                if (nonValidatedSubscribers.length === 0) return null;

                return (
                    <Card key={project.id} className="mb-6 p-4">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value={`project-${project.id}`}>
                                <AccordionTrigger className="text-2xl font-semibold">
                                    {project.name}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                                        {nonValidatedSubscribers.map((subscriber) => (
                                            <div 
                                                key={subscriber.userId} 
                                                className="flex flex-col items-center space-y-2"
                                            >
                                                <Avatar className="w-20 h-20 object-cover rounded-full">
                                                    <AvatarImage src={subscriber.photoUrl || undefined} alt={subscriber.login} />
                                                    <AvatarFallback>{subscriber.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span 
                                                    className="text-lg font-medium cursor-pointer  hover:underline transition-colors"
                                                    onClick={() => handleLoginClick(subscriber.login)}
                                                >
                                                    {subscriber.login}
                                                </span>
                                            </div>
                                        ))}
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