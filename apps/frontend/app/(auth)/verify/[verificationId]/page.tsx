'use client'
import React, { use } from 'react'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"


import { Button } from "@/components/ui/button"

import * as z from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'

const FormSchema = z.object({
    pin: z.string().min(6, {
        message: "Your one-time password must be 6 characters.",
    }),
})


function page({ params }: { params: Promise<{ verificationId: string }> }) {
    const router = useRouter()
    const verificationId = use(params)
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            pin: "",
        },
    })
    async function onSubmit(data: z.infer<typeof FormSchema>) {
       
    }

    return (
        <div className='min-h-screen justify-center w-full flex items-center p-4 '>
           <div className='w-full max-w-md bg-white rounded-lg shadow-lg border-2 border-neutral-200 p-8'>

            <Form {...form}>

                <form onSubmit={form.handleSubmit(onSubmit)} className=" space-y-8">
                    <FormField
                        control={form.control}
                        name="pin"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className='text-2xl mb-2 text-center justify-center'>One-Time Password</FormLabel>
                                <FormLabel className='text-zinc-400 mb-5 w-full flex text-center justify-center text-base '>please enter your one time password</FormLabel>
                                <FormControl>
                                    <InputOTP maxLength={6} {...field} className='justify-center flex'>
                                        <InputOTPGroup className='justify-center flex w-full'>
                                            <InputOTPSlot index={0} />
                                            <InputOTPSlot index={1} />
                                            <InputOTPSlot index={2} />
                                            <InputOTPSlot index={3} />
                                            <InputOTPSlot index={4} />
                                            <InputOTPSlot index={5} />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </FormControl>

                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className='bg-[#ff0050] w-full cursor-pointer'>Submit</Button>
                </form>
            </Form>
           </div>

        </div>
    )
}

export default page