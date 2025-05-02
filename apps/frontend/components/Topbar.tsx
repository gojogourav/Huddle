// components/TopNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Settings,
    LogOut,
    LogIn,
    User,
    PlusSquare,
    MapPinned, // For Logo,
    Sparkles,
    Compass
} from 'lucide-react';

import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
    { href: '/', label: 'Home', authRequired: true },
    { href: '/explore', label: 'Explore', authRequired: true },
    { href: '/settings/preferences', label: 'Settings', authRequired: true },
    { href: '/post', label: 'Post', authRequired: true },
];

function TopNav() {

    const pathname = usePathname();
    const router = useRouter();
    const { currentUser, isLoading, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    if (isLoading) {
        return (
            <header className="sticky top-0 z-50 hidden h-16 w-full items-center border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80 md:flex">
                <div className="flex h-full w-full items-center justify-between">
                    <div className="h-8 w-24 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                    <div className="flex items-center space-x-4">
                        <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                        <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                </div>
            </header>
        );
    }
    if (!currentUser) {
        return (
            <header className="absolute top-0 left-0 right-0 z-30 p-4 md:px-8 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <MapPinned className="h-8 w-8 text-[#0b6dff]" />
                    <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">Huddle</span>
                </div>
                <div className="space-x-2">
                    <Button variant="ghost" size="sm" asChild className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Link href="/login">Login</Link>
                    </Button>
                    <Button size="sm" asChild className="bg-[#0b6dff] hover:bg-black text-white px-4 py-2">
                        <Link href="/register">Register</Link>
                    </Button>
                </div>
            </header>


        )
    }

    return (
        <header className="sticky top-0 z-50 hidden h-16 w-full items-center border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80 md:flex md:px-6 lg:px-8">
            <div className="flex w-full items-center justify-between">

                <div className="flex items-center gap-4 lg:gap-6">
                    <Link href={currentUser ? "/" : "/"} className="flex items-center gap-2 mr-2" aria-label="Homepage">
                        <MapPinned className="h-7 w-7 text-[#0b6dff]" />
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden lg:block">Huddle</span>
                    </Link>

                    <Separator orientation="vertical" className="h-6 dark:bg-gray-700 hidden sm:block" />

                    <nav className="hidden items-center gap-3 lg:gap-5 md:flex">
                        {navLinks
                            .filter(link => !link.authRequired || !!currentUser)
                            .map((link) => {
                                const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            "text-sm font-medium transition-colors duration-150 px-2 py-1 rounded",
                                            isActive
                                                ? "text-[#0b6dff] bg-[#0b6dff]/10  dark:bg-pink-900/20" // Active link style
                                                : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                                        )}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                    </nav>
                </div>

                <div className="flex items-center gap-3 lg:gap-4">
                    {currentUser && (
                        <Button
                            size="sm"
                            onClick={() => router.push('/plan/generate')}
                            className="bg-[#0b6dff] cursor-pointer text-white hover:bg-black dark:hover:bg-gray-800 px-3"
                        >
                            <PlusSquare className="h-4 w-4 mr-2" /> Create
                        </Button>
                    )}

                    {currentUser ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="cursor-pointer relative h-9 w-9 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0">
                                    <Avatar className="h-8 w-8 border dark:border-gray-700">
                                        <AvatarImage src={currentUser.profilePic || '/default-avatar.png'} alt={currentUser.username} />
                                        <AvatarFallback>{currentUser.username?.substring(0, 1).toUpperCase() || '?'}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{currentUser.name || currentUser.username}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href={`/profile/${currentUser.username}`}>
                                        <User className="mr-2 h-4 w-4" /> Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href="/settings/preferences">
                                        <Settings className="mr-2 h-4 w-4" /> Preferences
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-500 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" /> Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/login">
                                <LogIn className="mr-2 h-4 w-4" /> Login
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default TopNav;