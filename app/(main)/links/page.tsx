"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ExternalLink,
  BookOpen,
  Shield,
  Clock,
  Briefcase,
  Activity,
  GraduationCap,
  Map,
  PiggyBank,
  Swords,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const links = [
  {
    title: "Rusty",
    description:
      "Platform that simplifies student life, helping define educational paths and amplifying student voices for continuous improvement.",
    url: "https://rusty.42angouleme.fr/",
    icon: GraduationCap,
  },
  {
    title: "Cluster-map",
    description: "Tool that shows the locations of individuals on campus",
    url: "https://cluster-map.42angouleme.fr",
    icon: Map,
  },
  {
    title: "Docs42",
    description: "Documentation for the 42 Angouleme student life.",
    url: "https://docs.42angouleme.fr/",
    icon: BookOpen,
  },
  {
    title: "42CTF",
    description: "Platform for cybersecurity challenges and competitions",
    url: "https://www.42ctf.org/fr/",
    icon: Shield,
  },
  {
    title: "Logtime42",
    description: "Tool for tracking and managing your logtime",
    url: "https://logtime.42angouleme.fr/",
    icon: Clock,
  },
  {
    title: "CFA42",
    description: "Platform for managing your internship",
    url: "https://cfa.42.fr/",
    icon: Briefcase,
  },
  {
    title: "42Infra Monitoring",
    description: "Monitoring tool for 42 infrastructure",
    url: "https://statuspage.freshping.io/22651-42Network/",
    icon: Activity,
  },
  {
    title: "42 Subjects",
    description:
      "Intra is slow, so here is a faster way to access the subjects",
    url: "https://tmoron.fr/intra",
    icon: PiggyBank,
  },
  {
    title: "PeerFinder",
    description: "List all users on campus and cluster map",
    url: "https://42peerfinder.com",
    icon: UsersRound,
  },
  {
    title: "CodingGame",
    description: "Fun challenges to improve your coding skills",
    url: "https://www.codingame.com/start",
    icon: Swords,
  },
];

export default function UsefulLinks() {
  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6 py-3">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.title}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <link.icon className="mr-2 h-5 w-5" />
                {link.title}
              </CardTitle>
              <CardDescription>{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center"
              >
                Visit {link.title}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
