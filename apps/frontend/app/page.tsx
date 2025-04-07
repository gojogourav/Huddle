import Image from "next/image";
import React from "react";
import { Timeline } from "@/components/ui/timeline";

export default function Home() {
  const data = [
    {
      title: "8:00 AM – Breakfast at CTR",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 font-normal mb-8">
            Started the day with a crispy benne dosa and strong filter coffee at the legendary CTR in Malleshwaram.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://media.istockphoto.com/id/139745659/photo/cubbon-park-bangalore.jpg?s=612x612&w=0&k=20&c=eim_1soUUFxWgzm5c4SLyT5ecRpvCDvZYeb1WNW0WpE="
              alt="CTR Dosa"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
            <Image
              src="https://media.istockphoto.com/id/1166573787/photo/state-central-library-bangalore-karnataka-india.jpg?s=612x612&w=0&k=20&c=f-PClxppfHLqw1omQ7VZz9dZ517xYqhcMhQ79B-ApSc="
              alt="Filter Coffee"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
          </div>
        </div>
      ),
    },
    {
      title: "11:00 AM – Cubbon Park Stroll",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 font-normal mb-8">
            Walked around Cubbon Park, clicked pictures near the library, and enjoyed the cool morning breeze.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://media.istockphoto.com/id/470627986/photo/lalbagh-park-in-bangalore-city-india.jpg?s=612x612&w=0&k=20&c=XqwnkQ-PKW8gipj9ILiGwsYKFPRar8IvDEggi_aNxHY="
              alt="Cubbon Park"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
            <Image
              src="https://media.istockphoto.com/id/1416335634/photo/the-famous-church-street-social-pub-in-bangalore.jpg?s=612x612&w=0&k=20&c=zVpARF_1vjQHy55UdyUlwHAViAVmLZE4w-Qv6e52LsU="
              alt="State Library"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
          </div>
        </div>
      ),
    },
    {
      title: "2:00 PM – Lunch at Church Street Social",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 font-normal mb-8">
            Headed to Church Street Social for lunch. Tried their butter chicken biryani and caught up with a friend over mocktails.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://media.istockphoto.com/id/692276840/photo/the-church-of-st-francis-xavier-is-a-church-in-melaka-city-melaka-malaysia.jpg?s=612x612&w=0&k=20&c=i3LRp_UXYCrqNcVkEljTuUqJ3J-0IPrWqrm7_WPSYz8="
              alt="Social Biryani"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
            <Image
              src="https://media.istockphoto.com/id/1586904439/photo/colonial-red-buildings-in-bangalore-the-courts.jpg?s=612x612&w=0&k=20&c=BWdQeXLFfXNLWprk0ddR-c_Xjx_UhS6_NvY9UtVH13g="
              alt="Inside Social"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
          </div>
        </div>
      ),
    },
    {
      title: "6:00 PM – Sunset at Nandi Hills",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 font-normal mb-8">
            Took a quick bike ride to Nandi Hills and caught the golden sunset with the city lights twinkling below.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://media.istockphoto.com/id/494463656/photo/view-from-nandi-hills.jpg?s=612x612&w=0&k=20&c=LLX1rNux1f7IaJRXQATZl2Q_fID-SXcqxpg6LeQ7inM="
              alt="Nandi Hills"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
            <Image
              src="https://media.istockphoto.com/id/1372362269/photo/beautiful-road-to-hill-top-of-nandi-hills.jpg?s=612x612&w=0&k=20&c=Fbivv0iezzKvMMf_Jf69ThezBE0seIKFgSS89Uhn3D8="
              alt="Nandi View"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
          </div>
        </div>
      ),
    },
    {
      title: "9:00 PM – Rooftop Dinner at Toit",
      content: (
        <div>
          <p className="text-neutral-800 dark:text-neutral-200 font-normal mb-8">
            Wrapped up the day at Toit with a rooftop dinner and some freshly brewed craft beer. Bangalore’s nightlife is 🔥.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Image
              src="https://media.istockphoto.com/id/1252846191/photo/beer-takeaway-board-at-toit-brew-pub-bangalore-after-the-relaxation-of-national-lockdown-for.jpg?s=612x612&w=0&k=20&c=gQIKbRF8aGMh_tDYCEmbEdvfcRCaoqdMvF9yR9Nw9JI="
              alt="Toit Rooftop"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
            <Image
              src="https://media.istockphoto.com/id/1146026937/photo/close-up-of-friends-toasting-with-beer-and-having-fun-in-a-pub.jpg?s=612x612&w=0&k=20&c=W0qRRy9m4gUeplIAATgqAyGbbS3N-aKdloV93txhrTI="
              alt="Craft Beer"
              width={500}
              height={500}
              className="rounded-lg object-cover h-44 w-full shadow-lg"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full mt-20">
      <div className="text-2xl font-bold mx-5 text-neutral-500">Your Bangalore Travel Diary 🛵</div>
      <Timeline data={data} />
    </div>
  );
}
