'use client'
import React from 'react'
import { Home, Wand2, Compass, Users, PlusCircle,User } from 'lucide-react'; 
import Link from 'next/link'; 
import { usePathname } from 'next/navigation'; 
import { useAuth } from '@/context/AuthContext';

function Bottombar() {
    const path = usePathname();
    const { currentUser, isLoading, logout } = useAuth();


    if (path.includes('/register')||path.includes('/login')||path.includes('/signup')||path.includes('/dashboard')||path.includes('/verify/')) {
        return null; 
    }
    const navLinks = [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/plan/generate', icon: Wand2, label: 'Magic' },
        { href: '/post', icon: PlusCircle, label: 'Friends' },
        { href: '/explore', icon: Compass, label: 'Explore' },
        { href: `/profile/${currentUser?.username}`, icon: User, label: 'Profile' },
    ];
if(currentUser){
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-neutral-200  bg-white px-2 py-3 dark:border-neutral-700 dark:bg-neutral-900 md:hidden">

            {navLinks.map((link) => {
                const isActive = path === link.href;

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col items-center rounded-md p-1"
                        aria-label={link.label} 
                    >
                        <link.icon
                            className={`h-7 w-7 transition-colors duration-150 text-black`}
                            strokeWidth={isActive ? 2.5 : 1.5}
                        />

                    </Link>
                );
            })}
        </nav>
    );
}
}

export default Bottombar;
