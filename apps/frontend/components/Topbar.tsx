'use client'
import React from 'react'
import { Bell, icons } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';


function Topbar() {
    const router = useRouter()
    const path = usePathname();
    if (path!=='/') {
        return;
    }
    const link = [
        { href: '/settings/preferences', icon: Settings, label: 'Settings' },
        // { href: '/notifications', icon: Bell, label: 'Notification' }
    ]
    return (
        <div className='md:hidden text-2xl fixed left-0 right-0 z-50 w-full top-0 flex justify-between pt-5 px-5 items-center text-black font-extrabold font-sans '>
            <div>

                Huddle
            </div>
            <div className='flex justify-between space-x-3 items-center '>

                {link.map((link) => {
                    return (
                        <Link href={link.href} key={link.href}>
                            <link.icon
                                className={`h-7 w-7 transition-colors duration-150 text-black
                                    }`}
                            />
                        </Link>
                    )

                })}

            </div>
        </div>
    )
}

export default Topbar