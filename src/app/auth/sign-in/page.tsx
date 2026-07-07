"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect to home with sign-in modal open. Auth is now shown as a modal. */
const SignInPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.replace("/?auth=signin");
    }, [router]);
    return null;
};

export default SignInPage;
