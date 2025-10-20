"use client";
import React from "react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Calendar, FileText, LayoutDashboard, Link, Search, Trophy, Users, Waves, UserRoundSearch, Map } from "lucide-react"
import { useRouter } from 'next/navigation'
import { signOut } from "next-auth/react"


export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const Router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const signOutfunc = async () => {
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
        });
        await signOut({
            callbackUrl: '/',
            redirect: true
        });
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandSeparator />
                <CommandGroup heading="General">
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/dashboard") }}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/rankings") }}>
                        <Trophy className="mr-2 h-4 w-4" />
                        <span>Rankings</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/trombinoscope") }}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Trombinoscope</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/peers") }}>
                        <UserRoundSearch className="mr-2 h-4 w-4" />
                        <span>Find-Peers</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/exam-tracker") }}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Exam-tracker</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/events") }}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Events</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Piscine">
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/piscine/rankings") }}>
                        <Waves className="mr-2 h-4 w-4" />
                        <span>Pool-Rankings</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/piscine/trombinoscope") }}>
                        <Waves className="mr-2 h-4 w-4" />
                        <span>Pool-Trombinoscope</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Others">
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/cluster-map") }}>
                        <Map className="mr-2 h-4 w-4" />
                        <span>Cluster Map</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/query") }}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Query</span>
                    </CommandItem>
                    <CommandItem onSelect={() => { setOpen(false); Router.push("/links") }}>
                        <Link className="mr-2 h-4 w-4" />
                        <span>Links</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="User">
                    <CommandItem onSelect={() => { setOpen(false); signOutfunc(); }}>
                        <Users className="mr-2 h-4 w-4 text-red-500" />
                        <span className="text-red-500">Logout</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}