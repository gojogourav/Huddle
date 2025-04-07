"use client"

import React from 'react'
import * as z from 'zod'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import Link from 'next/link'

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
    username: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    password: z.string().min(5, {
        message: "Password must be at least 5 characters.",
    }),
})

function LoginForm() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: ""
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
    }

    return (
        <div className="min-h-screen flex items-center justify-center font-sans p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-lg border-2 border-neutral-200 p-8">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Huddle</h1>
                <div className="text-center mb-8 text-neutral-500 font-bold">Login to continue</div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input 
                                            placeholder="Username" 
                                            {...field} 
                                            className="border-gray-300 focus:ring-2 focus:ring-indigo-500" 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input 
                                            type="password"
                                            placeholder="Password" 
                                            {...field} 
                                            className="border-gray-300 focus:ring-2 focus:ring-indigo-500" 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full py-3 bg-[#ff0050] hover:bg-[#000000] text-white rounded-md transition-colors">
                            Login
                        </Button>
                        <div className="text-center mt-4">
                            <span className="text-neutral-500 font-bold">
                                Don't have an account?{" "}
                                <Link href="/register">
                                    <span className="text-[#ff0050] hover:underline">Register</span>
                                </Link>
                            </span>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    )
}

export default LoginForm
