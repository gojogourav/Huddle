'use client'
import React from 'react'
import Image from 'next/image' 
import { galleryImages } from '../profile/sampleimage' 

function Page() {
  return (
    <div className="min-h-screen px-4 py-6 ">
      <div className="text-2xl font-sans font-bold mb-10">Explore</div>

      <input
        type="text"
        placeholder="Find People, Places"
        className="w-full max-w-md bg-cyan-100 text-black rounded-md px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition mb-2"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        {galleryImages.map((column, colIndex) => (
          <div key={colIndex} className="grid gap-4"> 
            {column.map((src, imgIndex) => (
              <div key={imgIndex} className="overflow-hidden rounded-lg">
                <Image
                  src={src}
                  alt={`gallery-${colIndex}-${imgIndex}`}
                  layout="responsive" 
                  width={500}
                  height={500} 
                  objectFit="cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Page