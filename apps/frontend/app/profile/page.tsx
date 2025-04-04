'use client'
import React from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react';
import { Menu } from 'lucide-react';
import { Share } from 'lucide-react';
import { galleryImages } from './sampleimage'
function page() {
    return (
        <div className='py-4  px-2'>
            <div className='justify-between flex' >
                <ArrowLeft strokeWidth={2.5} className='h-7 w-7' />
                <Menu strokeWidth={2.5} className='h-7 w-7' />

            </div>
            <div className='flex items-center mt-2 px-2 py-4'>
                <Image
                    src={'https://i.pinimg.com/736x/af/29/b9/af29b942852b1311fc5d44737fbfe7e1.jpg'}
                    height={120}
                    width={120}
                    alt='profile'
                    className='rounded-full'
                />
                <div className='font-sans ml-2'>
                    <div className='font-bold text-xl '>Gourav</div>
                    <div className='text-neutral-400 '>he/him</div>
                    <div className='font-bold '>This is my bio I like to use this app</div>
                    <div className='text-neutral-400 '>@username</div>
                    <div className=' h-14 rounded-xl mt-3 font-bold text-cyan-100 flex items-center content-center justify-center'>
                        <div className='bg-cyan-600 h-14 w-full font-bold items-center justify-center content-center flex rounded-xl p-2'>

                            Edit profile
                        </div>

                        <div className='cursor-pointer ml-3'>
                            <Share strokeWidth={2.5} className='h-7 w-7 text-cyan-600' />
                        </div>

                    </div>



                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                {galleryImages.map((column, colIndex) => (
                    <div key={colIndex} className="grid gap-4">
                        {column.map((src, imgIndex) => (
                            <div key={imgIndex} className='overflow-hidden rounded-lg'>
                                <Image
                                    src={src}
                                    alt={`gallery-${colIndex}-${imgIndex}`}
                                    height={500}
                                    width={500}
                                    layout='responsive'
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default page