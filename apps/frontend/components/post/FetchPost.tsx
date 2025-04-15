import { NextRequest } from "next/server";

export async function FetchPosts(request:NextRequest) {
    try{
        const backendURL = process.env.BACKEND_URL || "http://localhost:5000";

        const response = await fetch(`${backendURL}/api/user/fetchPost`)
        const data = await response.json()

        return data.posts
    }catch(error){
        console.error("Error fetching posts",error);
        throw new Error('Failed to fetch posts')
    }
}