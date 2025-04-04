'use client'
import React from 'react'
import { friends } from './sampleFriends'
import { MessageCircle } from 'lucide-react'
import Image from 'next/image'

function page() {
  return (
    <div>
    <div className='text-2xl font-sans px-4 py-6 font-bold'>Friends</div>
    <div className="px-4  space-y-4">
      {friends.map((friend, index) => (
        <div key={index} className="flex justify-between items-center bg-white dark:bg-neutral-900 px-4 py-3 h-20 rounded-xl shadow-xl">
            <Image src={friend.image} height={40} width={40} alt='' className='rounded-full'/>
          <span className="text-lg font-medium text-neutral-800 dark:text-neutral-200">{friend.name}</span>
          <button className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors">
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  </div>
  )
}

export default page